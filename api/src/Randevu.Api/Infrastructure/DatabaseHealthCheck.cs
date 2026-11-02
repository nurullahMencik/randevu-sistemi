using Microsoft.Extensions.Diagnostics.HealthChecks;
using Randevu.Infrastructure.Persistence;

namespace Randevu.Api.Infrastructure;

internal sealed class DatabaseHealthCheck(AppDbContext db) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default) =>
        await db.Database.CanConnectAsync(cancellationToken)
            ? HealthCheckResult.Healthy("Database reachable")
            : HealthCheckResult.Unhealthy("Database unreachable");
}
