namespace Randevu.Domain.Entities;

/// <summary>A bookable service such as a haircut. Prices are in Turkish lira (TRY).</summary>
public sealed class Service
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public required string Name { get; set; }
    public string? Description { get; set; }
    public int DurationMinutes { get; set; }
    public decimal Price { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
    public DateTime CreatedAtUtc { get; set; }

    public List<StaffService> StaffLinks { get; set; } = [];
}
