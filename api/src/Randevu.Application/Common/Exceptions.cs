namespace Randevu.Application.Common;

/// <summary>Base type for expected failures that map to an HTTP problem response.</summary>
public abstract class AppException(string code, string message) : Exception(message)
{
    public string Code { get; } = code;
}

public sealed class NotFoundException(string code, string message) : AppException(code, message);

public sealed class ConflictException(string code, string message) : AppException(code, message);

public sealed class ForbiddenException(string code, string message) : AppException(code, message);

public sealed class AuthenticationFailedException(string code, string message) : AppException(code, message);

/// <summary>The request is well-formed but violates a business rule (HTTP 422).</summary>
public sealed class BusinessRuleException(string code, string message) : AppException(code, message);
