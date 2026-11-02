using Microsoft.AspNetCore.Identity;
using Randevu.Domain.Entities;

namespace Randevu.Infrastructure.Identity;

/// <summary>
/// Adapter over ASP.NET Core Identity's <see cref="PasswordHasher{TUser}"/>
/// (PBKDF2-HMAC-SHA512, 100k iterations, per-password salt) without pulling in the full
/// Identity stack.
/// </summary>
public sealed class IdentityPasswordHasher : Application.Abstractions.IPasswordHasher
{
    private readonly PasswordHasher<User> _inner = new();

    public string Hash(User user, string password) => _inner.HashPassword(user, password);

    public bool Verify(User user, string hashedPassword, string providedPassword) =>
        !string.IsNullOrEmpty(hashedPassword)
        && _inner.VerifyHashedPassword(user, hashedPassword, providedPassword) != PasswordVerificationResult.Failed;
}
