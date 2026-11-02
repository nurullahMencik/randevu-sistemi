using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Randevu.Application.Features.Auth;

namespace Randevu.IntegrationTests;

/// <summary>
/// Boots the real API (all middleware, auth, validation, EF Core) against a private in-memory
/// SQLite database. The database lives as long as <see cref="_keepAlive"/> stays open.
/// </summary>
public class RandevuApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    public const string Password = "Demo123!";

    private readonly string _connectionString = $"Data Source=randevu-tests-{Guid.NewGuid():N};Mode=Memory;Cache=Shared";
    private SqliteConnection? _keepAlive;

    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    protected virtual bool SampleAppointments => false;

    protected virtual int AuthPermitLimit => 10_000;

    public async ValueTask InitializeAsync()
    {
        _keepAlive = new SqliteConnection(_connectionString);
        await _keepAlive.OpenAsync();
        _ = Server; // Start the host (runs migrations + seed).
    }

    public override async ValueTask DisposeAsync()
    {
        await base.DisposeAsync();
        if (_keepAlive is not null)
        {
            await _keepAlive.DisposeAsync();
        }

        GC.SuppressFinalize(this);
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("ConnectionStrings:Default", _connectionString);
        builder.UseSetting("Database:Provider", "Sqlite");
        builder.UseSetting("Logging:LogLevel:Default", "Warning");
        builder.UseSetting("Logging:LogLevel:Microsoft.AspNetCore", "Warning");
        builder.UseSetting("Jwt:Key", "integration-tests-signing-key-0123456789abcdef");
        builder.UseSetting("Seed:Enabled", "true");
        builder.UseSetting("Seed:SampleAppointments", SampleAppointments ? "true" : "false");
        builder.UseSetting("RateLimiting:AuthPermitLimit", AuthPermitLimit.ToString(System.Globalization.CultureInfo.InvariantCulture));
    }

    public async Task<AuthResponse> LoginAsync(string email, string password = Password)
    {
        using var client = CreateClient();
        var response = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, password), Json);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<AuthResponse>(Json))!;
    }

    public async Task<HttpClient> CreateClientAsAsync(string email)
    {
        var auth = await LoginAsync(email);
        return Authorized(auth.AccessToken);
    }

    /// <summary>Registers a brand new customer so tests never share booking limits.</summary>
    public async Task<(HttpClient Client, AuthResponse Auth)> CreateNewCustomerAsync()
    {
        using var anonymous = CreateClient();
        var email = $"musteri-{Guid.NewGuid():N}@example.com";
        var response = await anonymous.PostAsJsonAsync("/api/auth/register", new RegisterRequest("Test Müşterisi", email, "Guclu2026", null), Json);
        response.EnsureSuccessStatusCode();
        var auth = (await response.Content.ReadFromJsonAsync<AuthResponse>(Json))!;
        return (Authorized(auth.AccessToken), auth);
    }

    public HttpClient Authorized(string accessToken)
    {
        var client = CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        return client;
    }
}

/// <summary>Same API with realistic generated appointments (for dashboard tests).</summary>
public sealed class SeededApiFactory : RandevuApiFactory
{
    protected override bool SampleAppointments => true;
}

/// <summary>Same API with a tiny auth rate limit.</summary>
public sealed class RateLimitedApiFactory : RandevuApiFactory
{
    protected override int AuthPermitLimit => 3;
}
