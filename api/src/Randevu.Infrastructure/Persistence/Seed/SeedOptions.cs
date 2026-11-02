namespace Randevu.Infrastructure.Persistence.Seed;

public sealed class SeedOptions
{
    public const string SectionName = "Seed";

    /// <summary>Seed demo users, services and staff when the database is empty.</summary>
    public bool Enabled { get; set; } = true;

    /// <summary>Also generate realistic appointments for the last 4 and next 2 weeks.</summary>
    public bool SampleAppointments { get; set; } = true;

    public int RandomSeed { get; set; } = 1907;
}
