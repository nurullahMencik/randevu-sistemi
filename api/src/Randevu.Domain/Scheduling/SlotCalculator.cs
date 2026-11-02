namespace Randevu.Domain.Scheduling;

/// <summary>Input for <see cref="SlotCalculator.GetAvailableStarts"/>.</summary>
/// <param name="Date">Business-local calendar date.</param>
/// <param name="TimeZone">Business time zone (e.g. Europe/Istanbul).</param>
/// <param name="Shift">The staff member's shift that day, or <c>null</c> for a day off.</param>
/// <param name="DurationMinutes">Service duration.</param>
/// <param name="Busy">Existing appointments (UTC) that block time.</param>
/// <param name="NowUtc">Current instant; slots starting earlier than this (plus notice) are excluded.</param>
/// <param name="StepMinutes">Grid size for candidate start times.</param>
/// <param name="MinimumNoticeMinutes">How far in advance a slot must start.</param>
public sealed record SlotRequest(
    DateOnly Date,
    TimeZoneInfo TimeZone,
    WorkingDay? Shift,
    int DurationMinutes,
    IReadOnlyCollection<TimeRange> Busy,
    DateTime NowUtc,
    int StepMinutes = SlotCalculator.DefaultStepMinutes,
    int MinimumNoticeMinutes = 0);

/// <summary>
/// Pure, side-effect free availability algorithm.
/// <para>
/// Candidate start times are generated on a fixed grid in <b>local wall-clock time</b>
/// (09:00, 09:15, ...), converted to UTC with the business time zone and then filtered:
/// the whole service must fit inside the shift, must not overlap the break or an existing
/// appointment, and must not start in the past. Iterating in local time keeps the grid aligned
/// even in zones with daylight saving time; Istanbul has been UTC+3 all year since 2016.
/// </para>
/// </summary>
public static class SlotCalculator
{
    public const int DefaultStepMinutes = 15;

    public static IReadOnlyList<DateTime> GetAvailableStarts(SlotRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(request.DurationMinutes);
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(request.StepMinutes);
        ArgumentOutOfRangeException.ThrowIfNegative(request.MinimumNoticeMinutes);

        var shift = request.Shift;
        if (shift is null || shift.End <= shift.Start)
        {
            return [];
        }

        var duration = TimeSpan.FromMinutes(request.DurationMinutes);
        var step = TimeSpan.FromMinutes(request.StepMinutes);
        var earliestStartUtc = request.NowUtc.AddMinutes(request.MinimumNoticeMinutes);

        if (!TryToUtc(request.Date, shift.End, request.TimeZone, out var shiftEndUtc))
        {
            return [];
        }

        var blocked = new List<TimeRange>(request.Busy.Count + 1);
        blocked.AddRange(request.Busy);
        if (shift.HasBreak
            && TryToUtc(request.Date, shift.BreakStart!.Value, request.TimeZone, out var breakStartUtc)
            && TryToUtc(request.Date, shift.BreakEnd!.Value, request.TimeZone, out var breakEndUtc)
            && breakEndUtc > breakStartUtc)
        {
            blocked.Add(new TimeRange(breakStartUtc, breakEndUtc));
        }

        var result = new List<DateTime>();
        var localDayStart = request.Date.ToDateTime(TimeOnly.MinValue);
        for (var local = localDayStart + shift.Start.ToTimeSpan();
             local < localDayStart + shift.End.ToTimeSpan();
             local += step)
        {
            if (!TryToUtc(local, request.TimeZone, out var startUtc))
            {
                continue; // Skipped wall-clock time (DST gap).
            }

            var candidate = new TimeRange(startUtc, startUtc + duration);
            if (candidate.End > shiftEndUtc)
            {
                break; // Service would run past the end of the shift.
            }

            if (startUtc < earliestStartUtc)
            {
                continue;
            }

            if (blocked.Exists(b => b.Overlaps(candidate)))
            {
                continue;
            }

            result.Add(startUtc);
        }

        return result;
    }

    public static bool TryToUtc(DateOnly date, TimeOnly time, TimeZoneInfo zone, out DateTime utc) =>
        TryToUtc(date.ToDateTime(time), zone, out utc);

    private static bool TryToUtc(DateTime local, TimeZoneInfo zone, out DateTime utc)
    {
        var unspecified = DateTime.SpecifyKind(local, DateTimeKind.Unspecified);
        if (zone.IsInvalidTime(unspecified))
        {
            utc = default;
            return false;
        }

        utc = TimeZoneInfo.ConvertTimeToUtc(unspecified, zone);
        return true;
    }
}
