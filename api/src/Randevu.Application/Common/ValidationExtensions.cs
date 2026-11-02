using FluentValidation;

namespace Randevu.Application.Common;

public static class ValidationExtensions
{
    /// <summary>Validates and throws <see cref="ValidationException"/> (mapped to HTTP 400).</summary>
    public static async Task EnsureValidAsync<T>(this IValidator<T> validator, T instance, CancellationToken ct)
    {
        var result = await validator.ValidateAsync(instance, ct);
        if (!result.IsValid)
        {
            throw new ValidationException(result.Errors);
        }
    }

    public static IRuleBuilderOptions<T, TimeOnly> OnQuarterHour<T>(this IRuleBuilder<T, TimeOnly> rule) =>
        rule.Must(t => t.Minute % 15 == 0 && t.Second == 0).WithMessage("Saat 15 dakikalık aralıklarla olmalı.");

    public static IRuleBuilderOptions<T, string> HexColor<T>(this IRuleBuilder<T, string> rule) =>
        rule.Matches("^#[0-9a-fA-F]{6}$").WithMessage("Renk #RRGGBB biçiminde olmalı.");
}
