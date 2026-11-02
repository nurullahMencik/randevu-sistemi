using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using Randevu.Application.Abstractions;
using Randevu.Domain.Entities;

namespace Randevu.Infrastructure.Persistence;

/// <summary>
/// Provider-agnostic model. Each database provider has a thin subclass
/// (<see cref="SqliteAppDbContext"/>, <see cref="PostgresAppDbContext"/>) so that each one owns
/// its own migration history.
/// </summary>
public abstract class AppDbContext(DbContextOptions options) : DbContext(options), IAppDbContext
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Service> Services => Set<Service>();
    public DbSet<StaffMember> StaffMembers => Set<StaffMember>();
    public DbSet<StaffService> StaffServices => Set<StaffService>();
    public DbSet<WorkingHours> WorkingHours => Set<WorkingHours>();
    public DbSet<StaffTimeOff> StaffTimeOff => Set<StaffTimeOff>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    /// <summary>Provider specific check for a unique-index violation.</summary>
    protected abstract bool IsUniqueConstraintViolation(DbUpdateException exception);

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            return await base.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException ex)
        {
            throw new ConcurrencyConflictException(ex);
        }
        catch (DbUpdateException ex) when (IsUniqueConstraintViolation(ex))
        {
            throw new UniqueConstraintViolationException(ex);
        }
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        // Everything is stored in UTC; make sure values read back are marked as UTC so they are
        // serialized with a trailing "Z" and accepted by Npgsql's timestamptz.
        configurationBuilder.Properties<DateTime>().HaveConversion<UtcDateTimeConverter>();
        configurationBuilder.Properties<DateTime?>().HaveConversion<NullableUtcDateTimeConverter>();
        configurationBuilder.Properties<AppointmentStatus>().HaveConversion<string>().HaveMaxLength(16);
        configurationBuilder.Properties<UserRole>().HaveConversion<string>().HaveMaxLength(16);
    }

    private sealed class UtcDateTimeConverter() : ValueConverter<DateTime, DateTime>(
        v => v.Kind == DateTimeKind.Utc ? v : v.ToUniversalTime(),
        v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

    private sealed class NullableUtcDateTimeConverter() : ValueConverter<DateTime?, DateTime?>(
        v => v.HasValue ? (v.Value.Kind == DateTimeKind.Utc ? v.Value : v.Value.ToUniversalTime()) : v,
        v => v.HasValue ? DateTime.SpecifyKind(v.Value, DateTimeKind.Utc) : v);
}
