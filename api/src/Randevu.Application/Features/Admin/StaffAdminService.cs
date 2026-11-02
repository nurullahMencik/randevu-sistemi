using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Randevu.Application.Abstractions;
using Randevu.Application.Common;
using Randevu.Application.Features.Appointments;
using Randevu.Domain.Entities;

namespace Randevu.Application.Features.Admin;

public sealed class StaffAdminService(IAppDbContext db, BusinessClock clock, IValidator<UpsertStaffRequest> validator)
{
    public async Task<IReadOnlyList<AdminStaffDto>> ListAsync(CancellationToken ct)
    {
        var staff = await db.StaffMembers.AsNoTracking()
            .Include(s => s.WorkingHours)
            .Include(s => s.TimeOff)
            .Include(s => s.ServiceLinks)
            .Include(s => s.User)
            .OrderBy(s => s.FullName)
            .ToListAsync(ct);

        var now = clock.UtcNow;
        var upcoming = await db.Appointments.AsNoTracking()
            .Where(a => a.Status == AppointmentStatus.Confirmed && a.StartUtc > now)
            .GroupBy(a => a.StaffMemberId)
            .Select(g => new { StaffId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.StaffId, x => x.Count, ct);

        return staff.ConvertAll(s => ToDto(s, upcoming.GetValueOrDefault(s.Id)));
    }

    public async Task<AdminStaffDto> GetAsync(Guid id, CancellationToken ct) =>
        (await ListAsync(ct)).SingleOrDefault(s => s.Id == id) ?? throw NotFound();

    public async Task<AdminStaffDto> CreateAsync(UpsertStaffRequest request, CancellationToken ct)
    {
        await validator.EnsureValidAsync(request, ct);
        await EnsureServicesExistAsync(request.ServiceIds, ct);

        var staff = new StaffMember
        {
            FullName = request.FullName.Trim(),
            Title = request.Title.Trim(),
            Color = request.Color,
            CreatedAtUtc = clock.UtcNow,
        };
        Apply(staff, request);
        db.StaffMembers.Add(staff);
        await db.SaveChangesAsync(ct);
        return await GetAsync(staff.Id, ct);
    }

    public async Task<AdminStaffDto> UpdateAsync(Guid id, UpsertStaffRequest request, CancellationToken ct)
    {
        await validator.EnsureValidAsync(request, ct);
        await EnsureServicesExistAsync(request.ServiceIds, ct);

        var staff = await db.StaffMembers
            .Include(s => s.WorkingHours)
            .Include(s => s.TimeOff)
            .Include(s => s.ServiceLinks)
            .SingleOrDefaultAsync(s => s.Id == id, ct) ?? throw NotFound();

        ApplyProfile(staff, request);
        SyncServices(staff, request.ServiceIds);
        SyncWorkingHours(staff, request.WorkingHours);
        SyncTimeOff(staff, request.TimeOff ?? []);

        // Schedule edits change availability, so they participate in the booking lock as well.
        staff.MarkBooked();

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (ConcurrencyConflictException)
        {
            throw new ConflictException("staff_changed", "Personel kaydı başka bir işlemle güncellendi. Tekrar deneyin.");
        }

        return await GetAsync(id, ct);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct)
    {
        var staff = await db.StaffMembers.SingleOrDefaultAsync(s => s.Id == id, ct) ?? throw NotFound();
        if (await db.Appointments.AnyAsync(a => a.StaffMemberId == id, ct))
        {
            throw new ConflictException(
                "staff_has_appointments",
                "Bu personelin randevu geçmişi olduğu için silinemez. Bunun yerine pasife alabilirsiniz.");
        }

        db.StaffMembers.Remove(staff);
        await db.SaveChangesAsync(ct);
    }

    private void Apply(StaffMember staff, UpsertStaffRequest request)
    {
        ApplyProfile(staff, request);
        SyncServices(staff, request.ServiceIds);
        SyncWorkingHours(staff, request.WorkingHours);
        SyncTimeOff(staff, request.TimeOff ?? []);
    }

    private static void ApplyProfile(StaffMember staff, UpsertStaffRequest request)
    {
        staff.FullName = request.FullName.Trim();
        staff.Title = request.Title.Trim();
        staff.Color = request.Color.ToLowerInvariant();
        staff.Bio = string.IsNullOrWhiteSpace(request.Bio) ? null : request.Bio.Trim();
        staff.IsActive = request.IsActive;
    }

    // Collections are synchronised (update in place / remove / add) rather than replaced, so
    // EF Core never has to delete and re-insert rows that share a key or unique index. New rows
    // are added explicitly: their Guid keys are set client-side, so change detection alone would
    // assume they already exist and issue an UPDATE.
    private void SyncServices(StaffMember staff, IReadOnlyList<Guid> serviceIds)
    {
        var wanted = serviceIds.ToHashSet();
        foreach (var link in staff.ServiceLinks.Where(l => !wanted.Contains(l.ServiceId)).ToList())
        {
            staff.ServiceLinks.Remove(link);
            db.StaffServices.Remove(link);
        }

        foreach (var id in wanted.Where(id => !staff.ServiceLinks.Exists(l => l.ServiceId == id)))
        {
            var link = new StaffService { StaffMemberId = staff.Id, ServiceId = id };
            staff.ServiceLinks.Add(link);
            db.StaffServices.Add(link);
        }
    }

    private void SyncWorkingHours(StaffMember staff, IReadOnlyList<WorkingHoursDto> hours)
    {
        foreach (var existing in staff.WorkingHours.Where(w => !hours.Any(h => h.DayOfWeek == w.DayOfWeek)).ToList())
        {
            staff.WorkingHours.Remove(existing);
            db.WorkingHours.Remove(existing);
        }

        foreach (var h in hours)
        {
            var row = staff.WorkingHours.Find(w => w.DayOfWeek == h.DayOfWeek);
            if (row is null)
            {
                row = new WorkingHours { StaffMemberId = staff.Id, DayOfWeek = h.DayOfWeek };
                staff.WorkingHours.Add(row);
                db.WorkingHours.Add(row);
            }

            row.Start = h.Start;
            row.End = h.End;
            row.BreakStart = h.BreakStart;
            row.BreakEnd = h.BreakEnd;
        }
    }

    private void SyncTimeOff(StaffMember staff, IReadOnlyList<TimeOffDto> timeOff)
    {
        foreach (var existing in staff.TimeOff.Where(t => !timeOff.Any(x => x.Date == t.Date)).ToList())
        {
            staff.TimeOff.Remove(existing);
            db.StaffTimeOff.Remove(existing);
        }

        foreach (var t in timeOff)
        {
            var row = staff.TimeOff.Find(x => x.Date == t.Date);
            if (row is null)
            {
                row = new StaffTimeOff { StaffMemberId = staff.Id, Date = t.Date };
                staff.TimeOff.Add(row);
                db.StaffTimeOff.Add(row);
            }

            row.Reason = string.IsNullOrWhiteSpace(t.Reason) ? null : t.Reason.Trim();
        }
    }

    private async Task EnsureServicesExistAsync(IReadOnlyList<Guid> ids, CancellationToken ct)
    {
        var distinct = ids.Distinct().ToList();
        var found = await db.Services.CountAsync(s => distinct.Contains(s.Id), ct);
        if (found != distinct.Count)
        {
            throw new NotFoundException("service_not_found", "Seçilen hizmetlerden biri bulunamadı.");
        }
    }

    private static AdminStaffDto ToDto(StaffMember s, int upcoming)
    {
        var calendar = AppointmentQueryService.ToCalendarStaff(s);
        return new AdminStaffDto(
            s.Id,
            s.FullName,
            s.Title,
            s.Color,
            s.Bio,
            s.IsActive,
            s.User?.Email,
            s.ServiceLinks.Select(l => l.ServiceId).ToList(),
            calendar.WorkingHours,
            calendar.TimeOff,
            upcoming);
    }

    private static NotFoundException NotFound() => new("staff_not_found", "Personel bulunamadı.");
}
