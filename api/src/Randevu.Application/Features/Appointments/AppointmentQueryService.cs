using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Randevu.Application.Abstractions;
using Randevu.Application.Common;
using Randevu.Application.Features.Catalog;
using Randevu.Domain.Common;
using Randevu.Domain.Entities;

namespace Randevu.Application.Features.Appointments;

public sealed class AppointmentQueryService(IAppDbContext db, BusinessClock clock, IOptions<BusinessOptions> options)
{
    public async Task<MyAppointmentsDto> GetForCustomerAsync(Guid customerId, CancellationToken ct)
    {
        var now = clock.UtcNow;
        var rows = await db.Appointments.AsNoTracking()
            .Where(a => a.CustomerId == customerId)
            .OrderBy(a => a.StartUtc)
            .Select(AppointmentMapping.ToRow)
            .ToListAsync(ct);

        var upcoming = rows
            .Where(r => r.EndUtc > now && r.Status == AppointmentStatus.Confirmed)
            .Select(r => r.ToDto(now, viewerIsCustomer: true, includeCustomer: false))
            .ToList();
        var past = rows
            .Where(r => !(r.EndUtc > now && r.Status == AppointmentStatus.Confirmed))
            .OrderByDescending(r => r.StartUtc)
            .Select(r => r.ToDto(now, viewerIsCustomer: true, includeCustomer: false))
            .ToList();
        return new MyAppointmentsDto(upcoming, past);
    }

    /// <summary>Schedule for the admin calendar (all staff) or the staff view (one person).</summary>
    public async Task<ScheduleDto> GetScheduleAsync(DateOnly from, DateOnly to, Guid? staffId, CancellationToken ct)
    {
        if (to < from)
        {
            throw new BusinessRuleException("invalid_range", "Bitiş tarihi başlangıçtan önce olamaz.");
        }

        if (to.DayNumber - from.DayNumber > 41)
        {
            throw new BusinessRuleException("range_too_large", "En fazla 6 haftalık aralık sorgulanabilir.");
        }

        var (startUtc, _) = clock.DayBoundsUtc(from);
        var (_, endUtc) = clock.DayBoundsUtc(to);

        var staffQuery = db.StaffMembers.AsNoTracking()
            .Include(s => s.WorkingHours)
            .Include(s => s.TimeOff)
            .Where(s => s.IsActive || s.Id == staffId);
        if (staffId is { } id)
        {
            staffQuery = staffQuery.Where(s => s.Id == id);
        }

        var staff = await staffQuery.OrderBy(s => s.FullName).ToListAsync(ct);

        var apptQuery = db.Appointments.AsNoTracking()
            .Where(a => a.StartUtc < endUtc && a.EndUtc > startUtc && a.Status != AppointmentStatus.Cancelled);
        if (staffId is { } sid)
        {
            apptQuery = apptQuery.Where(a => a.StaffMemberId == sid);
        }

        var now = clock.UtcNow;
        var appointments = (await apptQuery.OrderBy(a => a.StartUtc).Select(AppointmentMapping.ToRow).ToListAsync(ct))
            .Select(r => r.ToDto(now, viewerIsCustomer: false, includeCustomer: true))
            .ToList();

        var o = options.Value;
        return new ScheduleDto(
            from,
            to,
            o.TimeZone,
            o.OpeningTime,
            o.ClosingTime,
            CatalogService.OrderDays(o.OpenDays),
            staff.ConvertAll(ToCalendarStaff),
            appointments);
    }

    public async Task<PagedResult<AppointmentDto>> ListAsync(AppointmentListQuery query, CancellationToken ct)
    {
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 5, 100);
        var q = db.Appointments.AsNoTracking();

        if (query.From is { } from)
        {
            var (fromUtc, _) = clock.DayBoundsUtc(from);
            q = q.Where(a => a.StartUtc >= fromUtc);
        }

        if (query.To is { } to)
        {
            var (_, toUtc) = clock.DayBoundsUtc(to);
            q = q.Where(a => a.StartUtc < toUtc);
        }

        if (query.StaffId is { } staffId)
        {
            q = q.Where(a => a.StaffMemberId == staffId);
        }

        if (query.ServiceId is { } serviceId)
        {
            q = q.Where(a => a.ServiceId == serviceId);
        }

        if (query.Status is { } status)
        {
            q = q.Where(a => a.Status == status);
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim().ToLower(System.Globalization.CultureInfo.InvariantCulture);
            // Evaluated by the database as LOWER(...) LIKE '%term%'; culture rules do not apply.
#pragma warning disable CA1304, CA1311, CA1862
            q = q.Where(a => a.Customer!.FullName.ToLower().Contains(term)
                             || a.Customer.Email.ToLower().Contains(term)
                             || (a.Customer.Phone != null && a.Customer.Phone.Contains(term)));
#pragma warning restore CA1304, CA1311, CA1862
        }

        var total = await q.CountAsync(ct);
        q = query.Descending ? q.OrderByDescending(a => a.StartUtc) : q.OrderBy(a => a.StartUtc);
        var now = clock.UtcNow;
        var items = (await q.Skip((page - 1) * pageSize).Take(pageSize).Select(AppointmentMapping.ToRow).ToListAsync(ct))
            .Select(r => r.ToDto(now, viewerIsCustomer: false, includeCustomer: true))
            .ToList();
        return new PagedResult<AppointmentDto>(items, page, pageSize, total);
    }

    public async Task<AppointmentDto> UpdateStatusAsync(Guid id, UpdateAppointmentStatusRequest request, CancellationToken ct)
    {
        var appointment = await db.Appointments.SingleOrDefaultAsync(a => a.Id == id, ct)
            ?? throw new NotFoundException("appointment_not_found", "Randevu bulunamadı.");
        try
        {
            appointment.SetOutcome(request.Status, clock.UtcNow);
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
            throw new ConflictException("appointment_changed", "Randevu başka bir işlemle güncellendi.");
        }

        var row = await db.Appointments.AsNoTracking().Where(a => a.Id == id).Select(AppointmentMapping.ToRow).SingleAsync(ct);
        return row.ToDto(clock.UtcNow, viewerIsCustomer: false, includeCustomer: true);
    }

    internal static CalendarStaffDto ToCalendarStaff(StaffMember s) => new(
        s.Id,
        s.FullName,
        s.Title,
        s.Color,
        s.WorkingHours
            .OrderBy(w => ((int)w.DayOfWeek + 6) % 7)
            .Select(w => new WorkingHoursDto(w.DayOfWeek, w.Start, w.End, w.BreakStart, w.BreakEnd))
            .ToList(),
        s.TimeOff.OrderBy(t => t.Date).Select(t => new TimeOffDto(t.Date, t.Reason)).ToList());
}
