using Randevu.Domain.Entities;

namespace Randevu.Application.Features.Auth;

/// <summary>New customer registration.</summary>
/// <param name="FullName">Ad soyad.</param>
/// <param name="Email">E-posta adresi; giriş için kullanılır.</param>
/// <param name="Password">En az 8 karakter; büyük harf, küçük harf ve rakam içermeli.</param>
/// <param name="Phone">İsteğe bağlı telefon numarası.</param>
public sealed record RegisterRequest(string FullName, string Email, string Password, string? Phone);

public sealed record LoginRequest(string Email, string Password);

public sealed record RefreshRequest(string RefreshToken);

public sealed record UserDto(Guid Id, string Email, string FullName, string? Phone, UserRole Role, Guid? StaffId);

/// <summary>Issued on login, registration and refresh.</summary>
/// <param name="AccessToken">JWT, 15 dakika geçerli. <c>Authorization: Bearer</c> başlığında gönderilir.</param>
/// <param name="AccessTokenExpiresAtUtc">Erişim belirtecinin bitiş zamanı (UTC).</param>
/// <param name="RefreshToken">Tek kullanımlık yenileme belirteci. Her yenilemede yenisiyle değişir.</param>
/// <param name="RefreshTokenExpiresAtUtc">Yenileme belirtecinin bitiş zamanı (UTC).</param>
/// <param name="User">Oturum sahibi.</param>
public sealed record AuthResponse(
    string AccessToken,
    DateTime AccessTokenExpiresAtUtc,
    string RefreshToken,
    DateTime RefreshTokenExpiresAtUtc,
    UserDto User);
