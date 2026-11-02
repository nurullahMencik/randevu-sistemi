using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Randevu.Application.Abstractions;
using Randevu.Domain.Entities;

namespace Randevu.Api.Infrastructure;

internal static class ApiServiceCollectionExtensions
{
    public const string AdminPolicy = "Admin";
    public const string StaffPolicy = "Staff";
    public const string CustomerPolicy = "Customer";

    private static readonly string[] DefaultOrigins =
    [
        "https://nurullahmencik.github.io",
        "http://localhost:5304",
        "http://127.0.0.1:5304",
        "http://localhost:5173",
    ];

    public static IServiceCollection AddApi(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUser, HttpCurrentUser>();

        services.ConfigureHttpJsonOptions(o => o.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));

        services.AddProblemDetails(o => o.CustomizeProblemDetails = ctx =>
        {
            ctx.ProblemDetails.Instance ??= $"{ctx.HttpContext.Request.Method} {ctx.HttpContext.Request.Path}";
            ctx.ProblemDetails.Extensions.TryAdd("traceId", ctx.HttpContext.TraceIdentifier);
            if (!ctx.ProblemDetails.Extensions.ContainsKey("code"))
            {
                ctx.ProblemDetails.Extensions["code"] = ctx.ProblemDetails.Status switch
                {
                    StatusCodes.Status401Unauthorized => "not_authenticated",
                    StatusCodes.Status403Forbidden => "forbidden",
                    StatusCodes.Status404NotFound => "not_found",
                    StatusCodes.Status429TooManyRequests => "rate_limited",
                    _ => "error",
                };
            }
        });
        services.AddExceptionHandler<ProblemExceptionHandler>();

        services.AddAuthorizationBuilder()
            .AddPolicy(AdminPolicy, p => p.RequireRole(nameof(UserRole.Admin)))
            .AddPolicy(StaffPolicy, p => p.RequireRole(nameof(UserRole.Staff)))
            .AddPolicy(CustomerPolicy, p => p.RequireRole(nameof(UserRole.Customer)));

        services.AddCors(o => o.AddDefaultPolicy(p => p
            .WithOrigins(ReadOrigins(configuration))
            .AllowAnyHeader()
            .AllowAnyMethod()
            .WithExposedHeaders("Retry-After")
            .SetPreflightMaxAge(TimeSpan.FromHours(1))));

        services.AddOptions<RateLimitingOptions>().Bind(configuration.GetSection(RateLimitingOptions.SectionName));
        services.AddRateLimiter(o =>
        {
            o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            o.AddPolicy(RateLimitingOptions.AuthPolicy, http =>
            {
                var limits = http.RequestServices.GetRequiredService<IOptions<RateLimitingOptions>>().Value;
                return RateLimitPartition.GetFixedWindowLimiter(
                    http.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                    _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = limits.AuthPermitLimit,
                        Window = TimeSpan.FromSeconds(limits.AuthWindowSeconds),
                        QueueLimit = 0,
                    });
            });
            o.OnRejected = async (ctx, ct) =>
            {
                if (ctx.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
                {
                    ctx.HttpContext.Response.Headers.RetryAfter = ((int)Math.Ceiling(retryAfter.TotalSeconds)).ToString(System.Globalization.CultureInfo.InvariantCulture);
                }

                var problems = ctx.HttpContext.RequestServices.GetRequiredService<IProblemDetailsService>();
                await problems.WriteAsync(new ProblemDetailsContext
                {
                    HttpContext = ctx.HttpContext,
                    ProblemDetails = new ProblemDetails
                    {
                        Status = StatusCodes.Status429TooManyRequests,
                        Title = "Çok fazla istek",
                        Detail = "Kısa sürede çok fazla deneme yapıldı. Lütfen biraz bekleyip tekrar deneyin.",
                        Extensions = { ["code"] = "rate_limited" },
                    },
                });
            };
        });

        services.Configure<ForwardedHeadersOptions>(o =>
        {
            // Render (and most PaaS) terminate TLS at a proxy and forward the client IP.
            o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
            o.KnownIPNetworks.Clear();
            o.KnownProxies.Clear();
        });

        services.AddHealthChecks().AddCheck<DatabaseHealthCheck>("database");
        services.AddRandevuOpenApi();
        return services;
    }

    private static string[] ReadOrigins(IConfiguration configuration)
    {
        var section = configuration.GetSection("Cors:Origins");
        var values = section.Value is { Length: > 0 } single
            ? single.Split([',', ';', ' '], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            : section.Get<string[]>() ?? [];
        return values.Length > 0 ? values.Select(v => v.TrimEnd('/')).ToArray() : DefaultOrigins;
    }
}
