using FluentValidation;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Randevu.Application.Abstractions;
using Randevu.Application.Common;
using Randevu.Domain.Common;

namespace Randevu.Api.Infrastructure;

/// <summary>
/// Maps exceptions to RFC 9457 problem details. Every problem carries a stable <c>code</c>
/// extension (e.g. <c>slot_taken</c>) that clients can translate, plus the <c>traceId</c>.
/// </summary>
internal sealed partial class ProblemExceptionHandler(
    IProblemDetailsService problemDetails,
    ILogger<ProblemExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        var (status, title, code, detail) = exception switch
        {
            ValidationException => (StatusCodes.Status400BadRequest, "Doğrulama hatası", "validation_failed", "Bir veya daha fazla alan geçersiz."),
            BadHttpRequestException bad => (bad.StatusCode, "Geçersiz istek", "bad_request", "İstek gövdesi veya parametreleri okunamadı."),
            AuthenticationFailedException e => (StatusCodes.Status401Unauthorized, "Kimlik doğrulanamadı", e.Code, e.Message),
            ForbiddenException e => (StatusCodes.Status403Forbidden, "Yetkisiz işlem", e.Code, e.Message),
            NotFoundException e => (StatusCodes.Status404NotFound, "Bulunamadı", e.Code, e.Message),
            ConflictException e => (StatusCodes.Status409Conflict, "Çakışma", e.Code, e.Message),
            ConcurrencyConflictException => (StatusCodes.Status409Conflict, "Çakışma", "concurrency_conflict", "Kayıt başka bir işlemle güncellendi. Tekrar deneyin."),
            UniqueConstraintViolationException => (StatusCodes.Status409Conflict, "Çakışma", "duplicate", "Aynı bilgilerle bir kayıt zaten var."),
            BusinessRuleException e => (StatusCodes.Status422UnprocessableEntity, "İşlem yapılamadı", e.Code, e.Message),
            DomainException e => (StatusCodes.Status422UnprocessableEntity, "İşlem yapılamadı", e.Code, e.Message),
            _ => (StatusCodes.Status500InternalServerError, "Sunucu hatası", "server_error", "Beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyin."),
        };

        if (status >= 500)
        {
            LogUnhandled(logger, exception, httpContext.Request.Method, httpContext.Request.Path);
        }

        ProblemDetails problem = exception is ValidationException validation
            ? new HttpValidationProblemDetails(ToErrors(validation))
            : new ProblemDetails();
        problem.Status = status;
        problem.Title = title;
        problem.Detail = detail;
        problem.Extensions["code"] = code;

        httpContext.Response.StatusCode = status;
        return await problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            ProblemDetails = problem,
            Exception = exception,
        });
    }

    private static Dictionary<string, string[]> ToErrors(ValidationException exception) =>
        exception.Errors
            .GroupBy(e => CamelCasePath(e.PropertyName))
            .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).Distinct().ToArray());

    /// <summary><c>WorkingHours[0].Start</c> → <c>workingHours[0].start</c>.</summary>
    internal static string CamelCasePath(string path) =>
        string.Join('.', path.Split('.').Select(segment =>
            segment.Length == 0 ? segment : char.ToLowerInvariant(segment[0]) + segment[1..]));

    [LoggerMessage(Level = LogLevel.Error, Message = "Unhandled exception for {Method} {Path}")]
    private static partial void LogUnhandled(ILogger logger, Exception exception, string method, PathString path);
}
