using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using Randevu.Application.Common;
using Randevu.Application.Features.Admin;
using Randevu.Application.Features.Appointments;
using Randevu.Application.Features.Auth;
using Randevu.Application.Features.Dashboard;

namespace Randevu.UnitTests.Application;

public sealed class BusinessClockTests
{
    [Fact]
    public void Today_follows_istanbul_not_utc()
    {
        // 22:30 UTC on Nov 2 is already 01:30 on Nov 3 in Istanbul.
        var time = new FakeTimeProvider(new DateTimeOffset(2026, 11, 2, 22, 30, 0, TimeSpan.Zero));
        var clock = new BusinessClock(time, Options.Create(new BusinessOptions()));

        Assert.Equal(new DateOnly(2026, 11, 3), clock.Today);
        Assert.Equal(new DateTime(2026, 11, 3, 1, 30, 0), clock.ToLocal(clock.UtcNow));
    }

    [Fact]
    public void Day_bounds_are_local_midnights_in_utc()
    {
        var clock = new BusinessClock(new FakeTimeProvider(), Options.Create(new BusinessOptions()));

        var (start, end) = clock.DayBoundsUtc(new DateOnly(2026, 11, 10));

        Assert.Equal(new DateTime(2026, 11, 9, 21, 0, 0, DateTimeKind.Utc), start);
        Assert.Equal(new DateTime(2026, 11, 10, 21, 0, 0, DateTimeKind.Utc), end);
    }

    [Fact]
    public void Kpi_change_is_null_without_a_baseline()
    {
        Assert.Null(DashboardService.Kpi(10, 0).ChangePercent);
        Assert.Equal(25.0, DashboardService.Kpi(125, 100).ChangePercent);
        Assert.Equal(-50.0, DashboardService.Kpi(50, 100).ChangePercent);
    }
}

public sealed class ValidatorTests
{
    private static readonly UpsertStaffValidator StaffValidator = new(Options.Create(new BusinessOptions()));

    private static UpsertStaffRequest Staff(params WorkingHoursDto[] hours) =>
        new("Ece Tan", "Stilist", "#2a78d6", null, true, [Guid.NewGuid()], hours, null);

    private static WorkingHoursDto Day(DayOfWeek day, int start, int end, int? breakStart = null, int? breakEnd = null) =>
        new(day, new TimeOnly(start, 0), new TimeOnly(end, 0),
            breakStart is null ? null : new TimeOnly(breakStart.Value, 0),
            breakEnd is null ? null : new TimeOnly(breakEnd.Value, 0));

    [Fact]
    public void Valid_staff_schedule_passes()
    {
        Assert.True(StaffValidator.Validate(Staff(Day(DayOfWeek.Tuesday, 9, 18, 13, 14), Day(DayOfWeek.Sunday, 10, 16))).IsValid);
    }

    [Fact]
    public void Shift_on_a_closed_day_is_rejected()
    {
        var result = StaffValidator.Validate(Staff(Day(DayOfWeek.Monday, 9, 18)));

        Assert.Contains(result.Errors, e => e.ErrorMessage.Contains("kapalı", StringComparison.Ordinal));
    }

    [Fact]
    public void Shift_outside_business_hours_is_rejected()
    {
        Assert.False(StaffValidator.Validate(Staff(Day(DayOfWeek.Tuesday, 8, 18))).IsValid);
        Assert.False(StaffValidator.Validate(Staff(Day(DayOfWeek.Tuesday, 9, 21))).IsValid);
    }

    [Fact]
    public void Break_outside_the_shift_is_rejected()
    {
        var result = StaffValidator.Validate(Staff(Day(DayOfWeek.Tuesday, 12, 18, 10, 11)));

        Assert.Contains(result.Errors, e => e.ErrorMessage == "Mola vardiya içinde olmalı.");
    }

    [Fact]
    public void Duplicate_days_are_rejected()
    {
        Assert.False(StaffValidator.Validate(Staff(Day(DayOfWeek.Tuesday, 9, 12), Day(DayOfWeek.Tuesday, 13, 18))).IsValid);
    }

    [Theory]
    [InlineData("kisa1A", false)]
    [InlineData("tumkucukharf1", false)]
    [InlineData("TUMBUYUKHARF1", false)]
    [InlineData("RakamYokParola", false)]
    [InlineData("Guvenli2026", true)]
    public void Password_policy(string password, bool valid)
    {
        var result = new RegisterRequestValidator().Validate(new RegisterRequest("Deniz Yılmaz", "deniz@example.com", password, null));

        Assert.Equal(valid, result.IsValid);
    }

    [Theory]
    [InlineData(30, 650, true)]
    [InlineData(20, 650, false)]  // not a multiple of 15
    [InlineData(45, -1, false)]
    [InlineData(45, 99.999, false)]
    public void Service_validation(int duration, double price, bool valid)
    {
        var result = new UpsertServiceValidator().Validate(new UpsertServiceRequest("Keratin Bakımı", null, duration, (decimal)price, true, 1));

        Assert.Equal(valid, result.IsValid);
    }

    [Fact]
    public void Booking_notes_are_limited()
    {
        var request = new CreateAppointmentRequest(Guid.NewGuid(), null, DateTime.UtcNow, new string('a', 501));

        Assert.False(new CreateAppointmentValidator().Validate(request).IsValid);
    }
}
