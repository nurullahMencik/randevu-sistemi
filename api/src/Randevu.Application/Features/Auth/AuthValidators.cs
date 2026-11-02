using FluentValidation;

namespace Randevu.Application.Features.Auth;

public sealed class RegisterRequestValidator : AbstractValidator<RegisterRequest>
{
    public RegisterRequestValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().WithMessage("Ad soyad zorunlu.")
            .MinimumLength(3).WithMessage("Ad soyad en az 3 karakter olmalı.")
            .MaximumLength(80).WithMessage("Ad soyad en fazla 80 karakter olabilir.");
        RuleFor(x => x.Email).NotEmpty().WithMessage("E-posta zorunlu.")
            .EmailAddress().WithMessage("Geçerli bir e-posta adresi girin.")
            .MaximumLength(120);
        RuleFor(x => x.Password).NotEmpty().WithMessage("Parola zorunlu.")
            .MinimumLength(8).WithMessage("Parola en az 8 karakter olmalı.")
            .MaximumLength(128)
            .Matches("[A-Z]").WithMessage("Parola en az bir büyük harf içermeli.")
            .Matches("[a-z]").WithMessage("Parola en az bir küçük harf içermeli.")
            .Matches("[0-9]").WithMessage("Parola en az bir rakam içermeli.");
        RuleFor(x => x.Phone)
            .Matches(@"^\+?[0-9 ()-]{10,20}$").When(x => !string.IsNullOrWhiteSpace(x.Phone))
            .WithMessage("Geçerli bir telefon numarası girin.");
    }
}

public sealed class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty().WithMessage("E-posta zorunlu.").EmailAddress().WithMessage("Geçerli bir e-posta adresi girin.");
        RuleFor(x => x.Password).NotEmpty().WithMessage("Parola zorunlu.");
    }
}

public sealed class RefreshRequestValidator : AbstractValidator<RefreshRequest>
{
    public RefreshRequestValidator()
    {
        RuleFor(x => x.RefreshToken).NotEmpty().MaximumLength(256);
    }
}
