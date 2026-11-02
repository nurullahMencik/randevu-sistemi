using FluentValidation;

namespace Randevu.Application.Features.Appointments;

public sealed class CreateAppointmentValidator : AbstractValidator<CreateAppointmentRequest>
{
    public CreateAppointmentValidator()
    {
        RuleFor(x => x.ServiceId).NotEmpty().WithMessage("Hizmet seçin.");
        RuleFor(x => x.StaffId).Must(id => id != Guid.Empty).When(x => x.StaffId is not null).WithMessage("Geçersiz personel.");
        RuleFor(x => x.StartUtc).NotEmpty().WithMessage("Başlangıç zamanı zorunlu.");
        RuleFor(x => x.Notes).MaximumLength(500).WithMessage("Not en fazla 500 karakter olabilir.");
    }
}
