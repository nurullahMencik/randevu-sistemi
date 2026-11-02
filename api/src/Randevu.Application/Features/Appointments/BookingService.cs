using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Randevu.Application.Abstractions;
using Randevu.Application.Common;
using Randevu.Application.Features.Availability;
using Randevu.Domain.Common;
using Randevu.Domain.Entities;

namespace Randevu.Application.Features.Appointments;

/// <summary>
/// Creates and cancels appointments. Double booking is prevented in three layers:
/// <list type="number">
/// <item>Availability is re-computed inside a database transaction right before the insert.</item>
/// <item>The chosen staff member's <see cref="StaffMember.BookingVersion"/> is bumped in the same
/// transaction. It is a concurrency token, so if two requests race for the same person only the
/// first UPDATE matches; the second throws <see cref="ConcurrencyConflictException"/>.</item>
/// <item>A filtered unique index on <c>(StaffMemberId, StartUtc)</c> for non-cancelled rows is the
/// last line of defence at the database level.</item>
/// </list>
/// Every failure path surfaces as HTTP 409 with code <c>slot_taken</c>.
/// </summary>
public sealed partial class BookingService(
    IAppDbContext db,
    AvailabilityEngine engine,
    BusinessClock clock,
    IOptions<BusinessOptions> options,
    IValidator<CreateAppointmentRequest> validator,
    ILogger<BookingService> logger)
{
    public async Task<AppointmentDto> CreateAsync(Guid customerId, CreateAppointmentRequest request, CancellationToken ct)
    {
        await validator.EnsureValidAsync(request, ct);

        var startUtc = BusinessClock.EnsureUtc(request.StartUtc);
        var service = await db.Services.AsNoTracking().SingleOrDefaultAsync(s => s.Id == request.ServiceId && s.IsActive, ct)
            ?? throw new NotFoundException("service_not_found", "Hizmet bulunamadı.");
        var endUtc = startUtc.AddMinutes(service.DurationMinutes);
        var date = clock.LocalDate(startUtc);

        await using var transaction = await db.Database.BeginTransactionAsync(ct);

        var staff = await engine.LoadEligibleStaffAsync(service.Id, request.StaffId, track: true, ct);
        if (staff.Count == 0)
        {
            throw new NotFoundException("staff_not_found", "Bu hizmeti veren personel bulunamadı.");
        }

        await EnsureCustomerCanBookAsync(customerId, startUtc, endUtc, ct);

        var busy = await engine.LoadBusyAsync(staff.ConvertAll(s => s.Id), date, date, ct);

        // A start time that is not on the grid, outside working hours, in a break or in the past
        // is a client error (422); a valid time that is already booked is a conflict (409).
        var onGrid = staff.Where(s => engine.GetSlots(s, date, service.DurationMinutes, [], ignoreBusy: true).Contains(startUtc)).ToList();
        if (onGrid.Count == 0)
        {
            throw new BusinessRuleException("slot_invalid", "Seçilen saat çalışma saatleri dışında veya geçmişte.");
        }

        var free = onGrid.Where(s => engine.GetSlots(s, date, service.DurationMinutes, busy[s.Id]).Contains(startUtc)).ToList();
        if (free.Count == 0)
        {
            throw SlotTaken();
        }

        // "Fark etmez": give the job to whoever has the lightest day, so work is spread evenly.
        var chosen = free
            .OrderBy(s => busy[s.Id].Sum(r => r.Duration.TotalMinutes))
            .ThenBy(s => s.FullName, StringComparer.Ordinal)
            .First();

        var appointment = new Appointment
        {
            CustomerId = customerId,
            StaffMemberId = chosen.Id,
            ServiceId = service.Id,
            StartUtc = startUtc,
            EndUtc = endUtc,
            Price = service.Price,
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
            CreatedAtUtc = clock.UtcNow,
            Status = AppointmentStatus.Confirmed,
        };
        db.Appointments.Add(appointment);
        chosen.MarkBooked();

        try
        {
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
        }
        catch (Exception ex) when (ex is ConcurrencyConflictException or UniqueConstraintViolationException)
        {
            LogBookingConflict(logger, chosen.Id, startUtc);
            throw SlotTaken();
        }

        LogBooked(logger, appointment.Id, chosen.Id, service.Id, startUtc);

        var row = await db.Appointments.AsNoTracking().Where(a => a.Id == appointment.Id).Select(AppointmentMapping.ToRow).SingleAsync(ct);
        return row.ToDto(clock.UtcNow, viewerIsCustomer: true, includeCustomer: false);
    }

    public async Task<AppointmentDto> CancelAsync(Guid appointmentId, ICurrentUser user, CancellationToken ct)
    {
        var userId = user.RequireUserId();
        var appointment = await db.Appointments.SingleOrDefaultAsync(a => a.Id == appointmentId, ct);

        // Customers must not learn whether someone else's appointment id exists.
        if (appointment is null || (user.Role == UserRole.Customer && appointment.CustomerId != userId))
        {
            throw new NotFoundException("appointment_not_found", "Randevu bulunamadı.");
        }

        if (user.Role == UserRole.Staff && appointment.StaffMemberId != user.StaffId)
        {
            throw new ForbiddenException("forbidden", "Yalnızca kendi takviminizdeki randevuları iptal edebilirsiniz.");
        }

        var isCustomer = user.Role == UserRole.Customer;
        try
        {
            appointment.Cancel(clock.UtcNow, isCustomer);
        }
        catch (DomainException ex)
        {
            throw new BusinessRuleException(ex.Code, ex.Message);
        }

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (ConcurrencyConflictException)
        {
            throw new ConflictException("appointment_changed", "Randevu başka bir işlemle güncellendi. Sayfayı yenileyip tekrar deneyin.");
        }

        LogCancelled(logger, appointment.Id, userId, user.Role);

        var row = await db.Appointments.AsNoTracking().Where(a => a.Id == appointment.Id).Select(AppointmentMapping.ToRow).SingleAsync(ct);
        return row.ToDto(clock.UtcNow, isCustomer, includeCustomer: !isCustomer);
    }

    private async Task EnsureCustomerCanBookAsync(Guid customerId, DateTime startUtc, DateTime endUtc, CancellationToken ct)
    {
        var now = clock.UtcNow;
        var upcoming = await db.Appointments.AsNoTracking()
            .Where(a => a.CustomerId == customerId && a.Status == AppointmentStatus.Confirmed && a.EndUtc > now)
            .Select(a => new { a.StartUtc, a.EndUtc })
            .ToListAsync(ct);

        if (upcoming.Exists(a => a.StartUtc < endUtc && a.EndUtc > startUtc))
        {
            throw new ConflictException("customer_overlap", "Bu saat aralığında zaten bir randevunuz var.");
        }

        var max = options.Value.MaxUpcomingAppointmentsPerCustomer;
        if (upcoming.Count >= max)
        {
            throw new BusinessRuleException("too_many_upcoming", $"Aynı anda en fazla {max} ileri tarihli randevunuz olabilir.");
        }
    }

    private static ConflictException SlotTaken() =>
        new("slot_taken", "Bu saat az önce doldu. Lütfen başka bir saat seçin.");

    [LoggerMessage(Level = LogLevel.Information, Message = "Appointment {AppointmentId} booked with staff {StaffId} for service {ServiceId} at {StartUtc:o}")]
    private static partial void LogBooked(ILogger logger, Guid appointmentId, Guid staffId, Guid serviceId, DateTime startUtc);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Booking conflict for staff {StaffId} at {StartUtc:o}; request rejected with 409")]
    private static partial void LogBookingConflict(ILogger logger, Guid staffId, DateTime startUtc);

    [LoggerMessage(Level = LogLevel.Information, Message = "Appointment {AppointmentId} cancelled by user {UserId} ({Role})")]
    private static partial void LogCancelled(ILogger logger, Guid appointmentId, Guid userId, UserRole? role);
}
