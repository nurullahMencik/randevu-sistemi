using Microsoft.AspNetCore.Http.HttpResults;
using Randevu.Api.Infrastructure;
using Randevu.Application.Common;
using Randevu.Application.Features.Admin;
using Randevu.Application.Features.Appointments;
using Randevu.Application.Features.Dashboard;

namespace Randevu.Api.Endpoints;

internal static class AdminEndpoints
{
    public static void MapAdminEndpoints(this IEndpointRouteBuilder app)
    {
        var admin = app.MapGroup("/api/admin")
            .RequireAuthorization(ApiServiceCollectionExtensions.AdminPolicy)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden);

        // ---- Dashboard & calendar -----------------------------------------------------------
        var reports = admin.MapGroup("").WithTags("Yönetim · Panel");

        reports.MapGet("/dashboard", async Task<Ok<DashboardDto>> (int? days, DashboardService dashboard, CancellationToken ct) =>
                TypedResults.Ok(await dashboard.GetAsync(days ?? 7, ct)))
            .WithName("GetDashboard")
            .WithSummary("KPI'lar, personel bazlı doluluk ve günlük seri")
            .WithDescription("days: 7, 14 veya 28. Dönem bugünden önceki tamamlanmış günlerdir ve bir önceki eşit dönemle karşılaştırılır.");

        reports.MapGet("/calendar", async Task<Ok<ScheduleDto>> (
                DateOnly? from, DateOnly? to, Guid? staffId, AppointmentQueryService queries, BusinessClock clock, CancellationToken ct) =>
            {
                var start = from ?? clock.Today;
                return TypedResults.Ok(await queries.GetScheduleAsync(start, to ?? start.AddDays(6), staffId, ct));
            })
            .WithName("GetCalendar")
            .WithSummary("Takvim: personel vardiyaları ve randevular (en fazla 6 hafta)");

        // ---- Appointments -------------------------------------------------------------------
        var appointments = admin.MapGroup("/appointments").WithTags("Yönetim · Randevular");

        appointments.MapGet("/", async Task<Ok<PagedResult<AppointmentDto>>> (
                [AsParameters] AppointmentListQuery query, AppointmentQueryService queries, CancellationToken ct) =>
                TypedResults.Ok(await queries.ListAsync(query, ct)))
            .WithName("ListAppointments")
            .WithSummary("Randevu listesi (tarih, personel, hizmet, durum, müşteri araması; sayfalı)");

        appointments.MapPatch("/{id:guid}/status", async Task<Ok<AppointmentDto>> (
                Guid id, UpdateAppointmentStatusRequest request, AppointmentQueryService queries,
                FluentValidation.IValidator<UpdateAppointmentStatusRequest> validator, CancellationToken ct) =>
            {
                await validator.EnsureValidAsync(request, ct);
                return TypedResults.Ok(await queries.UpdateStatusAsync(id, request, ct));
            })
            .WithName("UpdateAppointmentStatus")
            .WithSummary("Geçmiş randevuyu Tamamlandı / Gelmedi olarak işaretler")
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity);

        // ---- Services -----------------------------------------------------------------------
        var services = admin.MapGroup("/services").WithTags("Yönetim · Hizmetler");

        services.MapGet("/", async Task<Ok<IReadOnlyList<AdminServiceDto>>> (ServiceAdminService svc, CancellationToken ct) =>
                TypedResults.Ok(await svc.ListAsync(ct)))
            .WithName("AdminListServices")
            .WithSummary("Tüm hizmetler (pasifler dahil)");

        services.MapPost("/", async Task<Created<AdminServiceDto>> (UpsertServiceRequest request, ServiceAdminService svc, CancellationToken ct) =>
            {
                var created = await svc.CreateAsync(request, ct);
                return TypedResults.Created($"/api/admin/services/{created.Id}", created);
            })
            .WithName("AdminCreateService")
            .WithSummary("Hizmet ekler")
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status409Conflict);

        services.MapPut("/{id:guid}", async Task<Ok<AdminServiceDto>> (Guid id, UpsertServiceRequest request, ServiceAdminService svc, CancellationToken ct) =>
                TypedResults.Ok(await svc.UpdateAsync(id, request, ct)))
            .WithName("AdminUpdateService")
            .WithSummary("Hizmeti günceller")
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        services.MapDelete("/{id:guid}", async Task<NoContent> (Guid id, ServiceAdminService svc, CancellationToken ct) =>
            {
                await svc.DeleteAsync(id, ct);
                return TypedResults.NoContent();
            })
            .WithName("AdminDeleteService")
            .WithSummary("Hizmeti siler (randevusu varsa 409; pasife alın)")
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        // ---- Staff --------------------------------------------------------------------------
        var staff = admin.MapGroup("/staff").WithTags("Yönetim · Personel");

        staff.MapGet("/", async Task<Ok<IReadOnlyList<AdminStaffDto>>> (StaffAdminService svc, CancellationToken ct) =>
                TypedResults.Ok(await svc.ListAsync(ct)))
            .WithName("AdminListStaff")
            .WithSummary("Tüm personel; hizmetler, vardiyalar ve izinlerle");

        staff.MapGet("/{id:guid}", async Task<Ok<AdminStaffDto>> (Guid id, StaffAdminService svc, CancellationToken ct) =>
                TypedResults.Ok(await svc.GetAsync(id, ct)))
            .WithName("AdminGetStaff")
            .WithSummary("Personel detayı")
            .ProducesProblem(StatusCodes.Status404NotFound);

        staff.MapPost("/", async Task<Created<AdminStaffDto>> (UpsertStaffRequest request, StaffAdminService svc, CancellationToken ct) =>
            {
                var created = await svc.CreateAsync(request, ct);
                return TypedResults.Created($"/api/admin/staff/{created.Id}", created);
            })
            .WithName("AdminCreateStaff")
            .WithSummary("Personel ekler")
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status404NotFound);

        staff.MapPut("/{id:guid}", async Task<Ok<AdminStaffDto>> (Guid id, UpsertStaffRequest request, StaffAdminService svc, CancellationToken ct) =>
                TypedResults.Ok(await svc.UpdateAsync(id, request, ct)))
            .WithName("AdminUpdateStaff")
            .WithSummary("Personeli, hizmetlerini, vardiyalarını ve izinlerini günceller")
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        staff.MapDelete("/{id:guid}", async Task<NoContent> (Guid id, StaffAdminService svc, CancellationToken ct) =>
            {
                await svc.DeleteAsync(id, ct);
                return TypedResults.NoContent();
            })
            .WithName("AdminDeleteStaff")
            .WithSummary("Personeli siler (randevusu varsa 409; pasife alın)")
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);
    }
}
