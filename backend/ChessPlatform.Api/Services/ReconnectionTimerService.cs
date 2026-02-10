using System.Collections.Concurrent;
using ChessPlatform.Api.Hubs;
using ChessPlatform.Api.Models;
using ChessPlatform.Api.Models.Chess;
using Microsoft.AspNetCore.SignalR;

namespace ChessPlatform.Api.Services;

public interface IReconnectionTimerService
{
    void StartTimer(Guid gameId, Guid disconnectedPlayerId, int timeoutSeconds = 60);
    void CancelTimer(Guid gameId);
}

public class ReconnectionTimerService : IReconnectionTimerService
{
    private readonly ConcurrentDictionary<Guid, CancellationTokenSource> _timers = new();
    private readonly IGameStateManager _gameStateManager;
    private readonly IHubContext<GameHub> _hubContext;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ReconnectionTimerService> _logger;

    public ReconnectionTimerService(
        IGameStateManager gameStateManager,
        IHubContext<GameHub> hubContext,
        IServiceScopeFactory scopeFactory,
        ILogger<ReconnectionTimerService> logger)
    {
        _gameStateManager = gameStateManager;
        _hubContext = hubContext;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public void StartTimer(Guid gameId, Guid disconnectedPlayerId, int timeoutSeconds = 60)
    {
        CancelTimer(gameId);

        var cts = new CancellationTokenSource();
        _timers[gameId] = cts;

        _ = RunTimerAsync(gameId, disconnectedPlayerId, timeoutSeconds, cts.Token);
    }

    public void CancelTimer(Guid gameId)
    {
        if (_timers.TryRemove(gameId, out var cts))
        {
            cts.Cancel();
            cts.Dispose();
        }
    }

    private async Task RunTimerAsync(Guid gameId, Guid disconnectedPlayerId, int timeoutSeconds, CancellationToken token)
    {
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(timeoutSeconds), token);
        }
        catch (TaskCanceledException)
        {
            return;
        }

        _timers.TryRemove(gameId, out _);

        var game = _gameStateManager.GetGame(gameId);
        if (game == null || game.Status != GameStatus.Active)
            return;

        _logger.LogInformation("Reconnection timeout for game {GameId}, player {PlayerId} forfeits",
            gameId, disconnectedPlayerId);

        game.Status = GameStatus.Completed;

        var disconnectedColor = game.PlayerColor(disconnectedPlayerId);
        var gameResult = disconnectedColor == Color.White ? GameResult.BlackWins : GameResult.WhiteWins;

        using var scope = _scopeFactory.CreateScope();
        var completionService = scope.ServiceProvider.GetRequiredService<IGameCompletionService>();
        var completionResult = await completionService.CompleteGameAsync(game, gameResult, GameTermination.Timeout);

        if (completionResult.HasValue)
        {
            var (savedGame, whiteRatingChange, blackRatingChange) = completionResult.Value;

            if (game.WhiteConnectionId != null)
            {
                await _hubContext.Clients.Client(game.WhiteConnectionId).SendAsync("GameOver", new
                {
                    result = disconnectedColor == Color.White ? "black" : "white",
                    reason = "timeout",
                    ratingChange = whiteRatingChange,
                    newRating = savedGame.WhiteRatingAfter
                });
            }
            if (game.BlackConnectionId != null)
            {
                await _hubContext.Clients.Client(game.BlackConnectionId).SendAsync("GameOver", new
                {
                    result = disconnectedColor == Color.White ? "black" : "white",
                    reason = "timeout",
                    ratingChange = blackRatingChange,
                    newRating = savedGame.BlackRatingAfter
                });
            }
        }

        _gameStateManager.RemoveGame(gameId);
    }
}
