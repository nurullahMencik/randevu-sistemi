using Randevu.Domain.Scheduling;

namespace Randevu.UnitTests.Scheduling;

public sealed class TimeRangeAndWorkingDayTests
{
    private static DateTime At(int hour, int minute = 0) => new(2026, 11, 10, hour, minute, 0, DateTimeKind.Utc);

    [Theory]
    [InlineData(9, 10, 9, 10, true)]   // identical
    [InlineData(9, 10, 9, 11, true)]   // contained
    [InlineData(9, 11, 10, 12, true)]  // partial
    [InlineData(9, 10, 10, 11, false)] // touching end -> start
    [InlineData(10, 11, 9, 10, false)] // touching start -> end
    [InlineData(9, 10, 11, 12, false)] // disjoint
    public void Overlaps_uses_half_open_intervals(int aStart, int aEnd, int bStart, int bEnd, bool expected)
    {
        var a = new TimeRange(At(aStart), At(aEnd));
        var b = new TimeRange(At(bStart), At(bEnd));

        Assert.Equal(expected, a.Overlaps(b));
        Assert.Equal(expected, b.Overlaps(a));
    }

    [Fact]
    public void Range_must_have_positive_length()
    {
        Assert.Throws<ArgumentException>(() => new TimeRange(At(10), At(10)));
    }

    [Fact]
    public void Working_minutes_exclude_the_break()
    {
        var day = new WorkingDay(new TimeOnly(9, 0), new TimeOnly(18, 0), new TimeOnly(13, 0), new TimeOnly(13, 45));

        Assert.Equal(9 * 60 - 45, day.WorkingMinutes);
    }

    [Fact]
    public void Istanbul_resolves_to_utc_plus_three_in_winter_and_summer()
    {
        var zone = BusinessTimeZone.Resolve("Europe/Istanbul");

        Assert.Equal(TimeSpan.FromHours(3), zone.GetUtcOffset(new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)));
        Assert.Equal(TimeSpan.FromHours(3), zone.GetUtcOffset(new DateTime(2026, 7, 1, 0, 0, 0, DateTimeKind.Utc)));
    }
}
