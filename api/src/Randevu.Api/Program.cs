using System.Text.Json;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Randevu.Api.Endpoints;
using Randevu.Api.Infrastructure;
using Randevu.Application;
using Randevu.Infrastructure;
using Randevu.Infrastructure.Persistence;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// Render (and other PaaS) inject the port to listen on.
if (Environment.GetEnvironmentVariable("PORT") is { Length: > 0 } port)
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
}

builder.Logging.ClearProviders();
if (builder.Environment.IsDevelopment())
{
    builder.Logging.AddSimpleConsole(o =>
    {
        o.SingleLine = true;
        o.TimestampFormat = "HH:mm:ss ";
    });
}
else
{
    // One JSON object per line: easy to search and filter in Render's log explorer.
    builder.Logging.AddJsonConsole(o =>
    {
        o.IncludeScopes = true;
        o.UseUtcTimestamp = true;
        o.TimestampFormat = "yyyy-MM-ddTHH:mm:ss.fffZ";
    });
}

builder.Services
    .AddApplication(builder.Configuration)
    .AddInfrastructure(builder.Configuration)
    .AddApi(builder.Configuration);

var app = builder.Build();

app.UseForwardedHeaders();
app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseMiddleware<RequestLoggingMiddleware>();
app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapOpenApi().AllowAnonymous();
app.MapScalarApiReference("/scalar", options => options
    .WithTitle("Randevu API")
    .WithTheme(ScalarTheme.Kepler)
    .AddPreferredSecuritySchemes(OpenApiSetup.BearerScheme)
    .WithDefaultHttpClient(ScalarTarget.Shell, ScalarClient.Curl)
    .HideDeveloperTools())
    .AllowAnonymous();
app.MapGet("/", () => Results.Redirect("/scalar")).ExcludeFromDescription();

app.MapHealthChecks("/health", new HealthCheckOptions
{
    ResponseWriter = async (context, report) =>
    {
        context.Response.ContentType = "application/json";
        await JsonSerializer.SerializeAsync(context.Response.Body, new
        {
            status = report.Status.ToString(),
            durationMs = Math.Round(report.TotalDuration.TotalMilliseconds, 1),
            checks = report.Entries.ToDictionary(e => e.Key, e => e.Value.Status.ToString()),
        });
    },
}).DisableRateLimiting();

app.MapAuthEndpoints();
app.MapPublicEndpoints();
app.MapAppointmentEndpoints();
app.MapAdminEndpoints();

await app.Services.InitializeDatabaseAsync();
await app.RunAsync();

/// <summary>Entry point; partial so integration tests can use <c>WebApplicationFactory&lt;Program&gt;</c>.</summary>
public partial class Program;
