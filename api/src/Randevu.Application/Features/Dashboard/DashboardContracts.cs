namespace Randevu.Application.Features.Dashboard;

/// <summary>A KPI for the selected period compared with the period right before it.</summary>
public sealed record KpiDto(decimal Value, decimal Previous, double? ChangePercent);

public sealed record PopularServiceDto(Guid ServiceId, string Name, int Count, double Share);

public sealed record StaffPerformanceDto(
    Guid StaffId,
    string FullName,
    string Color,
    int Appointments,
    decimal Revenue,
    int BookedMinutes,
    int AvailableMinutes,
    double Occupancy);

public sealed record ServiceMixDto(Guid ServiceId, string Name, int Count, decimal Revenue);

public sealed record DailyPointDto(
    DateOnly Date,
    bool IsOpen,
    bool IsFuture,
    decimal Revenue,
    int Appointments,
    int Cancelled,
    double Occupancy);

/// <param name="RangeDays">Seçilen dönem uzunluğu (gün). Dönem, bugünden önceki tamamlanmış günlerdir.</param>
/// <param name="Revenue">Ciro (₺): iptal ve gelmedi hariç gerçekleşen randevular.</param>
/// <param name="Appointments">İptal edilmemiş randevu sayısı.</param>
/// <param name="Occupancy">Doluluk oranı (%): dolu dakika / personelin çalışma dakikası.</param>
/// <param name="Daily">Son 4 hafta ve önümüzdeki 2 hafta için günlük seri.</param>
public sealed record DashboardDto(
    int RangeDays,
    DateOnly From,
    DateOnly To,
    DateOnly Today,
    KpiDto Revenue,
    KpiDto Appointments,
    KpiDto Occupancy,
    KpiDto AverageTicket,
    PopularServiceDto? PopularService,
    double CancellationRate,
    int TodayAppointments,
    int NextSevenDaysAppointments,
    decimal NextSevenDaysRevenue,
    IReadOnlyList<StaffPerformanceDto> Staff,
    IReadOnlyList<ServiceMixDto> Services,
    IReadOnlyList<DailyPointDto> Daily);
