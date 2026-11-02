using Microsoft.AspNetCore.Http.HttpResults;
using Randevu.Api.Infrastructure;
using Randevu.Application.Abstractions;
using Randevu.Application.Features.Auth;

namespace Randevu.Api.Endpoints;

internal static class AuthEndpoints
{
    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth")
            .WithTags("Kimlik doğrulama")
            .RequireRateLimiting(RateLimitingOptions.AuthPolicy);

        group.MapPost("/register", async Task<Created<AuthResponse>> (RegisterRequest request, AuthService auth, CancellationToken ct) =>
                TypedResults.Created("/api/auth/me", await auth.RegisterAsync(request, ct)))
            .WithName("Register")
            .WithSummary("Müşteri hesabı oluşturur ve oturum açar")
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status409Conflict)
            .ProducesProblem(StatusCodes.Status429TooManyRequests);

        group.MapPost("/login", async Task<Ok<AuthResponse>> (LoginRequest request, AuthService auth, CancellationToken ct) =>
                TypedResults.Ok(await auth.LoginAsync(request, ct)))
            .WithName("Login")
            .WithSummary("E-posta ve parola ile giriş")
            .WithDescription("Erişim belirteci (JWT, 15 dk) ve tek kullanımlık yenileme belirteci döner.")
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status429TooManyRequests);

        group.MapPost("/refresh", async Task<Ok<AuthResponse>> (RefreshRequest request, AuthService auth, CancellationToken ct) =>
                TypedResults.Ok(await auth.RefreshAsync(request, ct)))
            .WithName("Refresh")
            .WithSummary("Yenileme belirtecini döndürür (rotation)")
            .WithDescription("Gönderilen yenileme belirteci iptal edilir, yerine yenisi verilir. Daha önce kullanılmış bir belirteç tekrar gönderilirse tüm belirteç ailesi iptal edilir.")
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status429TooManyRequests);

        group.MapPost("/logout", async Task<NoContent> (RefreshRequest request, AuthService auth, CancellationToken ct) =>
            {
                await auth.LogoutAsync(request, ct);
                return TypedResults.NoContent();
            })
            .WithName("Logout")
            .WithSummary("Oturumu kapatır ve belirteç ailesini iptal eder");

        group.MapGet("/me", async Task<Ok<UserDto>> (ICurrentUser user, AuthService auth, CancellationToken ct) =>
                TypedResults.Ok(await auth.GetProfileAsync(user.RequireUserId(), ct)))
            .RequireAuthorization()
            .DisableRateLimiting()
            .WithName("Me")
            .WithSummary("Oturumdaki kullanıcı")
            .ProducesProblem(StatusCodes.Status401Unauthorized);
    }
}
