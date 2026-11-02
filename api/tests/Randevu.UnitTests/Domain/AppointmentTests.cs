using Randevu.Domain.Common;
using Randevu.Domain.Entities;

namespace Randevu.UnitTests.Domain;

public sealed class AppointmentTests
{
    private static readonly DateTime Start = new(2026, 11, 10, 12, 0, 0, DateTimeKind.Utc);

    private static Appointment NewAppointment(AppointmentStatus status = AppointmentStatus.Confirmed) => new()
    {
        StartUtc = Start,
        EndUtc = Start.AddMinutes(45),
        Status = status,
    };

    [Fact]
    public void Customer_can_cancel_more_than_two_hours_before()
    {
        var appointment = NewAppointment();
        var version = appointment.Version;

        appointment.Cancel(Start.AddHours(-3), actorIsCustomer: true);

        Assert.Equal(AppointmentStatus.Cancelled, appointment.Status);
        Assert.Equal(Start.AddHours(-3), appointment.CancelledAtUtc);
        Assert.NotEqual(version, appointment.Version);
    }

    [Fact]
    public void Customer_can_cancel_exactly_at_the_deadline()
    {
        var appointment = NewAppointment();

        appointment.Cancel(Start.AddHours(-2), actorIsCustomer: true);

        Assert.Equal(AppointmentStatus.Cancelled, appointment.Status);
    }

    [Fact]
    public void Customer_cannot_cancel_within_two_hours()
    {
        var appointment = NewAppointment();

        var ex = Assert.Throws<DomainException>(() => appointment.Cancel(Start.AddMinutes(-119), actorIsCustomer: true));

        Assert.Equal("cancellation_window_closed", ex.Code);
        Assert.Equal(AppointmentStatus.Confirmed, appointment.Status);
    }

    [Fact]
    public void Staff_or_admin_can_cancel_late_but_not_after_start()
    {
        var late = NewAppointment();
        late.Cancel(Start.AddMinutes(-10), actorIsCustomer: false);
        Assert.Equal(AppointmentStatus.Cancelled, late.Status);

        var started = NewAppointment();
        var ex = Assert.Throws<DomainException>(() => started.Cancel(Start.AddMinutes(1), actorIsCustomer: false));
        Assert.Equal("appointment_already_started", ex.Code);
    }

    [Theory]
    [InlineData(AppointmentStatus.Cancelled)]
    [InlineData(AppointmentStatus.Completed)]
    [InlineData(AppointmentStatus.NoShow)]
    public void Only_confirmed_appointments_can_be_cancelled(AppointmentStatus status)
    {
        var appointment = NewAppointment(status);

        var ex = Assert.Throws<DomainException>(() => appointment.Cancel(Start.AddDays(-1), actorIsCustomer: false));

        Assert.Equal("appointment_not_cancellable", ex.Code);
    }

    [Fact]
    public void Outcome_can_only_be_recorded_after_start()
    {
        var appointment = NewAppointment();

        Assert.Throws<DomainException>(() => appointment.SetOutcome(AppointmentStatus.Completed, Start.AddMinutes(-1)));
        appointment.SetOutcome(AppointmentStatus.NoShow, Start.AddMinutes(5));

        Assert.Equal(AppointmentStatus.NoShow, appointment.Status);
    }

    [Fact]
    public void Refresh_token_revocation_is_idempotent_and_keeps_first_reason()
    {
        var token = new RefreshToken { TokenHash = "abc", ExpiresAtUtc = Start.AddDays(1) };

        Assert.True(token.IsActive(Start));
        token.Revoke(Start, "rotated", "def");
        token.Revoke(Start.AddMinutes(1), "logout");

        Assert.False(token.IsActive(Start));
        Assert.Equal("rotated", token.RevokedReason);
        Assert.Equal("def", token.ReplacedByTokenHash);
        Assert.False(new RefreshToken { TokenHash = "x", ExpiresAtUtc = Start }.IsActive(Start));
    }
}
