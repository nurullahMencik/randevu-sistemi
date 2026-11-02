namespace Randevu.Domain.Entities;

public sealed class StaffMember
{
    public Guid Id { get; set; } = Guid.CreateVersion7();

    /// <summary>Optional login account for the staff member (role <see cref="UserRole.Staff"/>).</summary>
    public Guid? UserId { get; set; }
    public User? User { get; set; }

    public required string FullName { get; set; }
    public required string Title { get; set; }

    /// <summary>Hex color used in calendars and charts, e.g. <c>#2563eb</c>.</summary>
    public required string Color { get; set; }
    public string? Bio { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; }

    /// <summary>
    /// Optimistic concurrency token that changes on every booking for this staff member.
    /// Two transactions that try to book the same person at the same time cannot both commit:
    /// the second UPDATE matches zero rows and EF Core raises a concurrency exception.
    /// </summary>
    public Guid BookingVersion { get; set; } = Guid.NewGuid();

    public List<WorkingHours> WorkingHours { get; set; } = [];
    public List<StaffService> ServiceLinks { get; set; } = [];
    public List<StaffTimeOff> TimeOff { get; set; } = [];

    public void MarkBooked() => BookingVersion = Guid.NewGuid();
}
