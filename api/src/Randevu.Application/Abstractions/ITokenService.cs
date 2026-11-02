using Randevu.Domain.Entities;

namespace Randevu.Application.Abstractions;

public sealed record AccessToken(string Token, DateTime ExpiresAtUtc);

/// <summary>Issues signed JWT access tokens.</summary>
public interface ITokenService
{
    AccessToken CreateAccessToken(User user, Guid? staffId);
}

public interface IPasswordHasher
{
    string Hash(User user, string password);
    bool Verify(User user, string hashedPassword, string providedPassword);
}
