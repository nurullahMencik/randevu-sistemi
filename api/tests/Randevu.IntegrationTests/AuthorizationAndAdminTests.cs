using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Randevu.Application.Common;
using Randevu.Application.Features.Admin;
using Randevu.Application.Features.Appointments;
using Randevu.Application.Features.Dashboard;
using static Randevu.IntegrationTests.TestData;

namespace Randevu.IntegrationTests;

public sealed class AuthorizationTests(RandevuApiFactory factory) : IClassFixture<RandevuApiFactory>
{
    [Theory]
    [InlineData("/api/admin/dashboard")]
    [InlineData("/api/admin/appointments")]
    [InlineData("/api/admin/services")]
    [InlineData("/api/admin/staff")]
    [InlineData("/api/admin/calendar")]
    public async Task Customer_gets_403_problem_on_admin_endpoints(string url)
    {
        using var client = await factory.CreateClientAsAsync(Customer);

        var response = await client.GetAsync(url, Ct);

        var problem = await ProblemAsync(response, HttpStatusCode.Forbidden);
        Assert.Equal("forbidden", problem.GetProperty("code").GetString());
    }

    [Fact]
    public async Task Staff_gets_403_on_admin_endpoints_and_customer_endpoints()
    {
        using var client = await factory.CreateClientAsAsync(Staff);

        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/admin/dashboard", Ct)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/me/appointments", Ct)).StatusCode);
    }

    [Fact]
    public async Task Anonymous_gets_401_problem()
    {
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/me/appointments", Ct);

        var problem = await ProblemAsync(response, HttpStatusCode.Unauthorized);
        Assert.Equal("not_authenticated", problem.GetProperty("code").GetString());
    }

    [Fact]
    public async Task Tampered_token_is_rejected()
    {
        var auth = await factory.LoginAsync(Customer);
        using var client = factory.Authorized(auth.AccessToken[..^4] + "AAAA");

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/me/appointments", Ct)).StatusCode);
    }

    [Fact]
    public async Task Staff_sees_only_their_own_schedule()
    {
        using var client = await factory.CreateClientAsAsync(Staff);

        var schedule = await client.GetFromJsonAsync<ScheduleDto>("/api/me/schedule", RandevuApiFactory.Json, Ct);

        var only = Assert.Single(schedule!.Staff);
        Assert.Equal("Emre Yıldız", only.FullName);
        Assert.All(schedule.Appointments, a => Assert.Equal(only.Id, a.Staff.Id));
    }

    [Fact]
    public async Task Health_and_openapi_are_public()
    {
        using var client = factory.CreateClient();

        var health = await client.GetFromJsonAsync<JsonElement>("/health", Ct);
        Assert.Equal("Healthy", health.GetProperty("status").GetString());

        var openApi = await client.GetFromJsonAsync<JsonElement>("/openapi/v1.json", Ct);
        Assert.True(openApi.GetProperty("paths").TryGetProperty("/api/appointments", out _));
        Assert.True(openApi.GetProperty("components").GetProperty("securitySchemes").TryGetProperty("Bearer", out _));
    }
}

public sealed class AdminTests(RandevuApiFactory factory) : IClassFixture<RandevuApiFactory>
{
    [Fact]
    public async Task Service_crud_round_trip()
    {
        using var admin = await factory.CreateClientAsAsync(Admin);
        var request = new UpsertServiceRequest("Keratin Bakımı", "Fön dahil", 90, 2400m, true, 10);

        var create = await admin.PostAsJsonAsync("/api/admin/services", request, RandevuApiFactory.Json, Ct);
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var created = await create.Content.ReadFromJsonAsync<AdminServiceDto>(RandevuApiFactory.Json, Ct);

        var duplicate = await admin.PostAsJsonAsync("/api/admin/services", request, RandevuApiFactory.Json, Ct);
        Assert.Equal(HttpStatusCode.Conflict, duplicate.StatusCode);

        var update = await admin.PutAsJsonAsync($"/api/admin/services/{created!.Id}", request with { Price = 2600m, IsActive = false }, RandevuApiFactory.Json, Ct);
        var updated = await update.Content.ReadFromJsonAsync<AdminServiceDto>(RandevuApiFactory.Json, Ct);
        Assert.Equal(2600m, updated!.Price);
        Assert.False(updated.IsActive);

        using var anonymous = factory.CreateClient();
        var publicServices = await anonymous.GetFromJsonAsync<List<JsonElement>>("/api/services", Ct);
        Assert.DoesNotContain(publicServices!, s => s.GetProperty("name").GetString() == "Keratin Bakımı");

        Assert.Equal(HttpStatusCode.NoContent, (await admin.DeleteAsync($"/api/admin/services/{created.Id}", Ct)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await admin.DeleteAsync($"/api/admin/services/{created.Id}", Ct)).StatusCode);
    }

