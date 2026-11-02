using Randevu.Domain.Scheduling;

namespace Randevu.UnitTests.Scheduling;

public sealed class SlotCalculatorTests
{
    private static readonly TimeZoneInfo Istanbul = BusinessTimeZone.Resolve(BusinessTimeZone.IstanbulId);

    // Tuesday. Istanbul is UTC+3, so 09:00 local == 06:00Z.
    private static readonly DateOnly Day = new(2026, 11, 10);
    private static readonly DateTime LongBefore = new(2026, 11, 1, 0, 0, 0, DateTimeKind.Utc);

    private static WorkingDay Shift(int startHour, int endHour, TimeOnly? breakStart = null, TimeOnly? breakEnd = null) =>
        new(new TimeOnly(startHour, 0), new TimeOnly(endHour, 0), breakStart, breakEnd);

    private static DateTime Utc(int hour, int minute) => new(2026, 11, 10, hour, minute, 0, DateTimeKind.Utc);

    private static DateTime Local(int hour, int minute) => Utc(hour - 3, minute);

    private static IReadOnlyList<DateTime> Slots(
        WorkingDay? shift, int duration, IReadOnlyCollection<TimeRange>? busy = null, DateTime? now = null, int notice = 0) =>
        SlotCalculator.GetAvailableStarts(new SlotRequest(Day, Istanbul, shift, duration, busy ?? [], now ?? LongBefore, 15, notice));

    [Fact]
    public void Generates_15_minute_grid_inside_working_hours()
    {
        var slots = Slots(Shift(9, 12), duration: 45);

        // 09:00 ... 11:15 local: (180 - 45) / 15 + 1 = 10 starts.
        Assert.Equal(10, slots.Count);
        Assert.Equal(Local(9, 0), slots[0]);
        Assert.Equal(Local(11, 15), slots[^1]);
        Assert.All(slots.Zip(slots.Skip(1)), pair => Assert.Equal(TimeSpan.FromMinutes(15), pair.Second - pair.First));
        Assert.All(slots, s => Assert.Equal(DateTimeKind.Utc, s.Kind));
    }

    [Fact]
    public void Service_that_would_run_past_the_end_of_the_shift_is_not_offered()
    {
        var slots = Slots(Shift(9, 18), duration: 120);

        Assert.Equal(Local(16, 0), slots[^1]);
        Assert.DoesNotContain(Local(16, 15), slots);
    }

    [Fact]
    public void Service_longer_than_the_shift_has_no_slots()
    {
        Assert.Empty(Slots(Shift(9, 10), duration: 120));
    }

    [Fact]
    public void Break_blocks_overlapping_starts_but_touching_is_allowed()
    {
        var slots = Slots(Shift(9, 18, new TimeOnly(13, 0), new TimeOnly(13, 45)), duration: 30);

        Assert.Contains(Local(12, 30), slots);      // ends exactly when the break starts
        Assert.DoesNotContain(Local(12, 45), slots); // would run into the break
        Assert.DoesNotContain(Local(13, 0), slots);
        Assert.DoesNotContain(Local(13, 30), slots);
        Assert.Contains(Local(13, 45), slots);      // starts exactly when the break ends
    }

    [Fact]
    public void Existing_appointment_blocks_every_overlapping_start()
    {
        var busy = new[] { new TimeRange(Local(10, 0), Local(10, 45)) };

        var slots = Slots(Shift(9, 12), duration: 45, busy);

        Assert.Contains(Local(9, 15), slots);       // 09:15-10:00 touches, allowed
        Assert.DoesNotContain(Local(9, 30), slots);
        Assert.DoesNotContain(Local(10, 0), slots);
        Assert.DoesNotContain(Local(10, 30), slots);
        Assert.Contains(Local(10, 45), slots);
    }

    [Fact]
    public void Fully_booked_day_returns_no_slots()
    {
        var busy = new[] { new TimeRange(Local(9, 0), Local(12, 0)) };

        Assert.Empty(Slots(Shift(9, 12), duration: 15, busy));
    }

    [Fact]
    public void Day_off_returns_no_slots()
    {
        Assert.Empty(Slots(shift: null, duration: 30));
    }

    [Fact]
    public void Starts_in_the_past_are_excluded()
    {
        var now = Local(11, 20);

        var slots = Slots(Shift(9, 14), duration: 30, now: now);

        Assert.Equal(Local(11, 30), slots[0]);
        Assert.All(slots, s => Assert.True(s >= now));
    }

    [Fact]
    public void Slot_starting_exactly_now_is_still_bookable()
    {
        var slots = Slots(Shift(9, 12), duration: 30, now: Local(10, 0));

        Assert.Equal(Local(10, 0), slots[0]);
    }

    [Fact]
    public void Minimum_notice_pushes_the_first_slot_forward()
    {
        var slots = Slots(Shift(9, 14), duration: 30, now: Local(10, 5), notice: 60);

        Assert.Equal(Local(11, 15), slots[0]);
    }

    [Fact]
    public void Whole_day_in_the_past_returns_nothing()
    {
        Assert.Empty(Slots(Shift(9, 18), duration: 30, now: Local(19, 0)));
    }

    [Theory]
    [InlineData(2026, 1, 13)]  // winter
    [InlineData(2026, 3, 29)]  // EU switches to summer time; Turkey does not
    [InlineData(2026, 7, 14)]  // summer
    [InlineData(2026, 10, 25)] // EU switches back; Turkey does not
    public void Istanbul_is_utc_plus_three_all_year_without_dst(int year, int month, int day)
    {
        var date = new DateOnly(year, month, day);
        var request = new SlotRequest(date, Istanbul, Shift(9, 20), 60, [], new DateTime(2020, 1, 1, 0, 0, 0, DateTimeKind.Utc));

        var slots = SlotCalculator.GetAvailableStarts(request);

        Assert.Equal(new DateTime(year, month, day, 6, 0, 0, DateTimeKind.Utc), slots[0]);
        Assert.Equal(41, slots.Count); // (660 - 60) / 15 + 1, identical on every date
    }

    [Fact]
    public void Wall_clock_times_skipped_by_dst_are_not_offered_in_zones_that_observe_it()
    {
        var berlin = TimeZoneInfo.FindSystemTimeZoneById("Europe/Berlin");
        var date = new DateOnly(2026, 3, 29); // 02:00 -> 03:00
        var request = new SlotRequest(date, berlin, new WorkingDay(new TimeOnly(1, 0), new TimeOnly(4, 0)), 15, [], new DateTime(2020, 1, 1, 0, 0, 0, DateTimeKind.Utc));

        var slots = SlotCalculator.GetAvailableStarts(request);

        // 01:00-01:45 (UTC+1) and 03:00-03:45 (UTC+2): eight real instants, no duplicates.
        Assert.Equal(8, slots.Count);
        Assert.Equal(slots.Count, slots.Distinct().Count());
        Assert.Equal(new DateTime(2026, 3, 29, 0, 0, 0, DateTimeKind.Utc), slots[0]);
        Assert.Equal(new DateTime(2026, 3, 29, 1, 45, 0, DateTimeKind.Utc), slots[^1]);
    }

    [Theory]
    [InlineData(0, 15)]
    [InlineData(30, 0)]
    [InlineData(-15, 15)]
    public void Rejects_non_positive_duration_or_step(int duration, int step)
    {
        var request = new SlotRequest(Day, Istanbul, Shift(9, 12), duration, [], LongBefore, step);

        Assert.Throws<ArgumentOutOfRangeException>(() => SlotCalculator.GetAvailableStarts(request));
    }
}
