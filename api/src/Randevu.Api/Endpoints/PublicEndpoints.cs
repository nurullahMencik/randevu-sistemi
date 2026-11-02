using Microsoft.AspNetCore.Http.HttpResults;
using Randevu.Application.Features.Availability;
using Randevu.Application.Features.Catalog;

namespace Randevu.Api.Endpoints;

internal static class PublicEndpoints
{
    public static void MapPublicEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api").WithTags("Katalog ve uygunluk").AllowAnonymous();

        group.MapGet("/business", Ok<BusinessInfoDto> (CatalogService catalog) => TypedResults.Ok(catalog.GetBusinessInfo()))
            .WithName("GetBusiness")
            .WithSummary("İşletme bilgileri, çalışma günleri ve saatleri");

        group.MapGet("/services", async Task<Ok<IReadOnlyList<ServiceDto>>> (CatalogService catalog, CancellationToken ct) =>
                TypedResults.Ok(await catalog.GetServicesAsync(ct)))
            .WithName("GetServices")
            .WithSummary("Aktif hizmetler");

        group.MapGet("/staff", async Task<Ok<IReadOnlyList<StaffDto>>> (Guid? serviceId, CatalogService catalog, CancellationToken ct) =>
                TypedResults.Ok(await catalog.GetStaffAsync(serviceId, ct)))
            .WithName("GetStaff")
            .WithSummary("Personel listesi; serviceId verilirse yalnızca o hizmeti yapanlar");

        group.MapGet("/availability", async Task<Ok<AvailabilityResponse>> (
                Guid serviceId, Guid? staffId, DateOnly date, AvailabilityService availability, CancellationToken ct) =>
                TypedResults.Ok(await availability.GetSlotsAsync(new AvailabilityQuery(serviceId, staffId, date), ct)))
            .WithName("GetAvailability")
            .WithSummary("Bir gün için uygun başlangıç saatleri")
            .WithDescription("15 dakikalık ızgara; hizmet süresi, çalışma saatleri, molalar, izinler, mevcut randevular ve geçmiş saatler hesaba katılır. staffId boşsa tüm uygun personel birleştirilir (\"fark etmez\").")
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapGet("/availability/days", async Task<Ok<IReadOnlyList<DayAvailabilityDto>>> (
                Guid serviceId, Guid? staffId, DateOnly from, int? days, AvailabilityService availability, CancellationToken ct) =>
                TypedResults.Ok(await availability.GetCalendarAsync(new AvailabilityCalendarQuery(serviceId, staffId, from, days ?? 14), ct)))
            .WithName("GetAvailabilityDays")
            .WithSummary("Gün bazında boş saat sayısı (tarih seçici için)")
            .ProducesProblem(StatusCodes.Status404NotFound);
    }
}
