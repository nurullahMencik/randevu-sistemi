namespace Randevu.Domain.Common;

/// <summary>
/// Raised when a business rule is violated. <see cref="Code"/> is a stable, machine-readable
/// identifier that clients can map to localized messages.
/// </summary>
public class DomainException(string code, string message) : Exception(message)
{
    public string Code { get; } = code;
}
