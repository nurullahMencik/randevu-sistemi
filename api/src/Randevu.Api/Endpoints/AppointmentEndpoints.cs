using Microsoft.AspNetCore.Http.HttpResults;
using Randevu.Api.Infrastructure;
using Randevu.Application.Abstractions;
using Randevu.Application.Common;
using Randevu.Application.Features.Appointments;

namespace Randevu.Api.Endpoints;

internal static class AppointmentEndpoints
{
    public static void MapAppointmentEndpoints(this IEndpointRouteBuilder app)
    {
        var appointments = app.MapGroup("/api/appointments").WithTags("Randevular");

        appointments.MapPost("/", async Task<Created<AppointmentDto>> (
                CreateAppointmentRequest request, ICurrentUser user, BookingService booking, CancellationToken ct) =>
            {
                var created = await booking.CreateAsync(user.RequireUserId(), request, ct);
                return TypedResults.Created($"/api/me/appointments#{created.Id}", created);
            })
            .RequireAuthorization(ApiServiceCollectionExtensions.CustomerPolicy)
            .WithName("CreateAppointment")
            .WithSummary("Randevu oluşturur")
            .WithDescription("Uygunluk, transaction içinde yeniden hesaplanır. Aynı saati eşzamanlı alan ikinci istek 409 (code: slot_taken) alır.")
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity);

        appointments.MapPost("/{id:guid}/cancel", async Task<Ok<AppointmentDto>> (
                Guid id, ICurrentUser user, BookingService booking, CancellationToken ct) =>
                TypedResults.Ok(await booking.CancelAsync(id, user, ct)))
            .RequireAuthorization()
            .WithName("CancelAppointment")
            .WithSummary("Randevuyu iptal eder")
            .WithDescription("Müşteri, randevuya 2 saatten fazla varken iptal edebilir (aksi halde 422, code: cancellation_window_closed). Personel kendi randevularını, yönetici tümünü iptal edebilir.")
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity);

        var me = app.MapGroup("/api/me").WithTags("Randevular");

        me.MapGet("/appointments", async Task<Ok<MyAppointmentsDto>> (
                ICurrentUser user, AppointmentQueryService queries, CancellationToken ct) =>
                TypedResults.Ok(await queries.GetForCustomerAsync(user.RequireUserId(), ct)))
            .RequireAuthorization(ApiServiceCollectionExtensions.CustomerPolicy)
            .WithName("GetMyAppointments")
            .WithSummary("Müşterinin yaklaşan ve geçmiş randevuları")
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden);

        me.MapGet("/schedule", async Task<Ok<ScheduleDto>> (
                DateOnly? from, DateOnly? to, ICurrentUser user, AppointmentQueryService queries, BusinessClock clock, CancellationToken ct) =>
            {
                var staffId = user.StaffId ?? throw new ForbiddenException("not_staff", "Bu hesap bir personel kaydına bağlı değil.");
                var start = from ?? clock.Today;
                return TypedResults.Ok(await queries.GetScheduleAsync(start, to ?? start.AddDays(6), staffId, ct));
            })
            .RequireAuthorization(ApiServiceCollectionExtensions.StaffPolicy)
            .WithName("GetMySchedule")
            .WithSummary("Personelin kendi programı (varsayılan: bugünden itibaren 7 gün)")
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden);
    }
}
