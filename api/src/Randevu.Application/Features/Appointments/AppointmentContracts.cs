using Randevu.Domain.Entities;

namespace Randevu.Application.Features.Appointments;

/// <summary>Booking request.</summary>
/// <param name="ServiceId">Hizmet.</param>
/// <param name="StaffId">Personel; boş bırakılırsa ("fark etmez") o saatte müsait ve günü en boş olan personel atanır.</param>
/// <param name="StartUtc">Başlangıç (UTC). <c>GET /api/availability</c> yanıtındaki <c>startUtc</c> değerlerinden biri olmalı.</param>
/// <param name="Notes">İsteğe bağlı not (en fazla 500 karakter).</param>
public sealed record CreateAppointmentRequest(Guid ServiceId, Guid? StaffId, DateTime StartUtc, string? Notes);

public sealed record ServiceSummary(Guid Id, string Name, int DurationMinutes);

public sealed record StaffSummary(Guid Id, string FullName, string Color);

public sealed record CustomerSummary(Guid Id, string FullName, string Email, string? Phone);

public sealed record AppointmentDto(
    Guid Id,
    DateTime StartUtc,
    DateTime EndUtc,
    AppointmentStatus Status,
    decimal Price,
    string? Notes,
    ServiceSummary Service,
    StaffSummary Staff,
    CustomerSummary? Customer,
    bool CanCancel,
    DateTime CancellationDeadlineUtc,
    DateTime CreatedAtUtc);

public sealed record MyAppointmentsDto(IReadOnlyList<AppointmentDto> Upcoming, IReadOnlyList<AppointmentDto> Past);

public sealed record WorkingHoursDto(DayOfWeek DayOfWeek, TimeOnly Start, TimeOnly End, TimeOnly? BreakStart, TimeOnly? BreakEnd);

public sealed record TimeOffDto(DateOnly Date, string? Reason);

public sealed record CalendarStaffDto(
    Guid Id,
    string FullName,
    string Title,
    string Color,
    IReadOnlyList<WorkingHoursDto> WorkingHours,
    IReadOnlyList<TimeOffDto> TimeOff);

/// <summary>Appointments and shifts for a date range, used by the admin calendar and the staff view.</summary>
public sealed record ScheduleDto(
    DateOnly From,
    DateOnly To,
    string TimeZone,
    TimeOnly OpeningTime,
    TimeOnly ClosingTime,
    IReadOnlyList<DayOfWeek> OpenDays,
    IReadOnlyList<CalendarStaffDto> Staff,
    IReadOnlyList<AppointmentDto> Appointments);

public sealed record AppointmentListQuery(
    DateOnly? From,
    DateOnly? To,
    Guid? StaffId,
    Guid? ServiceId,
    AppointmentStatus? Status,
    string? Search,
    int Page = 1,
    int PageSize = 20,
    bool Descending = false);

public sealed record UpdateAppointmentStatusRequest(AppointmentStatus Status);
