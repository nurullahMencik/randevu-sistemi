using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Randevu.Application.Abstractions;
using Randevu.Application.Common;
using Randevu.Domain.Entities;

namespace Randevu.Application.Features.Catalog;

/// <summary>Public, read-only catalog: business info, services and staff.</summary>
public sealed class CatalogService(IAppDbContext db, BusinessClock clock, IOptions<BusinessOptions> options)
{
    public BusinessInfoDto GetBusinessInfo()
    {
        var o = options.Value;
        return new BusinessInfoDto(
            o.Name, o.Branch, o.Address, o.Phone, o.TimeZone, o.OpenDays, o.OpeningTime, o.ClosingTime,
            o.SlotStepMinutes, (int)Appointment.CustomerCancellationNotice.TotalHours, o.BookingHorizonDays, clock.Today);
    }

    public async Task<IReadOnlyList<ServiceDto>> GetServicesAsync(CancellationToken ct) =>
        await db.Services.AsNoTracking()
            .Where(s => s.IsActive)
            .OrderBy(s => s.SortOrder).ThenBy(s => s.Name)
            .Select(s => new ServiceDto(s.Id, s.Name, s.Description, s.DurationMinutes, s.Price))
            .ToListAsync(ct);

    public async Task<IReadOnlyList<StaffDto>> GetStaffAsync(Guid? serviceId, CancellationToken ct)
    {
        var query = db.StaffMembers.AsNoTracking().Where(s => s.IsActive);
        if (serviceId is { } id)
        {
            query = query.Where(s => s.ServiceLinks.Any(l => l.ServiceId == id));
        }

        var staff = await query
            .OrderBy(s => s.FullName)
            .Select(s => new
            {
                s.Id,
                s.FullName,
                s.Title,
                s.Color,
                s.Bio,
                ServiceIds = s.ServiceLinks.Select(l => l.ServiceId).ToList(),
                Days = s.WorkingHours.Select(w => w.DayOfWeek).ToList(),
            })
            .ToListAsync(ct);

        return staff
            .Select(s => new StaffDto(s.Id, s.FullName, s.Title, s.Color, s.Bio, s.ServiceIds, OrderDays(s.Days)))
            .ToList();
    }

    /// <summary>Orders days Monday-first, which matches the Turkish calendar convention.</summary>
    public static IReadOnlyList<DayOfWeek> OrderDays(IEnumerable<DayOfWeek> days) =>
        days.Distinct().OrderBy(d => ((int)d + 6) % 7).ToList();
}
