namespace Randevu.Infrastructure.Persistence;

public sealed class DatabaseOptions
{
    public const string SectionName = "Database";

    /// <summary><c>Sqlite</c> (default) or <c>Postgres</c>.</summary>
    public string Provider { get; set; } = "Sqlite";

    public bool IsPostgres => string.Equals(Provider, "Postgres", StringComparison.OrdinalIgnoreCase)
                              || string.Equals(Provider, "PostgreSQL", StringComparison.OrdinalIgnoreCase);
}
