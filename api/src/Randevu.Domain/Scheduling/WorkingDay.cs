namespace Randevu.Domain.Scheduling;

/// <summary>A staff member's shift on a given day in business-local wall-clock time.</summary>
public sealed record WorkingDay(TimeOnly Start, TimeOnly End, TimeOnly? BreakStart = null, TimeOnly? BreakEnd = null)
{
    public bool HasBreak => BreakStart is not null && BreakEnd is not null && BreakEnd > BreakStart;

    public int WorkingMinutes =>
        (int)(End - Start).TotalMinutes - (HasBreak ? (int)(BreakEnd!.Value - BreakStart!.Value).TotalMinutes : 0);
}
