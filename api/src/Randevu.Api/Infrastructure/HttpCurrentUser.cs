using System.Security.Claims;
using Randevu.Application.Abstractions;
using Randevu.Domain.Entities;

namespace Randevu.Api.Infrastructure;

internal sealed class HttpCurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    private ClaimsPrincipal? Principal => accessor.HttpContext?.User;

    public Guid? UserId => Guid.TryParse(Principal?.FindFirstValue("sub"), out var id) ? id : null;

    public UserRole? Role => Enum.TryParse<UserRole>(Principal?.FindFirstValue("role"), out var role) ? role : null;

    public Guid? StaffId => Guid.TryParse(Principal?.FindFirstValue("staff_id"), out var id) ? id : null;
}
