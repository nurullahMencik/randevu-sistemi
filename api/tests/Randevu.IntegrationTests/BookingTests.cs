using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using Randevu.Application.Features.Appointments;
using Randevu.Domain.Entities;
using Randevu.Infrastructure.Persistence;
using static Randevu.IntegrationTests.TestData;

namespace Randevu.IntegrationTests;

public sealed class BookingTests(RandevuApiFactory factory) : IClassFixture<RandevuApiFactory>
{
    [Fact]
    public async Task Customer_books_a_free_slot_and_sees_it_in_my_appointments()
    {
        var (client, _) = await factory.CreateNewCustomerAsync();
        using var _client = client;
        var haircut = await ServiceAsync(client, "Saç Kesimi");
        var emre = await StaffAsync(client, "Emre Yıldız");
        var date = FutureWorkday(3);

        var availability = await AvailabilityAsync(client, haircut.Id, emre.Id, date);
        Assert.NotEmpty(availability.Slots);
        Assert.Equal("09:00", availability.Slots[0].LocalTime); // Emre starts at 09:00
        var slot = availability.Slots[0];

        var response = await client.PostAsJsonAsync("/api/appointments", new CreateAppointmentRequest(haircut.Id, emre.Id, slot.StartUtc, "İlk ziyaret"), RandevuApiFactory.Json, Ct);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<AppointmentDto>(RandevuApiFactory.Json, Ct);
        Assert.Equal(AppointmentStatus.Confirmed, created!.Status);
        Assert.Equal(slot.StartUtc.AddMinutes(45), created.EndUtc);
        Assert.Equal(650m, created.Price);
        Assert.True(created.CanCancel);

        var mine = await client.GetFromJsonAsync<MyAppointmentsDto>("/api/me/appointments", RandevuApiFactory.Json, Ct);
        Assert.Contains(mine!.Upcoming, a => a.Id == created.Id);

        var after = await AvailabilityAsync(client, haircut.Id, emre.Id, date);
        Assert.DoesNotContain(after.Slots, s => s.StartUtc == slot.StartUtc);
    }

    [Fact]
    public async Task Second_request_for_the_same_slot_gets_409_problem()
    {
        var (first, _) = await factory.CreateNewCustomerAsync();
        var (second, _) = await factory.CreateNewCustomerAsync();
        using var _first = first;
        using var _second = second;
        var beard = await ServiceAsync(first, "Sakal Tıraşı");
        var can = await StaffAsync(first, "Can Demir");
        var date = FutureWorkday(4);
        var slot = (await AvailabilityAsync(first, beard.Id, can.Id, date)).Slots[2];
        var request = new CreateAppointmentRequest(beard.Id, can.Id, slot.StartUtc, null);

        var ok = await first.PostAsJsonAsync("/api/appointments", request, RandevuApiFactory.Json, Ct);
        var conflict = await second.PostAsJsonAsync("/api/appointments", request, RandevuApiFactory.Json, Ct);

        Assert.Equal(HttpStatusCode.Created, ok.StatusCode);
        var problem = await ProblemAsync(conflict, HttpStatusCode.Conflict);
        Assert.Equal("slot_taken", problem.GetProperty("code").GetString());
        Assert.Equal(409, problem.GetProperty("status").GetInt32());
    }

    [Fact]
    public async Task Concurrent_requests_for_the_same_slot_produce_exactly_one_booking()
    {
        var customers = await Task.WhenAll(Enumerable.Range(0, 6).Select(_ => factory.CreateNewCustomerAsync()));
        var haircut = await ServiceAsync(customers[0].Client, "Saç Kesimi");
        var zeynep = await StaffAsync(customers[0].Client, "Zeynep Aydın");
        var date = FutureWorkday(5);
        var slot = (await AvailabilityAsync(customers[0].Client, haircut.Id, zeynep.Id, date)).Slots[4];
        var request = new CreateAppointmentRequest(haircut.Id, zeynep.Id, slot.StartUtc, null);

        var responses = await Task.WhenAll(customers.Select(c => c.Client.PostAsJsonAsync("/api/appointments", request, RandevuApiFactory.Json, Ct)));

        Assert.Equal(1, responses.Count(r => r.StatusCode == HttpStatusCode.Created));
        Assert.Equal(5, responses.Count(r => r.StatusCode == HttpStatusCode.Conflict));

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(1, db.Appointments.Count(a => a.StaffMemberId == zeynep.Id && a.StartUtc == slot.StartUtc && a.Status != AppointmentStatus.Cancelled));

        foreach (var (client, _) in customers)
        {
            client.Dispose();
        }
    }

    [Fact]
    public async Task Any_staff_booking_assigns_someone_who_is_free()
    {
        var (client, _) = await factory.CreateNewCustomerAsync();
        using var _client = client;
        var haircut = await ServiceAsync(client, "Saç Kesimi");
        var date = FutureWorkday(6);
        var availability = await AvailabilityAsync(client, haircut.Id, null, date);
        var slot = availability.Slots.First(s => s.StaffIds.Count > 1);

        var response = await client.PostAsJsonAsync("/api/appointments", new CreateAppointmentRequest(haircut.Id, null, slot.StartUtc, null), RandevuApiFactory.Json, Ct);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<AppointmentDto>(RandevuApiFactory.Json, Ct);
        Assert.Contains(created!.Staff.Id, slot.StaffIds);
    }

