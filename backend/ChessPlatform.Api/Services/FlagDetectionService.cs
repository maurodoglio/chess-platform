using ChessPlatform.Api.Hubs;
using ChessPlatform.Api.Models;
using ChessPlatform.Api.Models.Chess;
using Microsoft.AspNetCore.SignalR;

namespace ChessPlatform.Api.Services;

public class FlagDetectionService : BackgroundService
{
    private readonly IClockService _clockService;
    private readonly IGameStateManager _gameStateManager;
    private readonly IHubContext<GameHub> _hubContext;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<FlagDetectionService> _logger;

    public FlagDetectionService(
        IClockService clockService,
        IGameStateManager gameStateManager,
        IHubContext<GameHub> hubContext,
        IServiceScopeFactory scopeFactory,
        ILogger<FlagDetectionService> logger)
    {
        _clockService = clockService;
        _gameStateManager = gameStateManager;
        _hubContext = hubContext;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var flagged = _clockService.CheckFlags(_gameStateManager.GetAllActiveGames());

                foreach (var (gameId, flaggedPlayerId) in flagged)
                {
                    var game = _gameStateManager.GetGame(gameId);
                    if (game == null || game.Status != GameStatus.Active)
                        continue;

                    game.Status = GameStatus.Completed;

                    var winnerId = game.GetOpponentId(flaggedPlayerId);
                    var winnerColor = game.PlayerColor(winnerId);
                    var gameResult = winnerColor == Color.White ? GameResult.WhiteWins : GameResult.BlackWins;
                    var resultStr = winnerColor == Color.White ? "white" : "black";

                    using var scope = _scopeFactory.CreateScope();
                    var completionService = scope.ServiceProvider.GetRequiredService<IGameCompletionService>();
                    var completionResult = await completionService.CompleteGameAsync(game, gameResult, GameTermination.Timeout);

                    var connectionIds = new List<string>();
                    if (game.WhiteConnectionId != null) connectionIds.Add(game.WhiteConnectionId);
                    if (game.BlackConnectionId != null) connectionIds.Add(game.BlackConnectionId);

                    if (completionResult.HasValue && connectionIds.Count > 0)
                    {
                        var (savedGame, whiteRatingChange, blackRatingChange) = completionResult.Value;

                        if (game.WhiteConnectionId != null)
                        {
                            await _hubContext.Clients.Client(game.WhiteConnectionId).SendAsync("GameOver", new
                            {
                                result = resultStr,
                                reason = "timeout",
                                ratingChange = whiteRatingChange,
                                newRating = savedGame.WhiteRatingAfter
                            }, stoppingToken);
                        }
                        if (game.BlackConnectionId != null)
                        {
                            await _hubContext.Clients.Client(game.BlackConnectionId).SendAsync("GameOver", new
                            {
                                result = resultStr,
                                reason = "timeout",
                                ratingChange = blackRatingChange,
                                newRating = savedGame.BlackRatingAfter
                            }, stoppingToken);
                        }
                    }
                    else if (connectionIds.Count > 0)
                    {
                        await _hubContext.Clients.Clients(connectionIds).SendAsync("GameOver", new
                        {
                            result = resultStr,
                            reason = "timeout"
                        }, stoppingToken);
                    }

                    _gameStateManager.RemoveGame(gameId);
                    _logger.LogInformation("Game {GameId} ended by timeout, winner: {Winner}", gameId, resultStr);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during flag detection cycle");
            }

            await Task.Delay(500, stoppingToken);
        }
    }
}
