using Randevu.Domain.Entities;

namespace Randevu.Application.Abstractions;

public interface ICurrentUser
{
    Guid? UserId { get; }
    UserRole? Role { get; }
    Guid? StaffId { get; }
}

public static class CurrentUserExtensions
{
    public static Guid RequireUserId(this ICurrentUser user) =>
        user.UserId ?? throw new Common.AuthenticationFailedException("not_authenticated", "Oturum açmanız gerekiyor.");
}
