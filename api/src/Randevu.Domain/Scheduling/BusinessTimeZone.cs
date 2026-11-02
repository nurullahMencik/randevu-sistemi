namespace Randevu.Domain.Scheduling;

public static class BusinessTimeZone
{
    public const string IstanbulId = "Europe/Istanbul";

    /// <summary>
    /// Resolves an IANA time zone. Slim container images may ship without tzdata, so for
    /// Istanbul we fall back to a fixed UTC+03:00 zone, which has been correct since
    /// Turkey abolished daylight saving time in 2016.
    /// </summary>
    public static TimeZoneInfo Resolve(string id)
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(id);
        }
        catch (Exception ex) when (ex is TimeZoneNotFoundException or InvalidTimeZoneException)
        {
            if (string.Equals(id, IstanbulId, StringComparison.OrdinalIgnoreCase))
            {
                return TimeZoneInfo.CreateCustomTimeZone(IstanbulId, TimeSpan.FromHours(3), "Istanbul (UTC+03:00)", "Istanbul");
            }

            throw;
        }
    }
}
