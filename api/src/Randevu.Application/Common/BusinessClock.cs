using Microsoft.Extensions.Options;
using Randevu.Domain.Scheduling;

namespace Randevu.Application.Common;

/// <summary>
/// Single source of truth for "now" and for conversions between UTC (storage) and
/// business-local time (Europe/Istanbul). Backed by <see cref="TimeProvider"/> so tests can
/// freeze time.
/// </summary>
public sealed class BusinessClock
{
    private readonly TimeProvider _time;

    public BusinessClock(TimeProvider time, IOptions<BusinessOptions> options)
    {
        _time = time;
        Zone = BusinessTimeZone.Resolve(options.Value.TimeZone);
    }

    public TimeZoneInfo Zone { get; }

    public DateTime UtcNow => _time.GetUtcNow().UtcDateTime;

    public DateOnly Today => DateOnly.FromDateTime(ToLocal(UtcNow));

    public DateTime ToLocal(DateTime utc) =>
        TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), Zone);

    public DateOnly LocalDate(DateTime utc) => DateOnly.FromDateTime(ToLocal(utc));

    public DateTime ToUtc(DateOnly date, TimeOnly time) =>
        TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(date.ToDateTime(time), DateTimeKind.Unspecified), Zone);

    /// <summary>UTC bounds of a local calendar day: <c>[start, end)</c>.</summary>
    public (DateTime StartUtc, DateTime EndUtc) DayBoundsUtc(DateOnly date) =>
        (ToUtc(date, TimeOnly.MinValue), ToUtc(date.AddDays(1), TimeOnly.MinValue));

    public static DateTime EnsureUtc(DateTime value) => value.Kind switch
    {
        DateTimeKind.Utc => value,
        DateTimeKind.Local => value.ToUniversalTime(),
        _ => DateTime.SpecifyKind(value, DateTimeKind.Utc),
    };
}
