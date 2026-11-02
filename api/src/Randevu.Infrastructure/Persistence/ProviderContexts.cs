using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Npgsql;

namespace Randevu.Infrastructure.Persistence;

public sealed class SqliteAppDbContext(DbContextOptions<SqliteAppDbContext> options) : AppDbContext(options)
{
    private const int SqliteConstraint = 19;
    private const int SqliteConstraintUnique = 2067;
    private const int SqliteConstraintPrimaryKey = 1555;

    protected override bool IsUniqueConstraintViolation(DbUpdateException exception) =>
        exception.InnerException is SqliteException
        {
            SqliteErrorCode: SqliteConstraint,
            SqliteExtendedErrorCode: SqliteConstraintUnique or SqliteConstraintPrimaryKey,
        };
}

public sealed class PostgresAppDbContext(DbContextOptions<PostgresAppDbContext> options) : AppDbContext(options)
{
    protected override bool IsUniqueConstraintViolation(DbUpdateException exception) =>
        exception.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation };
}

/// <summary>Used by <c>dotnet ef</c> to create SQLite migrations.</summary>
public sealed class SqliteDesignTimeFactory : IDesignTimeDbContextFactory<SqliteAppDbContext>
{
    public SqliteAppDbContext CreateDbContext(string[] args) =>
        new(new DbContextOptionsBuilder<SqliteAppDbContext>().UseSqlite("Data Source=design.db").Options);
}

/// <summary>Used by <c>dotnet ef</c> to create PostgreSQL migrations (no live server needed).</summary>
public sealed class PostgresDesignTimeFactory : IDesignTimeDbContextFactory<PostgresAppDbContext>
{
    public PostgresAppDbContext CreateDbContext(string[] args) =>
        new(new DbContextOptionsBuilder<PostgresAppDbContext>().UseNpgsql("Host=localhost;Database=randevu").Options);
}
