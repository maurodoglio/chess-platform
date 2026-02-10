using System.Security.Claims;
using ChessPlatform.Api.Data;
using ChessPlatform.Api.Models;
using ChessPlatform.Api.Models.Chess;
using ChessPlatform.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace ChessPlatform.Api.Hubs;

[Authorize]
public class GameHub : Hub
{
    private readonly IConnectionTracker _connectionTracker;
    private readonly IMatchmakingService _matchmaking;
    private readonly IGameStateManager _gameStateManager;
    private readonly IReconnectionTimerService _reconnectionTimer;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<GameHub> _logger;

    public GameHub(
        IConnectionTracker connectionTracker,
        IMatchmakingService matchmaking,
        IGameStateManager gameStateManager,
        IReconnectionTimerService reconnectionTimer,
        IServiceScopeFactory scopeFactory,
        ILogger<GameHub> logger)
    {
        _connectionTracker = connectionTracker;
        _matchmaking = matchmaking;
        _gameStateManager = gameStateManager;
        _reconnectionTimer = reconnectionTimer;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    private Guid GetUserId()
    {
        var claim = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (claim is null || !Guid.TryParse(claim, out var userId))
            throw new HubException("User not authenticated");
        return userId;
    }

    public override async Task OnConnectedAsync()
    {
        var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim is not null && Guid.TryParse(userIdClaim, out var userId))
        {
            _connectionTracker.AddConnection(userId, Context.ConnectionId);
            _logger.LogInformation("User {UserId} connected", userId);

            // Reconnection: if player has an active game, resync
            var game = _gameStateManager.GetGameByPlayer(userId);
            if (game != null && game.Status == GameStatus.Active)
            {
                _gameStateManager.UpdateConnectionId(game.Id, userId, Context.ConnectionId);
                _reconnectionTimer.CancelTimer(game.Id);

                var playerColor = game.PlayerColor(userId);
                var turn = game.Turn == Models.Chess.Color.White ? "white" : "black";
                var drawOffer = game.DrawOffer switch
                {
                    DrawOfferState.OfferedByWhite => "white",
                    DrawOfferState.OfferedByBlack => "black",
                    _ => "none"
                };

                await Clients.Caller.SendAsync("GameResynced", new
                {
                    gameId = game.Id.ToString(),
                    fen = game.CurrentFen,
                    moveHistory = game.SanHistory,
                    timeWhiteMs = game.TimeWhiteMs,
                    timeBlackMs = game.TimeBlackMs,
                    turn,
                    playerColor = playerColor == Models.Chess.Color.White ? "white" : "black",
                    drawOffer
                });

                // Notify opponent
                var opponentConnId = GetOpponentConnectionId(game, userId);
                if (opponentConnId != null)
                    await Clients.Client(opponentConnId).SendAsync("OpponentReconnected", new { });

                _logger.LogInformation("User {UserId} reconnected to game {GameId}", userId, game.Id);
            }
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = _connectionTracker.GetUserId(Context.ConnectionId);
        _connectionTracker.RemoveConnection(Context.ConnectionId);

        if (userId.HasValue)
        {
            _matchmaking.LeaveQueue(userId.Value);

            // If player has an active game, start reconnection timer
            var game = _gameStateManager.GetGameByPlayer(userId.Value);
            if (game != null && game.Status == GameStatus.Active)
            {
                // Clear disconnected player's connectionId
                if (game.WhitePlayerId == userId.Value)
                    game.WhiteConnectionId = null;
                else
                    game.BlackConnectionId = null;

                _reconnectionTimer.StartTimer(game.Id, userId.Value, 60);

                var deadlineUtc = DateTime.UtcNow.AddSeconds(60).ToString("o");
                var opponentConnId = GetOpponentConnectionId(game, userId.Value);
                if (opponentConnId != null)
                {
                    await Clients.Client(opponentConnId).SendAsync("OpponentDisconnected", new
                    {
                        reconnectionDeadlineUtc = deadlineUtc
                    });
                }

                _logger.LogInformation("User {UserId} disconnected from game {GameId}, reconnection timer started",
                    userId.Value, game.Id);
            }
            else
            {
                _logger.LogInformation("User {UserId} disconnected", userId.Value);
            }
        }

        await base.OnDisconnectedAsync(exception);
    }

    public async Task JoinMatchmaking(string timeControlId)
    {
        if (!TimeControls.All.ContainsKey(timeControlId))
        {
            await Clients.Caller.SendAsync("Error", "Invalid time control");
            return;
        }

        var userId = GetUserId();

        var existingGame = _gameStateManager.GetGameByPlayer(userId);
        if (existingGame != null && existingGame.Status == GameStatus.Active)
        {
            await Clients.Caller.SendAsync("Error", "Already in a game");
            return;
        }

        if (_matchmaking.IsInQueue(userId))
        {
            await Clients.Caller.SendAsync("Error", "Already in queue");
            return;
        }

        var timeControl = TimeControls.Get(timeControlId)!;
        int rating;

        using (var scope = _scopeFactory.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ChessPlatformDbContext>();
            var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);

            rating = timeControl.Category switch
            {
                "bullet" => user?.RatingBullet ?? 1200,
                "blitz" => user?.RatingBlitz ?? 1200,
                "rapid" => user?.RatingRapid ?? 1200,
                _ => 1200
            };
        }

        var entry = new QueueEntry
        {
            UserId = userId,
            ConnectionId = Context.ConnectionId,
            Rating = rating,
            TimeControlId = timeControlId,
            JoinedAt = DateTime.UtcNow
        };

        _matchmaking.JoinQueue(entry);
        await Clients.Caller.SendAsync("MatchmakingStatus", new { status = "searching" });
    }

