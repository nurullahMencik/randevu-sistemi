using FluentValidation;
using Microsoft.Extensions.Options;
using Randevu.Application.Common;
using Randevu.Application.Features.Appointments;

namespace Randevu.Application.Features.Admin;

public sealed class UpsertServiceValidator : AbstractValidator<UpsertServiceRequest>
{
    public UpsertServiceValidator()
    {
        RuleFor(x => x.Name).NotEmpty().WithMessage("Hizmet adı zorunlu.")
            .MaximumLength(80).WithMessage("Hizmet adı en fazla 80 karakter olabilir.");
        RuleFor(x => x.Description).MaximumLength(300).WithMessage("Açıklama en fazla 300 karakter olabilir.");
        RuleFor(x => x.DurationMinutes)
            .InclusiveBetween(15, 480).WithMessage("Süre 15 ile 480 dakika arasında olmalı.")
            .Must(d => d % 15 == 0).WithMessage("Süre 15 dakikanın katı olmalı.");
        RuleFor(x => x.Price)
            .GreaterThanOrEqualTo(0).WithMessage("Fiyat negatif olamaz.")
            .LessThanOrEqualTo(100_000).WithMessage("Fiyat en fazla 100.000 ₺ olabilir.")
            .Must(p => decimal.Round(p, 2) == p).WithMessage("Fiyat en fazla iki ondalık basamak içerebilir.");
        RuleFor(x => x.SortOrder).InclusiveBetween(0, 1000);
    }
}

public sealed class UpsertStaffValidator : AbstractValidator<UpsertStaffRequest>
{
    public UpsertStaffValidator(IOptions<BusinessOptions> options)
    {
        var business = options.Value;

        RuleFor(x => x.FullName).NotEmpty().WithMessage("Ad soyad zorunlu.").MaximumLength(80);
        RuleFor(x => x.Title).NotEmpty().WithMessage("Unvan zorunlu.").MaximumLength(80);
        RuleFor(x => x.Color).NotEmpty().HexColor();
        RuleFor(x => x.Bio).MaximumLength(300);
        RuleFor(x => x.ServiceIds).NotEmpty().WithMessage("En az bir hizmet seçin.");
        RuleFor(x => x.WorkingHours).NotNull()
            .Must(h => h.Select(d => d.DayOfWeek).Distinct().Count() == h.Count)
            .WithMessage("Her gün için en fazla bir vardiya tanımlanabilir.");
        RuleForEach(x => x.WorkingHours).ChildRules(day =>
        {
            day.RuleFor(d => d.DayOfWeek)
                .Must(d => business.OpenDays.Contains(d))
                .WithMessage("İşletmenin kapalı olduğu güne vardiya tanımlanamaz.");
            day.RuleFor(d => d.Start).OnQuarterHour()
                .GreaterThanOrEqualTo(business.OpeningTime).WithMessage($"Vardiya {business.OpeningTime:HH\\:mm} öncesinde başlayamaz.");
            day.RuleFor(d => d.End).OnQuarterHour()
                .LessThanOrEqualTo(business.ClosingTime).WithMessage($"Vardiya {business.ClosingTime:HH\\:mm} sonrasında bitemez.")
                .GreaterThan(d => d.Start).WithMessage("Bitiş saati başlangıçtan sonra olmalı.");
            day.RuleFor(d => d)
                .Must(d => (d.BreakStart is null) == (d.BreakEnd is null))
                .WithMessage("Mola için başlangıç ve bitiş birlikte girilmeli.")
                .Must(d => d.BreakStart is null || (d.BreakStart >= d.Start && d.BreakEnd <= d.End && d.BreakEnd > d.BreakStart))
                .WithMessage("Mola vardiya içinde olmalı.")
                .Must(d => d.BreakStart is null || (d.BreakStart.Value.Minute % 15 == 0 && d.BreakEnd!.Value.Minute % 15 == 0))
                .WithMessage("Mola saatleri 15 dakikalık aralıklarla olmalı.")
                .OverridePropertyName("break");
        });
        RuleFor(x => x.TimeOff)
            .Must(t => t is null || t.Select(d => d.Date).Distinct().Count() == t.Count)
            .WithMessage("Aynı izin günü iki kez eklenemez.");
        RuleForEach(x => x.TimeOff).ChildRules(t => t.RuleFor(d => d.Reason).MaximumLength(120));
    }
}

public sealed class UpdateAppointmentStatusValidator : AbstractValidator<UpdateAppointmentStatusRequest>
{
    public UpdateAppointmentStatusValidator()
    {
        RuleFor(x => x.Status)
            .Must(s => s is Domain.Entities.AppointmentStatus.Completed or Domain.Entities.AppointmentStatus.NoShow)
            .WithMessage("Durum yalnızca Completed veya NoShow olabilir.");
    }
}
