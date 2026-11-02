using System.Linq.Expressions;
using Randevu.Domain.Entities;

namespace Randevu.Application.Features.Appointments;

internal static class AppointmentMapping
{
    /// <summary>Flat projection that EF Core can translate; <c>CanCancel</c> is computed afterwards.</summary>
    public static readonly Expression<Func<Appointment, AppointmentRow>> ToRow = a => new AppointmentRow(
        a.Id,
        a.StartUtc,
        a.EndUtc,
        a.Status,
        a.Price,
        a.Notes,
        a.CreatedAtUtc,
        a.ServiceId,
        a.Service!.Name,
        a.Service.DurationMinutes,
        a.StaffMemberId,
        a.StaffMember!.FullName,
        a.StaffMember.Color,
        a.CustomerId,
        a.Customer!.FullName,
        a.Customer.Email,
        a.Customer.Phone);

    public static AppointmentDto ToDto(this AppointmentRow r, DateTime nowUtc, bool viewerIsCustomer, bool includeCustomer)
    {
        var deadline = r.StartUtc - Appointment.CustomerCancellationNotice;
        var canCancel = r.Status == AppointmentStatus.Confirmed
                        && (viewerIsCustomer ? nowUtc <= deadline : nowUtc < r.StartUtc);
        return new AppointmentDto(
            r.Id,
            r.StartUtc,
            r.EndUtc,
            r.Status,
            r.Price,
            r.Notes,
            new ServiceSummary(r.ServiceId, r.ServiceName, r.ServiceDuration),
            new StaffSummary(r.StaffId, r.StaffName, r.StaffColor),
            includeCustomer ? new CustomerSummary(r.CustomerId, r.CustomerName, r.CustomerEmail, r.CustomerPhone) : null,
            canCancel,
            deadline,
            r.CreatedAtUtc);
    }
}

internal sealed record AppointmentRow(
    Guid Id,
    DateTime StartUtc,
    DateTime EndUtc,
    AppointmentStatus Status,
    decimal Price,
    string? Notes,
    DateTime CreatedAtUtc,
    Guid ServiceId,
    string ServiceName,
    int ServiceDuration,
    Guid StaffId,
    string StaffName,
    string StaffColor,
    Guid CustomerId,
    string CustomerName,
    string CustomerEmail,
    string? CustomerPhone);
