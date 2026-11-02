using Randevu.Domain.Scheduling;

namespace Randevu.Domain.Entities;

/// <summary>Weekly recurring shift for a staff member. A missing day means a weekly day off.</summary>
public sealed class WorkingHours
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid StaffMemberId { get; set; }
    public DayOfWeek DayOfWeek { get; set; }
    public TimeOnly Start { get; set; }
    public TimeOnly End { get; set; }
    public TimeOnly? BreakStart { get; set; }
    public TimeOnly? BreakEnd { get; set; }

    public WorkingDay ToWorkingDay() => new(Start, End, BreakStart, BreakEnd);
}
