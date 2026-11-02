using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Randevu.Application.Abstractions;
using Randevu.Application.Common;
using Randevu.Application.Features.Availability;
using Randevu.Domain.Entities;

namespace Randevu.Infrastructure.Persistence.Seed;

/// <summary>
/// Seeds "Atölye Kuaför &amp; Bakım — Kadıköy". Appointments are generated relative to the
/// moment of seeding (last 4 weeks + next 2 weeks) with a fixed random seed, so dashboards
/// always look alive and the data is reproducible for a given day.
/// </summary>
public sealed partial class DemoDataSeeder(
    AppDbContext db,
    IPasswordHasher hasher,
    BusinessClock clock,
    AvailabilityEngine engine,
    IOptions<SeedOptions> seedOptions,
    ILogger<DemoDataSeeder> logger)
{
    public const string DemoPassword = "Demo123!";
    public const string AdminEmail = "admin@randevu.demo";
    public const string StaffEmail = "personel@randevu.demo";
    public const string CustomerEmail = "musteri@randevu.demo";

    private static readonly string[] CustomerNames =
    [
        "Ayşe Çelik", "Mehmet Öztürk", "Fatma Koç", "Mustafa Aslan", "Hülya Doğan", "Ahmet Kılıç",
        "Seda Arslan", "Burak Çetin", "Gizem Kara", "Oğuz Kurt", "Derya Özdemir", "Serkan Polat",
        "Ebru Şimşek", "Kerem Erdem", "Tuğba Güneş", "Onur Aktaş", "İpek Yalçın", "Barış Tekin",
        "Nazlı Ünal", "Cem Bulut", "Melis Korkmaz", "Hakan Çakır", "Özge Uçar", "Umut Taş",
    ];

    public async Task SeedAsync(CancellationToken ct = default)
    {
        var options = seedOptions.Value;
        if (!options.Enabled || await db.Users.AnyAsync(ct))
        {
            return;
        }

        var now = clock.UtcNow;
        var random = new Random(options.RandomSeed);

        // ---- Users -------------------------------------------------------------------------
        var admin = NewUser(AdminEmail, "Selin Aksoy", UserRole.Admin, "+90 532 410 22 18", now);
        var staffUser = NewUser(StaffEmail, "Emre Yıldız", UserRole.Staff, "+90 541 285 63 07", now);
        var demoCustomer = NewUser(CustomerEmail, "Deniz Yılmaz", UserRole.Customer, "+90 535 718 40 62", now);
        foreach (var u in new[] { admin, staffUser, demoCustomer })
        {
            u.PasswordHash = hasher.Hash(u, DemoPassword);
        }

        var customers = new List<User>();
        var sharedHash = string.Empty;
        foreach (var name in CustomerNames)
        {
            var customer = NewUser(EmailFor(name), name, UserRole.Customer, RandomPhone(random), now.AddDays(-random.Next(40, 400)));
            sharedHash = sharedHash.Length == 0 ? hasher.Hash(customer, DemoPassword) : sharedHash;
            customer.PasswordHash = sharedHash;
            customers.Add(customer);
        }

        db.Users.AddRange([admin, staffUser, demoCustomer, .. customers]);

        // ---- Services ----------------------------------------------------------------------
        Service Svc(string name, int minutes, decimal price, int order, string description) => new()
        {
            Name = name, DurationMinutes = minutes, Price = price, SortOrder = order, Description = description, CreatedAtUtc = now,
        };

        var haircut = Svc("Saç Kesimi", 45, 650m, 1, "Yıkama, kesim ve şekillendirme dahil.");
        var beard = Svc("Sakal Tıraşı", 30, 350m, 2, "Ustura ile tıraş, sıcak havlu ve bakım yağı.");
        var color = Svc("Saç Boyama", 120, 1850m, 3, "Tek renk boya, renk danışmanlığı ve bakım maskesi.");
        var blowDry = Svc("Fön", 30, 400m, 4, "Yıkama ve fön; özel gün öncesi için ideal.");
        var facial = Svc("Cilt Bakımı", 60, 1200m, 5, "Temizlik, peeling ve nem maskesiyle klasik bakım.");
        var manicure = Svc("Manikür", 45, 550m, 6, "Tırnak şekillendirme, kütikül bakımı ve kalıcı oje.");
        Service[] services = [haircut, beard, color, blowDry, facial, manicure];
        db.Services.AddRange(services);

        // ---- Staff -------------------------------------------------------------------------
        // Colors follow the validated categorical order (blue, orange, aqua, yellow) by name order.
        var can = NewStaff("Can Demir", "Berber", "#2a78d6", "Klasik kesimler ve keskin sakal hatları.", now,
            [haircut, beard],
            Week(new TimeOnly(10, 0), new TimeOnly(19, 0), new TimeOnly(14, 0), new TimeOnly(14, 30)));
        var elif = NewStaff("Elif Kaya", "Cilt ve Tırnak Bakım Uzmanı", "#eb6834", "Medikal cilt bakımı ve kalıcı oje konusunda 8 yıllık deneyim.", now,
            [facial, manicure, blowDry],
            [
                .. Days([DayOfWeek.Tuesday, DayOfWeek.Wednesday, DayOfWeek.Thursday, DayOfWeek.Friday],
                    new TimeOnly(12, 0), new TimeOnly(20, 0), new TimeOnly(16, 0), new TimeOnly(16, 30)),
                .. Days([DayOfWeek.Saturday, DayOfWeek.Sunday],
                    new TimeOnly(10, 0), new TimeOnly(18, 0), new TimeOnly(13, 30), new TimeOnly(14, 0)),
            ]);
        var emre = NewStaff("Emre Yıldız", "Kıdemli Berber", "#1baf7a", "Atölye'nin kurucu ustası; modern kesimler ve sakal tasarımı.", now,
            [haircut, beard, blowDry],
            Week(new TimeOnly(9, 0), new TimeOnly(18, 0), new TimeOnly(13, 0), new TimeOnly(13, 45)));
        emre.UserId = staffUser.Id;
        var zeynep = NewStaff("Zeynep Aydın", "Renk ve Kesim Uzmanı", "#eda100", "Balyaj, ombre ve renk düzeltme uzmanı. Perşembe günleri izinli.", now,
            [haircut, color, blowDry],
            Days([DayOfWeek.Tuesday, DayOfWeek.Wednesday, DayOfWeek.Friday, DayOfWeek.Saturday, DayOfWeek.Sunday],
                new TimeOnly(11, 0), new TimeOnly(20, 0), new TimeOnly(15, 0), new TimeOnly(15, 30)));
        StaffMember[] staff = [can, elif, emre, zeynep];

        var today = clock.Today;
        AddTimeOff(can, today, 3, 12, "Yıllık izin");
        AddTimeOff(elif, today, -12, -6, "Eğitim semineri");
        db.StaffMembers.AddRange(staff);

        // ---- Appointments ------------------------------------------------------------------
        var appointments = new List<Appointment>();
        if (options.SampleAppointments)
        {
            var weights = new Dictionary<Service, int>
            {
                [haircut] = 40, [beard] = 22, [blowDry] = 14, [color] = 9, [facial] = 9, [manicure] = 12,
            };
            foreach (var member in staff)
            {
                var offered = member.ServiceLinks.Select(l => services.First(s => s.Id == l.ServiceId)).ToList();
                for (var date = today.AddDays(-28); date <= today.AddDays(14); date = date.AddDays(1))
                {
                    GenerateDay(member, offered, weights, date, today, now, customers, random, appointments);
                }
            }

            AssignDemoCustomer(appointments, demoCustomer, now);
            db.Appointments.AddRange(appointments);
        }

        await db.SaveChangesAsync(ct);
        LogSeeded(logger, services.Length, staff.Length, customers.Count + 1, appointments.Count);
    }

    private void GenerateDay(
        StaffMember member,
        List<Service> offered,
        Dictionary<Service, int> weights,
        DateOnly date,
        DateOnly today,
        DateTime now,
        List<User> customers,
        Random random,
        List<Appointment> sink)
    {
        var shift = engine.GetShift(member, date);
        if (shift is null)
        {
            return;
        }

        var weekend = date.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday;
        var distance = date.DayNumber - today.DayNumber;
        var fill = distance switch
        {
            < 0 => weekend ? 0.86 : 0.68,
            0 => 0.7,
            <= 7 => weekend ? 0.62 : 0.45,
            _ => weekend ? 0.38 : 0.24,
        };

        var t = shift.Start;
        while (t < shift.End)
        {
            if (shift.HasBreak && t >= shift.BreakStart && t < shift.BreakEnd)
            {
                t = shift.BreakEnd!.Value;
                continue;
            }

            if (random.NextDouble() > fill)
            {
                t = t.AddMinutes(random.NextDouble() < 0.6 ? 15 : 30);
                continue;
            }

            var service = Pick(offered, weights, random);
            var end = t.AddMinutes(service.DurationMinutes);
            var crossesBreak = shift.HasBreak && t < shift.BreakEnd && end > shift.BreakStart;
            if (end > shift.End || end < t || crossesBreak)
            {
                t = t.AddMinutes(15);
                continue;
            }

            var startUtc = clock.ToUtc(date, t);
            var endUtc = startUtc.AddMinutes(service.DurationMinutes);
            var roll = random.NextDouble();
            var status = endUtc <= now
                ? roll switch { < 0.05 => AppointmentStatus.Cancelled, < 0.08 => AppointmentStatus.NoShow, _ => AppointmentStatus.Completed }
                : roll < 0.06 ? AppointmentStatus.Cancelled : AppointmentStatus.Confirmed;

            var createdAt = startUtc.AddHours(-random.Next(6, 24 * 12));
            if (createdAt > now)
            {
                createdAt = now.AddHours(-random.Next(1, 48));
            }

            sink.Add(new Appointment
            {
                CustomerId = customers[random.Next(customers.Count)].Id,
                StaffMemberId = member.Id,
                ServiceId = service.Id,
                StartUtc = startUtc,
                EndUtc = endUtc,
                Price = service.Price,
                Status = status,
                CreatedAtUtc = createdAt,
                CancelledAtUtc = status == AppointmentStatus.Cancelled ? Min(createdAt.AddHours(random.Next(2, 72)), Min(startUtc.AddHours(-3), now)) : null,
            });

            t = end.AddMinutes(random.NextDouble() < 0.25 ? 15 : 0);
            if (t < end)
            {
                break; // TimeOnly wrapped past midnight.
            }
        }
    }

    /// <summary>Gives the demo customer a believable history: 3 visits, 1 cancellation, 2 upcoming.</summary>
    private static void AssignDemoCustomer(List<Appointment> all, User demo, DateTime now)
    {
        var usedDays = new HashSet<DateOnly>();
        void Take(Func<Appointment, bool> predicate, int count)
        {
            foreach (var a in all.Where(predicate).Where(a => usedDays.Add(DateOnly.FromDateTime(a.StartUtc))).Take(count))
            {
                a.CustomerId = demo.Id;
            }
        }

        Take(a => a.Status == AppointmentStatus.Completed && a.StartUtc < now.AddDays(-20), 1);
        Take(a => a.Status == AppointmentStatus.Completed && a.StartUtc > now.AddDays(-14) && a.StartUtc < now.AddDays(-9), 1);
        Take(a => a.Status == AppointmentStatus.Completed && a.StartUtc > now.AddDays(-6), 1);
        Take(a => a.Status == AppointmentStatus.Cancelled && a.StartUtc < now, 1);
        Take(a => a.Status == AppointmentStatus.Confirmed && a.StartUtc > now.AddDays(2) && a.StartUtc < now.AddDays(5), 1);
        Take(a => a.Status == AppointmentStatus.Confirmed && a.StartUtc > now.AddDays(8), 1);
    }

    private static Service Pick(List<Service> offered, Dictionary<Service, int> weights, Random random)
    {
        var total = offered.Sum(s => weights[s]);
        var roll = random.Next(total);
        foreach (var s in offered)
        {
            roll -= weights[s];
            if (roll < 0)
            {
                return s;
            }
        }

        return offered[^1];
    }

    private void AddTimeOff(StaffMember member, DateOnly today, int fromOffset, int toOffset, string reason)
    {
        for (var d = today.AddDays(fromOffset); d <= today.AddDays(toOffset); d = d.AddDays(1))
        {
            if (engine.GetShift(member, d) is not null)
            {
                member.TimeOff.Add(new StaffTimeOff { StaffMemberId = member.Id, Date = d, Reason = reason });
                return;
            }
        }
    }

    private static StaffMember NewStaff(
        string name, string title, string color, string bio, DateTime now, Service[] services, List<WorkingHours> hours)
    {
        var member = new StaffMember { FullName = name, Title = title, Color = color, Bio = bio, CreatedAtUtc = now };
        member.ServiceLinks.AddRange(services.Select(s => new StaffService { StaffMemberId = member.Id, ServiceId = s.Id }));
        hours.ForEach(h => h.StaffMemberId = member.Id);
        member.WorkingHours.AddRange(hours);
        return member;
    }

    private static List<WorkingHours> Week(TimeOnly start, TimeOnly end, TimeOnly breakStart, TimeOnly breakEnd) =>
        Days(
            [DayOfWeek.Tuesday, DayOfWeek.Wednesday, DayOfWeek.Thursday, DayOfWeek.Friday, DayOfWeek.Saturday, DayOfWeek.Sunday],
            start, end, breakStart, breakEnd);

    private static List<WorkingHours> Days(DayOfWeek[] days, TimeOnly start, TimeOnly end, TimeOnly breakStart, TimeOnly breakEnd) =>
        days.Select(d => new WorkingHours { DayOfWeek = d, Start = start, End = end, BreakStart = breakStart, BreakEnd = breakEnd }).ToList();

    private static User NewUser(string email, string name, UserRole role, string phone, DateTime createdAt) => new()
    {
        Email = email,
        NormalizedEmail = User.Normalize(email),
        FullName = name,
        Phone = phone,
        Role = role,
        CreatedAtUtc = createdAt,
    };

    private static string EmailFor(string fullName)
    {
        var ascii = fullName.ToLowerInvariant()
            .Replace('ç', 'c').Replace('ğ', 'g').Replace('ı', 'i').Replace('ö', 'o').Replace('ş', 's').Replace('ü', 'u')
            .Replace("i̇", "i", StringComparison.Ordinal);
        return ascii.Replace(' ', '.') + "@example.com";
    }

    private static string RandomPhone(Random random) =>
        $"+90 5{random.Next(30, 56)} {random.Next(100, 999)} {random.Next(10, 99)} {random.Next(10, 99)}";

    private static DateTime Min(DateTime a, DateTime b) => a < b ? a : b;

    [LoggerMessage(Level = LogLevel.Information, Message = "Seeded demo data: {Services} services, {Staff} staff, {Customers} customers, {Appointments} appointments")]
    private static partial void LogSeeded(ILogger logger, int services, int staff, int customers, int appointments);
}
