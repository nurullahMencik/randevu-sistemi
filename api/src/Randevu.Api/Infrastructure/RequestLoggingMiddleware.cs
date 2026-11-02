using System.Diagnostics;

namespace Randevu.Api.Infrastructure;

/// <summary>One structured log line per request: method, route, status and duration.</summary>
internal sealed partial class RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var started = Stopwatch.GetTimestamp();
        try
        {
            await next(context);
        }
        finally
        {
            var elapsed = Stopwatch.GetElapsedTime(started).TotalMilliseconds;
            var route = (context.GetEndpoint() as RouteEndpoint)?.RoutePattern.RawText ?? context.Request.Path.Value ?? "/";
            if (context.Request.Path.StartsWithSegments("/health"))
            {
                LogHealth(logger, context.Response.StatusCode, elapsed);
            }
            else
            {
                LogRequest(logger, context.Request.Method, route, context.Response.StatusCode, elapsed);
            }
        }
    }

    [LoggerMessage(Level = LogLevel.Information, Message = "HTTP {Method} {Route} responded {StatusCode} in {ElapsedMs:0.0} ms")]
    private static partial void LogRequest(ILogger logger, string method, string route, int statusCode, double elapsedMs);

    [LoggerMessage(Level = LogLevel.Debug, Message = "Health check responded {StatusCode} in {ElapsedMs:0.0} ms")]
    private static partial void LogHealth(ILogger logger, int statusCode, double elapsedMs);
}
