namespace Randevu.Application.Features.Catalog;

public sealed record ServiceDto(Guid Id, string Name, string? Description, int DurationMinutes, decimal Price);

public sealed record StaffDto(
    Guid Id,
    string FullName,
    string Title,
    string Color,
    string? Bio,
    IReadOnlyList<Guid> ServiceIds,
    IReadOnlyList<DayOfWeek> WorkingDays);

public sealed record BusinessInfoDto(
    string Name,
    string Branch,
    string Address,
    string Phone,
    string TimeZone,
    IReadOnlyList<DayOfWeek> OpenDays,
    TimeOnly OpeningTime,
    TimeOnly ClosingTime,
    int SlotStepMinutes,
    int CancellationNoticeHours,
    int BookingHorizonDays,
    DateOnly Today);
