using Randevu.Application.Features.Appointments;

namespace Randevu.Application.Features.Admin;

public sealed record AdminServiceDto(
    Guid Id,
    string Name,
    string? Description,
    int DurationMinutes,
    decimal Price,
    bool IsActive,
    int SortOrder,
    int StaffCount,
    int UpcomingAppointments);

public sealed record UpsertServiceRequest(
    string Name,
    string? Description,
    int DurationMinutes,
    decimal Price,
    bool IsActive,
    int SortOrder);

public sealed record AdminStaffDto(
    Guid Id,
    string FullName,
    string Title,
    string Color,
    string? Bio,
    bool IsActive,
    string? Email,
    IReadOnlyList<Guid> ServiceIds,
    IReadOnlyList<WorkingHoursDto> WorkingHours,
    IReadOnlyList<TimeOffDto> TimeOff,
    int UpcomingAppointments);

public sealed record UpsertStaffRequest(
    string FullName,
    string Title,
    string Color,
    string? Bio,
    bool IsActive,
    IReadOnlyList<Guid> ServiceIds,
    IReadOnlyList<WorkingHoursDto> WorkingHours,
    IReadOnlyList<TimeOffDto>? TimeOff);
