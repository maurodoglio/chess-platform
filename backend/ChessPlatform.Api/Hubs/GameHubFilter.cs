using Microsoft.AspNetCore.SignalR;

namespace ChessPlatform.Api.Hubs;

public class GameHubFilter : IHubFilter
{
    private readonly ILogger<GameHubFilter> _logger;

    public GameHubFilter(ILogger<GameHubFilter> logger)
    {
        _logger = logger;
    }

    public async ValueTask<object?> InvokeMethodAsync(
        HubInvocationContext invocationContext,
        Func<HubInvocationContext, ValueTask<object?>> next)
    {
        try
        {
            return await next(invocationContext);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception in hub method {Method}", invocationContext.HubMethodName);
            await invocationContext.Hub.Clients.Caller.SendAsync("Error", "An unexpected error occurred.");
            throw;
        }
    }
}
