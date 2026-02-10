using ChessPlatform.Api.Data;
using ChessPlatform.Api.Hubs;
using ChessPlatform.Api.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace ChessPlatform.Api.Services;

public class MatchmakingBackgroundService : BackgroundService
{
    private readonly IMatchmakingService _matchmaking;
    private readonly IGameStateManager _gameStateManager;
    private readonly IHubContext<GameHub> _hubContext;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<MatchmakingBackgroundService> _logger;

    public MatchmakingBackgroundService(
        IMatchmakingService matchmaking,
        IGameStateManager gameStateManager,
        IHubContext<GameHub> hubContext,
        IServiceScopeFactory scopeFactory,
        ILogger<MatchmakingBackgroundService> logger)
    {
        _matchmaking = matchmaking;
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
                var matches = _matchmaking.FindMatches();

                foreach (var (player1, player2) in matches)
                {
                    await ProcessMatch(player1, player2);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during matchmaking cycle");
            }

            await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);
        }
    }

    private async Task ProcessMatch(QueueEntry player1, QueueEntry player2)
    {
        var random = new Random();
        var player1IsWhite = random.Next(2) == 0;

        var whitePlayer = player1IsWhite ? player1 : player2;
        var blackPlayer = player1IsWhite ? player2 : player1;

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ChessPlatformDbContext>();

        var whiteUser = await db.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == whitePlayer.UserId);
        var blackUser = await db.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == blackPlayer.UserId);

        var game = _gameStateManager.CreateGame(
            whitePlayer.UserId, whitePlayer.ConnectionId,
            blackPlayer.UserId, blackPlayer.ConnectionId,
            player1.TimeControlId);

        var timeControl = TimeControls.Get(player1.TimeControlId)!;

        _logger.LogInformation(
            "Match created: {GameId} - {White} vs {Black} ({TimeControl})",
            game.Id, whiteUser?.DisplayName ?? "Unknown", blackUser?.DisplayName ?? "Unknown",
            player1.TimeControlId);

        await _hubContext.Clients.Client(whitePlayer.ConnectionId).SendAsync("GameStarted", new
        {
            gameId = game.Id.ToString(),
            opponentName = blackUser?.DisplayName ?? "Unknown",
            opponentAvatar = blackUser?.AvatarUrl,
            playerColor = "white",
            timeControlId = player1.TimeControlId,
            initialTimeMs = timeControl.BaseTimeMs
        });

        await _hubContext.Clients.Client(blackPlayer.ConnectionId).SendAsync("GameStarted", new
        {
            gameId = game.Id.ToString(),
            opponentName = whiteUser?.DisplayName ?? "Unknown",
            opponentAvatar = whiteUser?.AvatarUrl,
            playerColor = "black",
            timeControlId = player1.TimeControlId,
            initialTimeMs = timeControl.BaseTimeMs
        });
    }
}
