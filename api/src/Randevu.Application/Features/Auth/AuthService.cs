using System.Buffers.Text;
using System.Security.Cryptography;
using System.Text;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Randevu.Application.Abstractions;
using Randevu.Application.Common;
using Randevu.Domain.Entities;

namespace Randevu.Application.Features.Auth;

/// <summary>
/// Registration, login and refresh-token rotation.
/// <list type="bullet">
/// <item>Refresh tokens are 512-bit random values; only their SHA-256 hash is persisted.</item>
/// <item>Every refresh revokes the presented token and issues a new one in the same family.</item>
/// <item>Re-using a rotated token revokes the entire family (token theft detection).</item>
/// </list>
/// </summary>
public sealed partial class AuthService(
    IAppDbContext db,
    ITokenService tokens,
    IPasswordHasher passwordHasher,
    BusinessClock clock,
    IOptions<AuthOptions> authOptions,
    IValidator<RegisterRequest> registerValidator,
    IValidator<LoginRequest> loginValidator,
    IValidator<RefreshRequest> refreshValidator,
    ILogger<AuthService> logger)
{
    private const string InvalidCredentialsMessage = "E-posta veya parola hatalı.";

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct)
    {
        await registerValidator.EnsureValidAsync(request, ct);

        var normalized = User.Normalize(request.Email);
        if (await db.Users.AnyAsync(u => u.NormalizedEmail == normalized, ct))
        {
            throw new ConflictException("email_taken", "Bu e-posta adresiyle zaten bir hesap var.");
        }

        var user = new User
        {
            Email = request.Email.Trim(),
            NormalizedEmail = normalized,
            FullName = request.FullName.Trim(),
            Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim(),
            Role = UserRole.Customer,
            CreatedAtUtc = clock.UtcNow,
        };
        user.PasswordHash = passwordHasher.Hash(user, request.Password);
        db.Users.Add(user);

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (UniqueConstraintViolationException)
        {
            throw new ConflictException("email_taken", "Bu e-posta adresiyle zaten bir hesap var.");
        }

        LogRegistered(logger, user.Id);
        return await IssueTokensAsync(user, staffId: null, familyId: Guid.NewGuid(), ct);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct)
    {
        await loginValidator.EnsureValidAsync(request, ct);

        var normalized = User.Normalize(request.Email);
        var user = await db.Users.SingleOrDefaultAsync(u => u.NormalizedEmail == normalized, ct);
        if (user is null || !passwordHasher.Verify(user, user.PasswordHash, request.Password))
        {
            LogLoginFailed(logger);
            throw new AuthenticationFailedException("invalid_credentials", InvalidCredentialsMessage);
        }

        var staffId = await GetStaffIdAsync(user, ct);
        LogLoggedIn(logger, user.Id, user.Role);
        return await IssueTokensAsync(user, staffId, Guid.NewGuid(), ct);
    }

    public async Task<AuthResponse> RefreshAsync(RefreshRequest request, CancellationToken ct)
    {
        await refreshValidator.EnsureValidAsync(request, ct);

        var now = clock.UtcNow;
        var hash = HashToken(request.RefreshToken);
        var stored = await db.RefreshTokens.Include(t => t.User).SingleOrDefaultAsync(t => t.TokenHash == hash, ct);
        if (stored?.User is null)
        {
            throw InvalidRefreshToken();
        }

        if (stored.RevokedAtUtc is not null)
        {
            if (stored.ReplacedByTokenHash is not null)
            {
                // A token that was already rotated is being replayed: assume it leaked and
                // revoke every token in the family so the attacker and the victim are logged out.
                await RevokeFamilyAsync(stored.FamilyId, now, "reuse_detected", ct);
                LogReuseDetected(logger, stored.UserId, stored.FamilyId);
            }

            throw InvalidRefreshToken();
        }

        if (!stored.IsActive(now))
        {
            throw InvalidRefreshToken();
        }

        var (raw, newHash) = NewRefreshToken();
        stored.Revoke(now, "rotated", newHash);
        var next = new RefreshToken
        {
            UserId = stored.UserId,
            TokenHash = newHash,
            FamilyId = stored.FamilyId,
            CreatedAtUtc = now,
            ExpiresAtUtc = now.AddDays(authOptions.Value.RefreshTokenLifetimeDays),
        };
        db.RefreshTokens.Add(next);

        try
        {
            // RevokedAtUtc is a concurrency token: if two requests race with the same refresh
            // token only one UPDATE matches "RevokedAtUtc IS NULL" and the other fails here.
            await db.SaveChangesAsync(ct);
        }
        catch (ConcurrencyConflictException)
        {
            throw InvalidRefreshToken();
        }

        var staffId = await GetStaffIdAsync(stored.User, ct);
        var access = tokens.CreateAccessToken(stored.User, staffId);
        return new AuthResponse(access.Token, access.ExpiresAtUtc, raw, next.ExpiresAtUtc, ToDto(stored.User, staffId));
    }

    public async Task LogoutAsync(RefreshRequest request, CancellationToken ct)
    {
        await refreshValidator.EnsureValidAsync(request, ct);

        var hash = HashToken(request.RefreshToken);
        var stored = await db.RefreshTokens.SingleOrDefaultAsync(t => t.TokenHash == hash, ct);
        if (stored is null)
        {
            return; // Logout is idempotent.
        }

        await RevokeFamilyAsync(stored.FamilyId, clock.UtcNow, "logout", ct);
    }

    public async Task<UserDto> GetProfileAsync(Guid userId, CancellationToken ct)
    {
        var user = await db.Users.AsNoTracking().SingleOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new NotFoundException("user_not_found", "Kullanıcı bulunamadı.");
        return ToDto(user, await GetStaffIdAsync(user, ct));
    }

    internal static string HashToken(string token) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    private static (string Raw, string Hash) NewRefreshToken()
    {
        var raw = Base64Url.EncodeToString(RandomNumberGenerator.GetBytes(64));
        return (raw, HashToken(raw));
    }

    private async Task<AuthResponse> IssueTokensAsync(User user, Guid? staffId, Guid familyId, CancellationToken ct)
    {
        var now = clock.UtcNow;
        var (raw, hash) = NewRefreshToken();
        var refresh = new RefreshToken
        {
            UserId = user.Id,
            TokenHash = hash,
            FamilyId = familyId,
            CreatedAtUtc = now,
            ExpiresAtUtc = now.AddDays(authOptions.Value.RefreshTokenLifetimeDays),
        };
        db.RefreshTokens.Add(refresh);
        await db.SaveChangesAsync(ct);

        var access = tokens.CreateAccessToken(user, staffId);
        return new AuthResponse(access.Token, access.ExpiresAtUtc, raw, refresh.ExpiresAtUtc, ToDto(user, staffId));
    }

    private async Task RevokeFamilyAsync(Guid familyId, DateTime now, string reason, CancellationToken ct)
    {
        // One set-based UPDATE revokes every still-active token of the family atomically.
        // Concurrent calls (parallel replays, a logout racing a rotation) cannot conflict:
        // a row that another request already revoked simply no longer matches the filter.
        await db.RefreshTokens
            .Where(t => t.FamilyId == familyId && t.RevokedAtUtc == null)
            .ExecuteUpdateAsync(s => s
                .SetProperty(t => t.RevokedAtUtc, now)
                .SetProperty(t => t.RevokedReason, reason), ct);
    }

    private async Task<Guid?> GetStaffIdAsync(User user, CancellationToken ct) =>
        user.Role == UserRole.Staff
            ? await db.StaffMembers.Where(s => s.UserId == user.Id).Select(s => (Guid?)s.Id).FirstOrDefaultAsync(ct)
            : null;

    private static UserDto ToDto(User user, Guid? staffId) =>
        new(user.Id, user.Email, user.FullName, user.Phone, user.Role, staffId);

    private static AuthenticationFailedException InvalidRefreshToken() =>
        new("invalid_refresh_token", "Oturumunuzun süresi doldu. Lütfen yeniden giriş yapın.");

    [LoggerMessage(Level = LogLevel.Information, Message = "Customer {UserId} registered")]
    private static partial void LogRegistered(ILogger logger, Guid userId);

    [LoggerMessage(Level = LogLevel.Information, Message = "User {UserId} logged in as {Role}")]
    private static partial void LogLoggedIn(ILogger logger, Guid userId, UserRole role);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Failed login attempt")]
    private static partial void LogLoginFailed(ILogger logger);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Refresh token reuse detected for user {UserId}; token family {FamilyId} revoked")]
    private static partial void LogReuseDetected(ILogger logger, Guid userId, Guid familyId);
}
