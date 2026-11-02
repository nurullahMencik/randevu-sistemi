namespace Randevu.Domain.Entities;

public sealed class User
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public required string Email { get; set; }
    public required string NormalizedEmail { get; set; }
    public required string FullName { get; set; }
    public string? Phone { get; set; }
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.Customer;
    public DateTime CreatedAtUtc { get; set; }

    public static string Normalize(string email) => email.Trim().ToUpperInvariant();
}
