namespace Randevu.Domain.Entities;

/// <summary>Join entity: which services a staff member can perform.</summary>
public sealed class StaffService
{
    public Guid StaffMemberId { get; set; }
    public StaffMember? StaffMember { get; set; }
    public Guid ServiceId { get; set; }
    public Service? Service { get; set; }
}
