using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Randevu.Infrastructure.Persistence.Seed;

namespace Randevu.Infrastructure.Persistence;

public static partial class DatabaseInitializer
{
    /// <summary>Applies pending migrations and seeds demo data when the database is empty.</summary>
    public static async Task InitializeDatabaseAsync(this IServiceProvider services, CancellationToken ct = default)
    {
        await using var scope = services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger(typeof(DatabaseInitializer));

        if (db.Database.IsSqlite())
        {
            EnsureSqliteDirectory(db.Database.GetConnectionString());
        }

        await db.Database.MigrateAsync(ct);

        if (db.Database.IsSqlite() && !IsInMemory(db.Database.GetConnectionString()))
        {
            // WAL lets readers proceed while a booking transaction holds the write lock.
            await db.Database.ExecuteSqlRawAsync("PRAGMA journal_mode=WAL;", ct);
        }

        LogMigrated(logger, db.Database.ProviderName ?? "unknown");
        await scope.ServiceProvider.GetRequiredService<DemoDataSeeder>().SeedAsync(ct);
    }

    private static bool IsInMemory(string? connectionString)
    {
        if (string.IsNullOrEmpty(connectionString))
        {
            return false;
        }

        var builder = new SqliteConnectionStringBuilder(connectionString);
        return builder.Mode == SqliteOpenMode.Memory
               || builder.DataSource.Equals(":memory:", StringComparison.OrdinalIgnoreCase)
               || builder.DataSource.Contains("mode=memory", StringComparison.OrdinalIgnoreCase);
    }

    private static void EnsureSqliteDirectory(string? connectionString)
    {
        if (string.IsNullOrEmpty(connectionString) || IsInMemory(connectionString))
        {
            return;
        }

        var dataSource = new SqliteConnectionStringBuilder(connectionString).DataSource;
        var directory = Path.GetDirectoryName(Path.GetFullPath(dataSource));
        if (!string.IsNullOrEmpty(directory))
        {
            Directory.CreateDirectory(directory);
        }
    }

    [LoggerMessage(Level = LogLevel.Information, Message = "Database migrated ({Provider})")]
    private static partial void LogMigrated(ILogger logger, string provider);
}
