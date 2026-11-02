namespace Randevu.Application.Common;

public sealed class BusinessOptions
{
    public const string SectionName = "Business";

    public string Name { get; set; } = "Atölye Kuaför & Bakım";
    public string Branch { get; set; } = "Kadıköy";
    public string Address { get; set; } = "Caferağa Mah. Moda Cad. No: 48, Kadıköy / İstanbul";
    public string Phone { get; set; } = "+90 216 330 48 48";
    public string TimeZone { get; set; } = "Europe/Istanbul";
    public List<DayOfWeek> OpenDays { get; set; } =
    [
        DayOfWeek.Tuesday, DayOfWeek.Wednesday, DayOfWeek.Thursday,
        DayOfWeek.Friday, DayOfWeek.Saturday, DayOfWeek.Sunday,
    ];
    public TimeOnly OpeningTime { get; set; } = new(9, 0);
    public TimeOnly ClosingTime { get; set; } = new(20, 0);
    public int SlotStepMinutes { get; set; } = 15;
    public int BookingHorizonDays { get; set; } = 30;
    public int MinimumNoticeMinutes { get; set; }
    public int MaxUpcomingAppointmentsPerCustomer { get; set; } = 5;
}

public sealed class AuthOptions
{
    public const string SectionName = "Auth";

    public int RefreshTokenLifetimeDays { get; set; } = 14;
}
