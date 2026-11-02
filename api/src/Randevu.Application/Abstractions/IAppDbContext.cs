using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Randevu.Domain.Entities;

namespace Randevu.Application.Abstractions;

/// <summary>
/// Unit of work used by the use cases. Implemented by the EF Core context in Infrastructure.
/// <see cref="SaveChangesAsync"/> translates provider specific errors into
/// <see cref="ConcurrencyConflictException"/> and <see cref="UniqueConstraintViolationException"/>.
/// </summary>
public interface IAppDbContext
{
    DbSet<User> Users { get; }
    DbSet<Service> Services { get; }
    DbSet<StaffMember> StaffMembers { get; }
    DbSet<StaffService> StaffServices { get; }
    DbSet<WorkingHours> WorkingHours { get; }
    DbSet<StaffTimeOff> StaffTimeOff { get; }
    DbSet<Appointment> Appointments { get; }
    DbSet<RefreshToken> RefreshTokens { get; }

    DatabaseFacade Database { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}

/// <summary>An optimistic concurrency check failed (the row changed since it was read).</summary>
public sealed class ConcurrencyConflictException(Exception inner)
    : Exception("The data was modified by another request.", inner);

/// <summary>A unique index rejected the write.</summary>
public sealed class UniqueConstraintViolationException(Exception inner)
    : Exception("A unique constraint was violated.", inner);
