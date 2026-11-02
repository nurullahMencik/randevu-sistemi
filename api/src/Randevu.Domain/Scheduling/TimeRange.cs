namespace Randevu.Domain.Scheduling;

/// <summary>Half-open UTC interval <c>[Start, End)</c>.</summary>
public readonly record struct TimeRange
{
    public TimeRange(DateTime start, DateTime end)
    {
        if (end <= start)
        {
            throw new ArgumentException("End must be after start.", nameof(end));
        }

        Start = start;
        End = end;
    }

    public DateTime Start { get; }
    public DateTime End { get; }
    public TimeSpan Duration => End - Start;

    /// <summary>Two half-open ranges overlap when each starts before the other ends.</summary>
    public bool Overlaps(TimeRange other) => Start < other.End && other.Start < End;
}