    public async Task LeaveMatchmaking()
    {
        var userId = GetUserId();
        _matchmaking.LeaveQueue(userId);
        await Clients.Caller.SendAsync("MatchmakingStatus", new { status = "cancelled" });
    }

    public async Task MakeMove(string gameId, string move)
    {
        if (!Guid.TryParse(gameId, out var gid))
        {
            await Clients.Caller.SendAsync("Error", "Invalid game ID");
            return;
        }

        var userId = GetUserId();
        var game = _gameStateManager.GetGame(gid);
        if (game == null || !game.IsPlayer(userId))
        {
            await Clients.Caller.SendAsync("Error", "Game not found");
            return;
        }

        var result = _gameStateManager.TryMakeMove(gid, userId, move);
        if (!result.IsLegal)
        {
            await Clients.Caller.SendAsync("IllegalMove", new { attemptedMove = move, reason = result.Error });
            return;
        }

        var moveMade = new
        {
            move,
            san = result.San,
            fen = result.Fen,
            timeWhiteMs = game.TimeWhiteMs,
            timeBlackMs = game.TimeBlackMs,
            moveNumber = game.MoveCount
        };

        await SendToBothPlayers(game, "MoveMade", moveMade);

        if (result.GameResult != GameResult.InProgress)
        {
            await CompleteAndNotify(game, result.GameResult, result.Termination);
        }
    }

    public async Task Resign(string gameId)
    {
        if (!Guid.TryParse(gameId, out var gid))
        {
            await Clients.Caller.SendAsync("Error", "Invalid game ID");
            return;
        }

        var userId = GetUserId();
        var game = _gameStateManager.GetGame(gid);
        if (game == null || !game.IsPlayer(userId))
        {
            await Clients.Caller.SendAsync("Error", "Game not found");
            return;
        }

        var (result, termination) = _gameStateManager.Resign(gid, userId);
        await CompleteAndNotify(game, result, termination);
    }

    public async Task OfferDraw(string gameId)
    {
        if (!Guid.TryParse(gameId, out var gid))
        {
            await Clients.Caller.SendAsync("Error", "Invalid game ID");
            return;
        }

        var userId = GetUserId();
        var game = _gameStateManager.GetGame(gid);
        if (game == null || !game.IsPlayer(userId))
        {
            await Clients.Caller.SendAsync("Error", "Game not found");
            return;
        }

        if (_gameStateManager.OfferDraw(gid, userId))
        {
            var opponentConnId = GetOpponentConnectionId(game, userId);
            if (opponentConnId != null)
                await Clients.Client(opponentConnId).SendAsync("DrawOffered", new { });
        }
    }

