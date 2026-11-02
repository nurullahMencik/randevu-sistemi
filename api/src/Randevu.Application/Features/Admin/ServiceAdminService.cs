using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Randevu.Application.Abstractions;
using Randevu.Application.Common;
using Randevu.Domain.Entities;

namespace Randevu.Application.Features.Admin;

public sealed class ServiceAdminService(IAppDbContext db, BusinessClock clock, IValidator<UpsertServiceRequest> validator)
{
    public async Task<IReadOnlyList<AdminServiceDto>> ListAsync(CancellationToken ct)
    {
        var now = clock.UtcNow;
        return await db.Services.AsNoTracking()
            .OrderBy(s => s.SortOrder).ThenBy(s => s.Name)
            .Select(s => new AdminServiceDto(
                s.Id,
                s.Name,
                s.Description,
                s.DurationMinutes,
                s.Price,
                s.IsActive,
                s.SortOrder,
                s.StaffLinks.Count,
                db.Appointments.Count(a => a.ServiceId == s.Id && a.Status == AppointmentStatus.Confirmed && a.StartUtc > now)))
            .ToListAsync(ct);
    }

    public async Task<AdminServiceDto> CreateAsync(UpsertServiceRequest request, CancellationToken ct)
    {
        await validator.EnsureValidAsync(request, ct);
        await EnsureUniqueNameAsync(request.Name, null, ct);

        var service = new Service
        {
            Name = request.Name.Trim(),
            CreatedAtUtc = clock.UtcNow,
        };
        Apply(service, request);
        db.Services.Add(service);
        await db.SaveChangesAsync(ct);
        return await GetAsync(service.Id, ct);
    }

    public async Task<AdminServiceDto> UpdateAsync(Guid id, UpsertServiceRequest request, CancellationToken ct)
    {
        await validator.EnsureValidAsync(request, ct);
        var service = await db.Services.SingleOrDefaultAsync(s => s.Id == id, ct) ?? throw NotFound();
        await EnsureUniqueNameAsync(request.Name, id, ct);
        Apply(service, request);
        await db.SaveChangesAsync(ct);
        return await GetAsync(id, ct);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct)
    {
        var service = await db.Services.SingleOrDefaultAsync(s => s.Id == id, ct) ?? throw NotFound();
        if (await db.Appointments.AnyAsync(a => a.ServiceId == id, ct))
        {
            throw new ConflictException(
                "service_in_use",
                "Bu hizmete ait randevular olduğu için silinemez. Bunun yerine pasife alabilirsiniz.");
        }

        db.Services.Remove(service);
        await db.SaveChangesAsync(ct);
    }

    private async Task<AdminServiceDto> GetAsync(Guid id, CancellationToken ct) =>
        (await ListAsync(ct)).Single(s => s.Id == id);

    private async Task EnsureUniqueNameAsync(string name, Guid? exceptId, CancellationToken ct)
    {
        var trimmed = name.Trim();
        if (await db.Services.AnyAsync(s => s.Name == trimmed && s.Id != exceptId, ct))
        {
            throw new ConflictException("service_name_taken", "Bu adla bir hizmet zaten var.");
        }
    }

    private static void Apply(Service service, UpsertServiceRequest request)
    {
        service.Name = request.Name.Trim();
        service.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        service.DurationMinutes = request.DurationMinutes;
        service.Price = request.Price;
        service.IsActive = request.IsActive;
        service.SortOrder = request.SortOrder;
    }

    private static NotFoundException NotFound() => new("service_not_found", "Hizmet bulunamadı.");
}
