namespace Randevu.Application.Features.Availability;

/// <summary>A bookable start time.</summary>
/// <param name="StartUtc">Başlangıç (UTC).</param>
/// <param name="EndUtc">Bitiş (UTC).</param>
/// <param name="LocalTime">İşletme saatine göre başlangıç, ör. <c>14:30</c>.</param>
/// <param name="StaffIds">Bu saatte müsait olan personeller.</param>
public sealed record SlotDto(DateTime StartUtc, DateTime EndUtc, string LocalTime, IReadOnlyList<Guid> StaffIds);

public sealed record AvailabilityResponse(
    DateOnly Date,
    Guid ServiceId,
    Guid? StaffId,
    string TimeZone,
    IReadOnlyList<SlotDto> Slots);

public sealed record DayAvailabilityDto(DateOnly Date, bool IsOpen, int AvailableSlots);
