namespace Randevu.Domain.Entities;

/// <summary>A full day of leave for a staff member (holiday, sick day, training...).</summary>
public sealed class StaffTimeOff
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid StaffMemberId { get; set; }
    public DateOnly Date { get; set; }
    public string? Reason { get; set; }
}
