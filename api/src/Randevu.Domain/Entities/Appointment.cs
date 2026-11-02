using Randevu.Domain.Common;
using Randevu.Domain.Scheduling;

namespace Randevu.Domain.Entities;

public sealed class Appointment
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid CustomerId { get; set; }
    public User? Customer { get; set; }
    public Guid StaffMemberId { get; set; }
    public StaffMember? StaffMember { get; set; }
    public Guid ServiceId { get; set; }
    public Service? Service { get; set; }

    /// <summary>Start instant, always stored in UTC.</summary>
    public DateTime StartUtc { get; set; }

    /// <summary>End instant (exclusive), always stored in UTC.</summary>
    public DateTime EndUtc { get; set; }

    /// <summary>Price snapshot at booking time so later price changes do not rewrite history.</summary>
    public decimal Price { get; set; }
    public AppointmentStatus Status { get; set; } = AppointmentStatus.Confirmed;
    public string? Notes { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? CancelledAtUtc { get; set; }

    /// <summary>Optimistic concurrency token for status changes (cancel, complete, no-show).</summary>
    public Guid Version { get; set; } = Guid.NewGuid();

    public TimeRange Range => new(StartUtc, EndUtc);

    /// <summary>Whether this appointment occupies the staff member's time.</summary>
    public bool BlocksTime => Status != AppointmentStatus.Cancelled;

    public static readonly TimeSpan CustomerCancellationNotice = TimeSpan.FromHours(2);

    /// <summary>Latest instant at which a customer may still cancel.</summary>
    public DateTime CustomerCancellationDeadlineUtc => StartUtc - CustomerCancellationNotice;

    public bool CanCustomerCancel(DateTime nowUtc) =>
        Status == AppointmentStatus.Confirmed && nowUtc <= CustomerCancellationDeadlineUtc;

    /// <summary>
    /// Cancels the appointment. Customers must respect the notice period; staff and admins may
    /// cancel any confirmed appointment that has not started yet.
    /// </summary>
    public void Cancel(DateTime nowUtc, bool actorIsCustomer)
    {
        if (Status != AppointmentStatus.Confirmed)
        {
            throw new DomainException("appointment_not_cancellable", "Yalnızca onaylı randevular iptal edilebilir.");
        }

        if (actorIsCustomer && !CanCustomerCancel(nowUtc))
        {
            throw new DomainException(
                "cancellation_window_closed",
                "Randevuya 2 saatten az kaldığı için çevrim içi iptal yapılamıyor. Lütfen işletmeyi arayın.");
        }

        if (!actorIsCustomer && nowUtc >= StartUtc)
        {
            throw new DomainException("appointment_already_started", "Başlamış veya geçmiş bir randevu iptal edilemez.");
        }

        Status = AppointmentStatus.Cancelled;
        CancelledAtUtc = nowUtc;
        Version = Guid.NewGuid();
    }

    public void SetOutcome(AppointmentStatus outcome, DateTime nowUtc)
    {
        if (outcome is not (AppointmentStatus.Completed or AppointmentStatus.NoShow))
        {
            throw new DomainException("invalid_status", "Geçersiz randevu durumu.");
        }

        if (Status == AppointmentStatus.Cancelled)
        {
            throw new DomainException("appointment_cancelled", "İptal edilmiş bir randevunun durumu değiştirilemez.");
        }

        if (nowUtc < StartUtc)
        {
            throw new DomainException("appointment_not_started", "Henüz başlamamış bir randevu tamamlandı olarak işaretlenemez.");
        }

        Status = outcome;
        Version = Guid.NewGuid();
    }
}