    [Fact]
    public async Task Staff_update_replaces_schedule_and_validates_it()
    {
        using var admin = await factory.CreateClientAsAsync(Admin);
        var staff = await admin.GetFromJsonAsync<List<AdminStaffDto>>("/api/admin/staff", RandevuApiFactory.Json, Ct);
        var can = staff!.Single(s => s.FullName == "Can Demir");
        var holiday = FutureWorkday(10);
        var request = new UpsertStaffRequest(
            can.FullName, can.Title, can.Color, can.Bio, true, can.ServiceIds,
            [new WorkingHoursDto(DayOfWeek.Tuesday, new TimeOnly(10, 0), new TimeOnly(16, 0), new TimeOnly(12, 0), new TimeOnly(12, 30))],
            [new TimeOffDto(holiday, "Doktor randevusu")]);

        var response = await admin.PutAsJsonAsync($"/api/admin/staff/{can.Id}", request, RandevuApiFactory.Json, Ct);

        Assert.True(response.StatusCode == HttpStatusCode.OK, await response.Content.ReadAsStringAsync(Ct));
        var updated = await response.Content.ReadFromJsonAsync<AdminStaffDto>(RandevuApiFactory.Json, Ct);
        var tuesday = Assert.Single(updated!.WorkingHours);
        Assert.Equal(new TimeOnly(16, 0), tuesday.End);
        Assert.Contains(updated.TimeOff, t => t.Date == holiday);

        var invalid = request with { WorkingHours = [new WorkingHoursDto(DayOfWeek.Monday, new TimeOnly(10, 0), new TimeOnly(16, 0), null, null)] };
        var bad = await admin.PutAsJsonAsync($"/api/admin/staff/{can.Id}", invalid, RandevuApiFactory.Json, Ct);
        Assert.Equal(HttpStatusCode.BadRequest, bad.StatusCode);
    }

    [Fact]
    public async Task New_staff_member_becomes_bookable()
    {
        using var admin = await factory.CreateClientAsAsync(Admin);
        var manicure = await ServiceAsync(admin, "Manikür");
        var request = new UpsertStaffRequest(
            "Selin Koç", "Tırnak Uzmanı", "#e87ba4", null, true, [manicure.Id],
            [new WorkingHoursDto(DayOfWeek.Saturday, new TimeOnly(10, 0), new TimeOnly(14, 0), null, null)],
            null);

        var response = await admin.PostAsJsonAsync("/api/admin/staff", request, RandevuApiFactory.Json, Ct);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<AdminStaffDto>(RandevuApiFactory.Json, Ct);
        var saturday = TodayInIstanbul.AddDays(1);
        while (saturday.DayOfWeek != DayOfWeek.Saturday)
        {
            saturday = saturday.AddDays(1);
        }

        var availability = await AvailabilityAsync(admin, manicure.Id, created!.Id, saturday);
        Assert.Equal("10:00", availability.Slots[0].LocalTime);
        Assert.Equal("13:15", availability.Slots[^1].LocalTime);
    }

    [Fact]
    public async Task Appointment_list_supports_filters_and_paging()
    {
        using var admin = await factory.CreateClientAsAsync(Admin);

        var page = await admin.GetFromJsonAsync<PagedResult<AppointmentDto>>("/api/admin/appointments?pageSize=5&page=1&status=Confirmed", RandevuApiFactory.Json, Ct);

        Assert.NotNull(page);
        Assert.Equal(5, page.PageSize);
        Assert.All(page.Items, a => Assert.NotNull(a.Customer));
    }
}

public sealed class DashboardTests(SeededApiFactory factory) : IClassFixture<SeededApiFactory>
{
    [Fact]
    public async Task Dashboard_reports_kpis_from_generated_history()
    {
        using var admin = await factory.CreateClientAsAsync(Admin);

        var dashboard = await admin.GetFromJsonAsync<DashboardDto>("/api/admin/dashboard?days=7", RandevuApiFactory.Json, Ct);

        Assert.NotNull(dashboard);
        Assert.Equal(7, dashboard.RangeDays);
        Assert.True(dashboard.Revenue.Value > 0);
        Assert.True(dashboard.Appointments.Value > 0);
        Assert.InRange((double)dashboard.Occupancy.Value, 1, 100);
        Assert.NotNull(dashboard.PopularService);
        Assert.Equal(4, dashboard.Staff.Count);
        Assert.Equal(DashboardService.PastDays + DashboardService.FutureDays, dashboard.Daily.Count);
        Assert.All(dashboard.Daily.Where(d => d.IsFuture), d => Assert.Equal(0, d.Revenue));
        Assert.All(dashboard.Daily.Where(d => d.Date.DayOfWeek == DayOfWeek.Monday), d => Assert.False(d.IsOpen));
    }

    [Fact]
    public async Task Demo_customer_has_history_and_upcoming_appointments()
    {
        using var client = await factory.CreateClientAsAsync(Customer);

        var mine = await client.GetFromJsonAsync<MyAppointmentsDto>("/api/me/appointments", RandevuApiFactory.Json, Ct);

        Assert.Equal(2, mine!.Upcoming.Count);
        Assert.True(mine.Past.Count >= 3);
    }
}
