using System.Net;
using System.Net.Http.Json;
using Randevu.Application.Features.Auth;
using Randevu.Domain.Entities;
using static Randevu.IntegrationTests.TestData;

namespace Randevu.IntegrationTests;

public sealed class AuthTests(RandevuApiFactory factory) : IClassFixture<RandevuApiFactory>
{
    [Fact]
    public async Task Register_then_login_returns_tokens_and_profile()
    {
        using var client = factory.CreateClient();
        var email = $"ece.tan.{Guid.NewGuid():N}@example.com";

        var register = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest("Ece Tan", email, "Guclu2026", "+90 532 000 11 22"), RandevuApiFactory.Json, Ct);
        Assert.Equal(HttpStatusCode.Created, register.StatusCode);
        var registered = await register.Content.ReadFromJsonAsync<AuthResponse>(RandevuApiFactory.Json, Ct);
        Assert.Equal(UserRole.Customer, registered!.User.Role);
        Assert.False(string.IsNullOrWhiteSpace(registered.RefreshToken));
        Assert.InRange(registered.AccessTokenExpiresAtUtc - DateTime.UtcNow, TimeSpan.FromMinutes(14), TimeSpan.FromMinutes(15.1));

        var login = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email.ToUpperInvariant(), "Guclu2026"), RandevuApiFactory.Json, Ct);
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var auth = await login.Content.ReadFromJsonAsync<AuthResponse>(RandevuApiFactory.Json, Ct);

        using var authorized = factory.Authorized(auth!.AccessToken);
        var me = await authorized.GetFromJsonAsync<UserDto>("/api/auth/me", RandevuApiFactory.Json, Ct);
        Assert.Equal(email, me!.Email);
        Assert.Equal("Ece Tan", me.FullName);
    }

    [Fact]
    public async Task Duplicate_email_is_a_conflict()
    {
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest("Deniz Yılmaz", Customer, "Guclu2026", null), RandevuApiFactory.Json, Ct);

        var problem = await ProblemAsync(response, HttpStatusCode.Conflict);
        Assert.Equal("email_taken", problem.GetProperty("code").GetString());
    }

    [Fact]
    public async Task Wrong_password_returns_401_problem()
    {
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(Customer, "Yanlis123"), RandevuApiFactory.Json, Ct);

        var problem = await ProblemAsync(response, HttpStatusCode.Unauthorized);
        Assert.Equal("invalid_credentials", problem.GetProperty("code").GetString());
        Assert.True(problem.TryGetProperty("traceId", out _));
    }

    [Fact]
    public async Task Invalid_registration_returns_field_errors()
    {
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest("A", "e-posta-degil", "kisa", null), RandevuApiFactory.Json, Ct);

        var problem = await ProblemAsync(response, HttpStatusCode.BadRequest);
        var errors = problem.GetProperty("errors");
        Assert.True(errors.TryGetProperty("fullName", out _));
        Assert.True(errors.TryGetProperty("email", out _));
        Assert.True(errors.TryGetProperty("password", out _));
    }

    [Fact]
    public async Task Refresh_rotates_tokens_and_reuse_revokes_the_whole_family()
    {
        var login = await factory.LoginAsync(Customer);
        using var client = factory.CreateClient();

        var first = await client.PostAsJsonAsync("/api/auth/refresh", new RefreshRequest(login.RefreshToken), RandevuApiFactory.Json, Ct);
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        var rotated = await first.Content.ReadFromJsonAsync<AuthResponse>(RandevuApiFactory.Json, Ct);
        Assert.NotEqual(login.RefreshToken, rotated!.RefreshToken);

        // Replaying the old token is treated as theft...
        var replay = await client.PostAsJsonAsync("/api/auth/refresh", new RefreshRequest(login.RefreshToken), RandevuApiFactory.Json, Ct);
        var problem = await ProblemAsync(replay, HttpStatusCode.Unauthorized);
        Assert.Equal("invalid_refresh_token", problem.GetProperty("code").GetString());

        // ...so the legitimately rotated token is revoked as well.
        var afterReuse = await client.PostAsJsonAsync("/api/auth/refresh", new RefreshRequest(rotated.RefreshToken), RandevuApiFactory.Json, Ct);
        Assert.Equal(HttpStatusCode.Unauthorized, afterReuse.StatusCode);

        // Other sessions (other families) are unaffected.
        var otherSession = await factory.LoginAsync(Customer);
        var other = await client.PostAsJsonAsync("/api/auth/refresh", new RefreshRequest(otherSession.RefreshToken), RandevuApiFactory.Json, Ct);
        Assert.Equal(HttpStatusCode.OK, other.StatusCode);
    }

    [Fact]
    public async Task Concurrent_refreshes_with_the_same_token_succeed_at_most_once()
    {
        var login = await factory.LoginAsync(Customer);

        var responses = await Task.WhenAll(Enumerable.Range(0, 5).Select(async _ =>
        {
            using var client = factory.CreateClient();
            return await client.PostAsJsonAsync("/api/auth/refresh", new RefreshRequest(login.RefreshToken), RandevuApiFactory.Json, Ct);
        }));

        Assert.Equal(1, responses.Count(r => r.StatusCode == HttpStatusCode.OK));
        Assert.All(responses.Where(r => r.StatusCode != HttpStatusCode.OK), r => Assert.Equal(HttpStatusCode.Unauthorized, r.StatusCode));
    }

    [Fact]
    public async Task Logout_revokes_the_refresh_token()
    {
        var login = await factory.LoginAsync(Customer);
        using var client = factory.CreateClient();

        var logout = await client.PostAsJsonAsync("/api/auth/logout", new RefreshRequest(login.RefreshToken), RandevuApiFactory.Json, Ct);
        Assert.Equal(HttpStatusCode.NoContent, logout.StatusCode);

        var refresh = await client.PostAsJsonAsync("/api/auth/refresh", new RefreshRequest(login.RefreshToken), RandevuApiFactory.Json, Ct);
        Assert.Equal(HttpStatusCode.Unauthorized, refresh.StatusCode);
    }
}

public sealed class RateLimitTests(RateLimitedApiFactory factory) : IClassFixture<RateLimitedApiFactory>
{
    [Fact]
    public async Task Auth_endpoints_are_rate_limited_per_client()
    {
        using var client = factory.CreateClient();
        var statuses = new List<HttpStatusCode>();
        HttpResponseMessage? last = null;
        for (var i = 0; i < 4; i++)
        {
            last = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(Customer, "Yanlis123"), RandevuApiFactory.Json, Ct);
            statuses.Add(last.StatusCode);
        }

        Assert.Equal([HttpStatusCode.Unauthorized, HttpStatusCode.Unauthorized, HttpStatusCode.Unauthorized], statuses.Take(3));
        var problem = await ProblemAsync(last!, HttpStatusCode.TooManyRequests);
        Assert.Equal("rate_limited", problem.GetProperty("code").GetString());
        Assert.True(last!.Headers.Contains("Retry-After"));

        // Public catalog endpoints are not affected.
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/services", Ct)).StatusCode);
    }
}
