namespace Randevu.Api.Infrastructure;

public sealed class RateLimitingOptions
{
    public const string SectionName = "RateLimiting";
    public const string AuthPolicy = "auth";

    /// <summary>Requests per window and client IP for the /api/auth endpoints.</summary>
    public int AuthPermitLimit { get; set; } = 20;

    public int AuthWindowSeconds { get; set; } = 60;
}
