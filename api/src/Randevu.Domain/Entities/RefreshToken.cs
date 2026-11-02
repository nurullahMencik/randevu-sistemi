namespace Randevu.Domain.Entities;

/// <summary>
/// A single-use refresh token. Only the SHA-256 hash is stored. Every rotation creates a new
/// token in the same <see cref="FamilyId"/>; presenting an already-rotated token is treated as
/// theft and revokes the whole family.
/// </summary>
public sealed class RefreshToken
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid UserId { get; set; }
    public User? User { get; set; }
    public required string TokenHash { get; set; }
    public Guid FamilyId { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime ExpiresAtUtc { get; set; }
    public DateTime? RevokedAtUtc { get; set; }
    public string? ReplacedByTokenHash { get; set; }
    public string? RevokedReason { get; set; }

    public bool IsActive(DateTime nowUtc) => RevokedAtUtc is null && nowUtc < ExpiresAtUtc;

    public void Revoke(DateTime nowUtc, string reason, string? replacedByHash = null)
    {
        if (RevokedAtUtc is not null)
        {
            return;
        }

        RevokedAtUtc = nowUtc;
        RevokedReason = reason;
        ReplacedByTokenHash = replacedByHash;
    }
}