    public async Task AcceptDraw(string gameId)
    {
        if (!Guid.TryParse(gameId, out var gid))
        {
            await Clients.Caller.SendAsync("Error", "Invalid game ID");
            return;
        }

        var userId = GetUserId();
        var game = _gameStateManager.GetGame(gid);
        if (game == null || !game.IsPlayer(userId))
        {
            await Clients.Caller.SendAsync("Error", "Game not found");
            return;
        }

        if (_gameStateManager.AcceptDraw(gid, userId))
        {
            await CompleteAndNotify(game, GameResult.Draw, GameTermination.DrawAgreement);
        }
    }

    public async Task DeclineDraw(string gameId)
    {
        if (!Guid.TryParse(gameId, out var gid))
        {
            await Clients.Caller.SendAsync("Error", "Invalid game ID");
            return;
        }

        var userId = GetUserId();
        var game = _gameStateManager.GetGame(gid);
        if (game == null || !game.IsPlayer(userId))
        {
            await Clients.Caller.SendAsync("Error", "Game not found");
            return;
        }

        _gameStateManager.DeclineDraw(gid, userId);
        var opponentConnId = GetOpponentConnectionId(game, userId);
        if (opponentConnId != null)
            await Clients.Client(opponentConnId).SendAsync("DrawDeclined", new { });
    }

    private async Task CompleteAndNotify(ActiveGame game, GameResult result, GameTermination termination)
    {
        using var scope = _scopeFactory.CreateScope();
        var completionService = scope.ServiceProvider.GetRequiredService<IGameCompletionService>();
        var completionResult = await completionService.CompleteGameAsync(game, result, termination);

        if (completionResult.HasValue)
        {
            var (savedGame, whiteRatingChange, blackRatingChange) = completionResult.Value;

            if (game.WhiteConnectionId != null)
            {
                await Clients.Client(game.WhiteConnectionId).SendAsync("GameOver", new
                {
                    result = MapGameResult(result),
                    reason = MapTermination(termination),
                    ratingChange = whiteRatingChange,
                    newRating = savedGame.WhiteRatingAfter
                });
            }
            if (game.BlackConnectionId != null)
            {
                await Clients.Client(game.BlackConnectionId).SendAsync("GameOver", new
                {
                    result = MapGameResult(result),
                    reason = MapTermination(termination),
                    ratingChange = blackRatingChange,
                    newRating = savedGame.BlackRatingAfter
                });
            }
        }
        else
        {
            var gameOver = new
            {
                result = MapGameResult(result),
                reason = MapTermination(termination)
            };
            await SendToBothPlayers(game, "GameOver", gameOver);
        }

        _gameStateManager.RemoveGame(game.Id);
    }

    private static string? GetOpponentConnectionId(ActiveGame game, Guid playerId) =>
        playerId == game.WhitePlayerId ? game.BlackConnectionId : game.WhiteConnectionId;

    private async Task SendToBothPlayers(ActiveGame game, string method, object payload)
    {
        var connectionIds = new List<string>();
        if (game.WhiteConnectionId != null) connectionIds.Add(game.WhiteConnectionId);
        if (game.BlackConnectionId != null) connectionIds.Add(game.BlackConnectionId);
        if (connectionIds.Count > 0)
            await Clients.Clients(connectionIds).SendAsync(method, payload);
    }

    private static string MapGameResult(GameResult result) => result switch
    {
        GameResult.WhiteWins => "white",
        GameResult.BlackWins => "black",
        GameResult.Draw => "draw",
        _ => "draw"
    };

    private static string MapTermination(GameTermination termination) => termination switch
    {
        GameTermination.Checkmate => "checkmate",
        GameTermination.Stalemate => "stalemate",
        GameTermination.Resignation => "resignation",
        GameTermination.Timeout => "timeout",
        GameTermination.DrawAgreement => "draw_agreement",
        GameTermination.ThreefoldRepetition => "threefold_repetition",
        GameTermination.FiftyMoveRule => "fifty_move_rule",
        GameTermination.InsufficientMaterial => "insufficient_material",
        GameTermination.Abort => "abort",
        _ => "unknown"
    };
}
