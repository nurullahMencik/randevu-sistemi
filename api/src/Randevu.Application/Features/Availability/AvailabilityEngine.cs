using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Randevu.Application.Abstractions;
using Randevu.Application.Common;
using Randevu.Domain.Entities;
using Randevu.Domain.Scheduling;

namespace Randevu.Application.Features.Availability;

/// <summary>
/// Loads everything the slot algorithm needs (shifts, leave, booked appointments) in a few
/// set-based queries and evaluates <see cref="SlotCalculator"/> per staff member and day.
/// </summary>
public sealed class AvailabilityEngine(IAppDbContext db, BusinessClock clock, IOptions<BusinessOptions> options)
{
    private BusinessOptions Business => options.Value;

    /// <summary>Active staff members that can perform the service, with schedules loaded.</summary>
    public async Task<List<StaffMember>> LoadEligibleStaffAsync(Guid serviceId, Guid? staffId, bool track, CancellationToken ct)
    {
        IQueryable<StaffMember> query = db.StaffMembers
            .Include(s => s.WorkingHours)
            .Include(s => s.TimeOff)
            .Where(s => s.IsActive && s.ServiceLinks.Any(l => l.ServiceId == serviceId));
        if (staffId is { } id)
        {
            query = query.Where(s => s.Id == id);
        }

        if (!track)
        {
            query = query.AsNoTracking();
        }

        return await query.OrderBy(s => s.FullName).ToListAsync(ct);
    }

    public bool IsWithinHorizon(DateOnly date)
    {
        var today = clock.Today;
        return date >= today && date <= today.AddDays(Business.BookingHorizonDays);
    }

    public bool IsBusinessOpen(DateOnly date) => Business.OpenDays.Contains(date.DayOfWeek);

    /// <summary>
    /// The shift a staff member works on a date, clipped to business hours, or <c>null</c> when
    /// the business is closed, it is the person's weekly day off or they are on leave.
    /// </summary>
    public WorkingDay? GetShift(StaffMember staff, DateOnly date)
    {
        if (!IsBusinessOpen(date) || staff.TimeOff.Exists(t => t.Date == date))
        {
            return null;
        }

        var hours = staff.WorkingHours.Find(w => w.DayOfWeek == date.DayOfWeek);
        if (hours is null)
        {
            return null;
        }

        var start = hours.Start < Business.OpeningTime ? Business.OpeningTime : hours.Start;
        var end = hours.End > Business.ClosingTime ? Business.ClosingTime : hours.End;
        return end > start ? new WorkingDay(start, end, hours.BreakStart, hours.BreakEnd) : null;
    }

    /// <summary>Booked (non-cancelled) appointments per staff member overlapping the date range.</summary>
    public async Task<ILookup<Guid, TimeRange>> LoadBusyAsync(
        IReadOnlyCollection<Guid> staffIds, DateOnly from, DateOnly to, CancellationToken ct)
    {
        var (startUtc, _) = clock.DayBoundsUtc(from);
        var (_, endUtc) = clock.DayBoundsUtc(to);
        var busy = await db.Appointments.AsNoTracking()
            .Where(a => staffIds.Contains(a.StaffMemberId)
                        && a.Status != AppointmentStatus.Cancelled
                        && a.StartUtc < endUtc && a.EndUtc > startUtc)
            .Select(a => new { a.StaffMemberId, a.StartUtc, a.EndUtc })
            .ToListAsync(ct);
        return busy.ToLookup(a => a.StaffMemberId, a => new TimeRange(a.StartUtc, a.EndUtc));
    }

    /// <summary>Available start times (UTC) for one staff member on one day.</summary>
    public IReadOnlyList<DateTime> GetSlots(
        StaffMember staff, DateOnly date, int durationMinutes, IEnumerable<TimeRange> busy, bool ignoreBusy = false)
    {
        if (!IsWithinHorizon(date))
        {
            return [];
        }

        var request = new SlotRequest(
            date,
            clock.Zone,
            GetShift(staff, date),
            durationMinutes,
            ignoreBusy ? [] : busy.ToList(),
            clock.UtcNow,
            Business.SlotStepMinutes,
            Business.MinimumNoticeMinutes);
        return SlotCalculator.GetAvailableStarts(request);
    }
}
