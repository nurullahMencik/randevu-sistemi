using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Randevu.Domain.Entities;

namespace Randevu.Infrastructure.Persistence.Configurations;

internal sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> b)
    {
        b.Property(x => x.Email).HasMaxLength(120);
        b.Property(x => x.NormalizedEmail).HasMaxLength(120);
        b.Property(x => x.FullName).HasMaxLength(80);
        b.Property(x => x.Phone).HasMaxLength(24);
        b.Property(x => x.PasswordHash).HasMaxLength(256);
        b.HasIndex(x => x.NormalizedEmail).IsUnique();
    }
}

internal sealed class ServiceConfiguration : IEntityTypeConfiguration<Service>
{
    public void Configure(EntityTypeBuilder<Service> b)
    {
        b.Property(x => x.Name).HasMaxLength(80);
        b.Property(x => x.Description).HasMaxLength(300);
        b.Property(x => x.Price).HasPrecision(10, 2);
        b.HasIndex(x => x.Name).IsUnique();
    }
}

internal sealed class StaffMemberConfiguration : IEntityTypeConfiguration<StaffMember>
{
    public void Configure(EntityTypeBuilder<StaffMember> b)
    {
        b.Property(x => x.FullName).HasMaxLength(80);
        b.Property(x => x.Title).HasMaxLength(80);
        b.Property(x => x.Color).HasMaxLength(7);
        b.Property(x => x.Bio).HasMaxLength(300);

        // Optimistic lock taken by every booking for this staff member.
        b.Property(x => x.BookingVersion).IsConcurrencyToken();

        b.HasOne(x => x.User).WithOne().HasForeignKey<StaffMember>(x => x.UserId).OnDelete(DeleteBehavior.SetNull);
        b.HasIndex(x => x.UserId).IsUnique();
        b.HasMany(x => x.WorkingHours).WithOne().HasForeignKey(x => x.StaffMemberId).OnDelete(DeleteBehavior.Cascade);
        b.HasMany(x => x.TimeOff).WithOne().HasForeignKey(x => x.StaffMemberId).OnDelete(DeleteBehavior.Cascade);
        b.HasMany(x => x.ServiceLinks).WithOne(x => x.StaffMember).HasForeignKey(x => x.StaffMemberId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class StaffServiceConfiguration : IEntityTypeConfiguration<StaffService>
{
    public void Configure(EntityTypeBuilder<StaffService> b)
    {
        b.HasKey(x => new { x.StaffMemberId, x.ServiceId });
        b.HasOne(x => x.Service).WithMany(x => x.StaffLinks).HasForeignKey(x => x.ServiceId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class WorkingHoursConfiguration : IEntityTypeConfiguration<WorkingHours>
{
    public void Configure(EntityTypeBuilder<WorkingHours> b)
    {
        b.HasIndex(x => new { x.StaffMemberId, x.DayOfWeek }).IsUnique();
    }
}

internal sealed class StaffTimeOffConfiguration : IEntityTypeConfiguration<StaffTimeOff>
{
    public void Configure(EntityTypeBuilder<StaffTimeOff> b)
    {
        b.Property(x => x.Reason).HasMaxLength(120);
        b.HasIndex(x => new { x.StaffMemberId, x.Date }).IsUnique();
    }
}

internal sealed class AppointmentConfiguration : IEntityTypeConfiguration<Appointment>
{
    public void Configure(EntityTypeBuilder<Appointment> b)
    {
        b.Ignore(x => x.Range);
        b.Ignore(x => x.BlocksTime);
        b.Ignore(x => x.CustomerCancellationDeadlineUtc);
        b.Property(x => x.Price).HasPrecision(10, 2);
        b.Property(x => x.Notes).HasMaxLength(500);
        b.Property(x => x.Version).IsConcurrencyToken();

        b.HasOne(x => x.Customer).WithMany().HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.StaffMember).WithMany().HasForeignKey(x => x.StaffMemberId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.Service).WithMany().HasForeignKey(x => x.ServiceId).OnDelete(DeleteBehavior.Restrict);

        // Database-level guarantee: one active appointment per staff member per start time.
        // The filter uses quoted identifiers and a string literal, valid on SQLite and PostgreSQL.
        b.HasIndex(x => new { x.StaffMemberId, x.StartUtc })
            .IsUnique()
            .HasFilter("\"Status\" <> 'Cancelled'")
            .HasDatabaseName("UX_Appointments_Staff_Start_Active");
        b.HasIndex(x => new { x.CustomerId, x.StartUtc });
        b.HasIndex(x => x.StartUtc);
    }
}

internal sealed class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> b)
    {
        b.Property(x => x.TokenHash).HasMaxLength(64);
        b.Property(x => x.ReplacedByTokenHash).HasMaxLength(64);
        b.Property(x => x.RevokedReason).HasMaxLength(32);

        // Rotation is "UPDATE ... WHERE RevokedAtUtc IS NULL": a token can be rotated once.
        b.Property(x => x.RevokedAtUtc).IsConcurrencyToken();

        b.HasIndex(x => x.TokenHash).IsUnique();
        b.HasIndex(x => x.FamilyId);
        b.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}
