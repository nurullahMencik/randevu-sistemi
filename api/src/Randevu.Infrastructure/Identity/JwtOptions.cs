namespace Randevu.Infrastructure.Identity;

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = "randevu-api";
    public string Audience { get; set; } = "randevu-web";

    /// <summary>HMAC-SHA256 signing key, at least 32 bytes. Set via the <c>Jwt__Key</c> environment variable.</summary>
    public string Key { get; set; } = string.Empty;

    public int AccessTokenMinutes { get; set; } = 15;
}