    [Fact]
    public async Task Start_time_outside_working_hours_is_rejected_with_422()
    {
        var (client, _) = await factory.CreateNewCustomerAsync();
        using var _client = client;
        var haircut = await ServiceAsync(client, "Saç Kesimi");
        var emre = await StaffAsync(client, "Emre Yıldız");
        var date = FutureWorkday(3);
        var sevenAmLocal = new DateTime(date.Year, date.Month, date.Day, 4, 0, 0, DateTimeKind.Utc);

        var response = await client.PostAsJsonAsync("/api/appointments", new CreateAppointmentRequest(haircut.Id, emre.Id, sevenAmLocal, null), RandevuApiFactory.Json, Ct);

        var problem = await ProblemAsync(response, HttpStatusCode.UnprocessableEntity);
        Assert.Equal("slot_invalid", problem.GetProperty("code").GetString());
    }

    [Fact]
    public async Task Availability_respects_weekly_day_off()
    {
        using var client = factory.CreateClient();
        var color = await ServiceAsync(client, "Saç Boyama");
        var zeynep = await StaffAsync(client, "Zeynep Aydın");
        var thursday = TodayInIstanbul.AddDays(1);
        while (thursday.DayOfWeek != DayOfWeek.Thursday)
        {
            thursday = thursday.AddDays(1);
        }

        var availability = await AvailabilityAsync(client, color.Id, zeynep.Id, thursday);

        Assert.Empty(availability.Slots);
        Assert.DoesNotContain(DayOfWeek.Thursday, zeynep.WorkingDays);
    }

    [Fact]
    public async Task Customer_can_cancel_early_and_the_slot_becomes_free_again()
    {
        var (client, _) = await factory.CreateNewCustomerAsync();
        var (other, _) = await factory.CreateNewCustomerAsync();
        using var _client = client;
        using var _other = other;
        var facial = await ServiceAsync(client, "Cilt Bakımı");
        var elif = await StaffAsync(client, "Elif Kaya");
        var date = FutureWorkday(7);
        var slot = (await AvailabilityAsync(client, facial.Id, elif.Id, date)).Slots[0];
        var request = new CreateAppointmentRequest(facial.Id, elif.Id, slot.StartUtc, null);
        var created = await (await client.PostAsJsonAsync("/api/appointments", request, RandevuApiFactory.Json, Ct))
            .Content.ReadFromJsonAsync<AppointmentDto>(RandevuApiFactory.Json, Ct);

        var cancel = await client.PostAsync($"/api/appointments/{created!.Id}/cancel", null, Ct);

        Assert.Equal(HttpStatusCode.OK, cancel.StatusCode);
        var cancelled = await cancel.Content.ReadFromJsonAsync<AppointmentDto>(RandevuApiFactory.Json, Ct);
        Assert.Equal(AppointmentStatus.Cancelled, cancelled!.Status);

        // The filtered unique index ignores cancelled rows, so someone else can take the slot.
        var rebook = await other.PostAsJsonAsync("/api/appointments", request, RandevuApiFactory.Json, Ct);
        Assert.Equal(HttpStatusCode.Created, rebook.StatusCode);
    }

    [Fact]
    public async Task Customer_cannot_cancel_within_two_hours_of_the_start()
    {
        var (client, auth) = await factory.CreateNewCustomerAsync();
        using var _client = client;
        var appointmentId = await InsertAppointmentAsync(auth.User.Id, DateTime.UtcNow.AddMinutes(90));

        var response = await client.PostAsync($"/api/appointments/{appointmentId}/cancel", null, Ct);

        var problem = await ProblemAsync(response, HttpStatusCode.UnprocessableEntity);
        Assert.Equal("cancellation_window_closed", problem.GetProperty("code").GetString());

        var mine = await client.GetFromJsonAsync<MyAppointmentsDto>("/api/me/appointments", RandevuApiFactory.Json, Ct);
        var appointment = Assert.Single(mine!.Upcoming, a => a.Id == appointmentId);
        Assert.False(appointment.CanCancel);
        Assert.Equal(AppointmentStatus.Confirmed, appointment.Status);
    }

    [Fact]
    public async Task Admin_can_still_cancel_within_two_hours()
    {
        var (_, auth) = await factory.CreateNewCustomerAsync();
        var appointmentId = await InsertAppointmentAsync(auth.User.Id, DateTime.UtcNow.AddMinutes(60));
        using var admin = await factory.CreateClientAsAsync(Admin);

        var response = await admin.PostAsync($"/api/appointments/{appointmentId}/cancel", null, Ct);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Customer_cannot_see_or_cancel_someone_elses_appointment()
    {
        var (_, owner) = await factory.CreateNewCustomerAsync();
        var (intruder, _) = await factory.CreateNewCustomerAsync();
        using var _intruder = intruder;
        var appointmentId = await InsertAppointmentAsync(owner.User.Id, DateTime.UtcNow.AddDays(3));

        var response = await intruder.PostAsync($"/api/appointments/{appointmentId}/cancel", null, Ct);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    /// <summary>Inserts directly, bypassing availability, to control the start time precisely.</summary>
    private async Task<Guid> InsertAppointmentAsync(Guid customerId, DateTime startUtc)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var service = db.Services.First(s => s.Name == "Manikür");
        var staff = db.StaffMembers.First(s => s.FullName == "Elif Kaya");
        var appointment = new Appointment
        {
            CustomerId = customerId,
            ServiceId = service.Id,
            StaffMemberId = staff.Id,
            StartUtc = startUtc,
            EndUtc = startUtc.AddMinutes(service.DurationMinutes),
            Price = service.Price,
            CreatedAtUtc = DateTime.UtcNow,
        };
        db.Appointments.Add(appointment);
        await db.SaveChangesAsync(Ct);
        return appointment.Id;
    }
}
