using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using Randevu.Application.Abstractions;
using Randevu.Domain.Entities;

namespace Randevu.Infrastructure.Identity;

public sealed class JwtTokenService(IOptions<JwtOptions> options, TimeProvider time) : ITokenService
{
    public const string StaffIdClaim = "staff_id";

    private readonly JsonWebTokenHandler _handler = new();

    public AccessToken CreateAccessToken(User user, Guid? staffId)
    {
        var o = options.Value;
        var now = time.GetUtcNow().UtcDateTime;
        var expires = now.AddMinutes(o.AccessTokenMinutes);

        var claims = new Dictionary<string, object>
        {
            [JwtRegisteredClaimNames.Sub] = user.Id.ToString(),
            [JwtRegisteredClaimNames.Email] = user.Email,
            [JwtRegisteredClaimNames.Name] = user.FullName,
            [JwtRegisteredClaimNames.Jti] = Guid.NewGuid().ToString("N"),
            ["role"] = user.Role.ToString(),
        };
        if (staffId is { } id)
        {
            claims[StaffIdClaim] = id.ToString();
        }

        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = o.Issuer,
            Audience = o.Audience,
            Claims = claims,
            IssuedAt = now,
            NotBefore = now,
            Expires = expires,
            SigningCredentials = new SigningCredentials(CreateKey(o.Key), SecurityAlgorithms.HmacSha256),
        };

        return new AccessToken(_handler.CreateToken(descriptor), expires);
    }

    public static SymmetricSecurityKey CreateKey(string key) => new(Encoding.UTF8.GetBytes(key));
}
