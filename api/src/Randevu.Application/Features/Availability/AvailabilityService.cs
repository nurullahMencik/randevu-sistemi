using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Randevu.Application.Abstractions;
using Randevu.Application.Common;

namespace Randevu.Application.Features.Availability;

public sealed record AvailabilityQuery(Guid ServiceId, Guid? StaffId, DateOnly Date);

public sealed record AvailabilityCalendarQuery(Guid ServiceId, Guid? StaffId, DateOnly From, int Days);

public sealed class AvailabilityService(
    IAppDbContext db,
    AvailabilityEngine engine,
    BusinessClock clock,
    IOptions<BusinessOptions> options)
{
    public async Task<AvailabilityResponse> GetSlotsAsync(AvailabilityQuery query, CancellationToken ct)
    {
        var service = await GetServiceAsync(query.ServiceId, ct);
        ValidateDate(query.Date);

        var staff = await engine.LoadEligibleStaffAsync(service.Id, query.StaffId, track: false, ct);
        if (query.StaffId is not null && staff.Count == 0)
        {
            throw new NotFoundException("staff_not_found", "Bu hizmeti veren personel bulunamadı.");
        }

        var busy = await engine.LoadBusyAsync(staff.ConvertAll(s => s.Id), query.Date, query.Date, ct);
        var byStart = new SortedDictionary<DateTime, List<Guid>>();
        foreach (var member in staff)
        {
            foreach (var start in engine.GetSlots(member, query.Date, service.DurationMinutes, busy[member.Id]))
            {
                if (!byStart.TryGetValue(start, out var ids))
                {
                    byStart[start] = ids = [];
                }

                ids.Add(member.Id);
            }
        }

        var slots = byStart
            .Select(kv => new SlotDto(
                kv.Key,
                kv.Key.AddMinutes(service.DurationMinutes),
                clock.ToLocal(kv.Key).ToString("HH:mm", System.Globalization.CultureInfo.InvariantCulture),
                kv.Value))
            .ToList();

        return new AvailabilityResponse(query.Date, service.Id, query.StaffId, options.Value.TimeZone, slots);
    }

    /// <summary>Number of free start times per day, used to grey out full days in the date picker.</summary>
    public async Task<IReadOnlyList<DayAvailabilityDto>> GetCalendarAsync(AvailabilityCalendarQuery query, CancellationToken ct)
    {
        var service = await GetServiceAsync(query.ServiceId, ct);
        var days = Math.Clamp(query.Days, 1, 31);
        var from = query.From;
        var to = from.AddDays(days - 1);

        var staff = await engine.LoadEligibleStaffAsync(service.Id, query.StaffId, track: false, ct);
        var busy = await engine.LoadBusyAsync(staff.ConvertAll(s => s.Id), from, to, ct);

        var result = new List<DayAvailabilityDto>(days);
        for (var date = from; date <= to; date = date.AddDays(1))
        {
            var isOpen = engine.IsBusinessOpen(date) && engine.IsWithinHorizon(date);
            var count = 0;
            if (isOpen)
            {
                count = staff
                    .SelectMany(s => engine.GetSlots(s, date, service.DurationMinutes, busy[s.Id]))
                    .Distinct()
                    .Count();
            }

            result.Add(new DayAvailabilityDto(date, isOpen, count));
        }

        return result;
    }

    private void ValidateDate(DateOnly date)
    {
        if (!engine.IsWithinHorizon(date))
        {
            throw new ValidationException(
            [
                new FluentValidation.Results.ValidationFailure(
                    "date",
                    $"Tarih {clock.Today:yyyy-MM-dd} ile {clock.Today.AddDays(options.Value.BookingHorizonDays):yyyy-MM-dd} arasında olmalı."),
            ]);
        }
    }

    private async Task<Domain.Entities.Service> GetServiceAsync(Guid serviceId, CancellationToken ct) =>
        await db.Services.AsNoTracking().SingleOrDefaultAsync(s => s.Id == serviceId && s.IsActive, ct)
        ?? throw new NotFoundException("service_not_found", "Hizmet bulunamadı.");
}
