using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Randevu.Application.Features.Availability;
using Randevu.Application.Features.Catalog;

namespace Randevu.IntegrationTests;

internal static class TestData
{
    public const string Admin = "admin@randevu.demo";
    public const string Staff = "personel@randevu.demo";
    public const string Customer = "musteri@randevu.demo";

    public static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static readonly TimeZoneInfo Istanbul = Randevu.Domain.Scheduling.BusinessTimeZone.Resolve("Europe/Istanbul");

    public static DateOnly TodayInIstanbul => DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, Istanbul));

    /// <summary>
    /// A business day (not Monday, not Thursday so every seeded staff member works) at least
    /// <paramref name="minDaysAhead"/> days away.
    /// </summary>
    public static DateOnly FutureWorkday(int minDaysAhead = 3)
    {
        var date = TodayInIstanbul.AddDays(minDaysAhead);
        while (date.DayOfWeek is DayOfWeek.Monday or DayOfWeek.Thursday)
        {
            date = date.AddDays(1);
        }

        return date;
    }

    public static async Task<ServiceDto> ServiceAsync(HttpClient client, string name)
    {
        var services = await client.GetFromJsonAsync<List<ServiceDto>>("/api/services", RandevuApiFactory.Json, Ct);
        return services!.Single(s => s.Name == name);
    }

    public static async Task<StaffDto> StaffAsync(HttpClient client, string fullName)
    {
        var staff = await client.GetFromJsonAsync<List<StaffDto>>("/api/staff", RandevuApiFactory.Json, Ct);
        return staff!.Single(s => s.FullName == fullName);
    }

    public static async Task<AvailabilityResponse> AvailabilityAsync(HttpClient client, Guid serviceId, Guid? staffId, DateOnly date)
    {
        var url = $"/api/availability?serviceId={serviceId}&date={date:yyyy-MM-dd}" + (staffId is null ? string.Empty : $"&staffId={staffId}");
        return (await client.GetFromJsonAsync<AvailabilityResponse>(url, RandevuApiFactory.Json, Ct))!;
    }

    public static async Task<JsonElement> ProblemAsync(HttpResponseMessage response, HttpStatusCode expected)
    {
        Assert.Equal(expected, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        return await response.Content.ReadFromJsonAsync<JsonElement>(Ct);
    }
}
