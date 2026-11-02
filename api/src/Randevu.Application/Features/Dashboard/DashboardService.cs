using Microsoft.EntityFrameworkCore;
using Randevu.Application.Abstractions;
using Randevu.Application.Common;
using Randevu.Application.Features.Availability;
using Randevu.Domain.Entities;

namespace Randevu.Application.Features.Dashboard;

/// <summary>
/// Management KPIs. Data volume for a single salon is small (a few thousand rows for six weeks),
/// so appointments are loaded once and aggregated in memory, which also keeps money arithmetic
/// in <see cref="decimal"/> on every database provider (SQLite has no native decimal type).
/// </summary>
public sealed class DashboardService(IAppDbContext db, AvailabilityEngine engine, BusinessClock clock)
{
    /// <summary>Days in the daily series up to and including today.</summary>
    public const int PastDays = 28;

    /// <summary>Days in the daily series after today.</summary>
    public const int FutureDays = 14;

    public async Task<DashboardDto> GetAsync(int rangeDays, CancellationToken ct)
    {
        var days = rangeDays is 7 or 14 or 28 ? rangeDays : 7;
        var now = clock.UtcNow;
        var today = clock.Today;

        var to = today.AddDays(-1);
        var from = today.AddDays(-days);
        var prevTo = from.AddDays(-1);
        var prevFrom = from.AddDays(-days);

        var seriesFrom = today.AddDays(-(PastDays - 1));
        var seriesTo = today.AddDays(FutureDays);
        var loadFrom = prevFrom < seriesFrom ? prevFrom : seriesFrom;

        var (loadStartUtc, _) = clock.DayBoundsUtc(loadFrom);
        var (_, loadEndUtc) = clock.DayBoundsUtc(seriesTo);

        var staff = await db.StaffMembers.AsNoTracking()
            .Include(s => s.WorkingHours)
            .Include(s => s.TimeOff)
            .Where(s => s.IsActive)
            .OrderBy(s => s.FullName)
            .ToListAsync(ct);

        var rows = await db.Appointments.AsNoTracking()
            .Where(a => a.StartUtc >= loadStartUtc && a.StartUtc < loadEndUtc)
            .Select(a => new Row(a.StaffMemberId, a.ServiceId, a.Service!.Name, a.StartUtc, a.EndUtc, a.Price, a.Status))
            .ToListAsync(ct);

        var withDate = rows.Select(r => (Row: r, Date: clock.LocalDate(r.StartUtc))).ToList();
        List<Row> InRange(DateOnly f, DateOnly t) => withDate.Where(x => x.Date >= f && x.Date <= t).Select(x => x.Row).ToList();

        var current = InRange(from, to);
        var previous = InRange(prevFrom, prevTo);

        int AvailableMinutes(StaffMember s, DateOnly f, DateOnly t)
        {
            var total = 0;
            for (var d = f; d <= t; d = d.AddDays(1))
            {
                total += engine.GetShift(s, d)?.WorkingMinutes ?? 0;
            }

            return total;
        }

        double Occupancy(IEnumerable<Row> appts, int available) =>
            available == 0 ? 0 : Math.Round(100.0 * appts.Where(a => a.Blocks).Sum(a => a.Minutes) / available, 1);

        var availableNow = staff.Sum(s => AvailableMinutes(s, from, to));
        var availablePrev = staff.Sum(s => AvailableMinutes(s, prevFrom, prevTo));

        var revenue = Kpi(Revenue(current), Revenue(previous));
        var count = Kpi(current.Count(a => a.Blocks), previous.Count(a => a.Blocks));
        var occupancy = Kpi((decimal)Occupancy(current, availableNow), (decimal)Occupancy(previous, availablePrev));
        var avgTicket = Kpi(AverageTicket(current), AverageTicket(previous));

        var serviceMix = current
            .Where(a => a.Blocks)
            .GroupBy(a => (a.ServiceId, a.ServiceName))
            .Select(g => new ServiceMixDto(g.Key.ServiceId, g.Key.ServiceName, g.Count(), Revenue(g)))
            .OrderByDescending(s => s.Count).ThenBy(s => s.Name, StringComparer.Ordinal)
            .ToList();
        var totalBooked = serviceMix.Sum(s => s.Count);
        var popular = serviceMix.Count == 0
            ? null
            : new PopularServiceDto(serviceMix[0].ServiceId, serviceMix[0].Name, serviceMix[0].Count, Math.Round(100.0 * serviceMix[0].Count / totalBooked, 1));

        var staffPerformance = staff.ConvertAll(s =>
        {
            var mine = current.Where(a => a.StaffId == s.Id).ToList();
            var available = AvailableMinutes(s, from, to);
            return new StaffPerformanceDto(
                s.Id,
                s.FullName,
                s.Color,
                mine.Count(a => a.Blocks),
                Revenue(mine),
                mine.Where(a => a.Blocks).Sum(a => a.Minutes),
                available,
                Occupancy(mine, available));
        });

        var daily = new List<DailyPointDto>(PastDays + FutureDays);
        for (var d = seriesFrom; d <= seriesTo; d = d.AddDays(1))
        {
            var day = d;
            var appts = withDate.Where(x => x.Date == day).Select(x => x.Row).ToList();
            var available = staff.Sum(s => engine.GetShift(s, day)?.WorkingMinutes ?? 0);
            daily.Add(new DailyPointDto(
                day,
                engine.IsBusinessOpen(day),
                day > today,
                Revenue(appts.Where(a => a.StartUtc < now)),
                appts.Count(a => a.Blocks),
                appts.Count(a => a.Status == AppointmentStatus.Cancelled),
                Occupancy(appts, available)));
        }

        var cancelledRate = current.Count == 0
            ? 0
            : Math.Round(100.0 * current.Count(a => a.Status == AppointmentStatus.Cancelled) / current.Count, 1);
        var nextWeek = rows.Where(a => a.Status == AppointmentStatus.Confirmed && a.StartUtc >= now && a.StartUtc < now.AddDays(7)).ToList();

        return new DashboardDto(
            days,
            from,
            to,
            today,
            revenue,
            count,
            occupancy,
            avgTicket,
            popular,
            cancelledRate,
            withDate.Count(x => x.Date == today && x.Row.Blocks),
            nextWeek.Count,
            nextWeek.Sum(a => a.Price),
            staffPerformance,
            serviceMix,
            daily);
    }

    private static decimal Revenue(IEnumerable<Row> rows) =>
        rows.Where(a => a.Status is AppointmentStatus.Completed or AppointmentStatus.Confirmed).Sum(a => a.Price);

    private static decimal AverageTicket(IReadOnlyCollection<Row> rows)
    {
        var paid = rows.Where(a => a.Status is AppointmentStatus.Completed or AppointmentStatus.Confirmed).ToList();
        return paid.Count == 0 ? 0 : Math.Round(paid.Sum(a => a.Price) / paid.Count, 0);
    }

    internal static KpiDto Kpi(decimal value, decimal previous) =>
        new(value, previous, previous == 0 ? null : Math.Round((double)((value - previous) / previous * 100), 1));

    private sealed record Row(
        Guid StaffId,
        Guid ServiceId,
        string ServiceName,
        DateTime StartUtc,
        DateTime EndUtc,
        decimal Price,
        AppointmentStatus Status)
    {
        public bool Blocks => Status != AppointmentStatus.Cancelled;

        public int Minutes => (int)(EndUtc - StartUtc).TotalMinutes;
    }
}
