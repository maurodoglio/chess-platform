using System.Collections.Concurrent;
using ChessPlatform.Api.Models;
using ChessPlatform.Api.Models.Chess;

namespace ChessPlatform.Api.Services;

public class GameStateManager : IGameStateManager
{
    private readonly ConcurrentDictionary<Guid, ActiveGame> _games = new();
    private readonly ConcurrentDictionary<Guid, Guid> _playerToGame = new();
    private readonly IChessEngineService _chessEngine;
    private readonly IClockService _clockService;

    public GameStateManager(IChessEngineService chessEngine, IClockService clockService)
    {
        _chessEngine = chessEngine;
        _clockService = clockService;
    }

    public ActiveGame CreateGame(Guid whitePlayerId, string whiteConnectionId,
                                  Guid blackPlayerId, string blackConnectionId,
                                  string timeControlId)
    {
        var timeControl = TimeControls.Get(timeControlId)
            ?? throw new ArgumentException($"Unknown time control: {timeControlId}");

        var initialFen = _chessEngine.GetInitialFen();
        var game = new ActiveGame
        {
            Id = Guid.NewGuid(),
            WhitePlayerId = whitePlayerId,
            BlackPlayerId = blackPlayerId,
            WhiteConnectionId = whiteConnectionId,
            BlackConnectionId = blackConnectionId,
            CurrentFen = initialFen,
            Turn = Color.White,
            TimeWhiteMs = timeControl.BaseTimeMs,
            TimeBlackMs = timeControl.BaseTimeMs,
            IncrementMs = timeControl.IncrementMs,
            TimeControlId = timeControlId,
            Status = GameStatus.Active,
            MoveCount = 0,
            StartedAt = DateTime.UtcNow,
            ClockRunning = false,
        };
        game.PositionHistory.Add(initialFen);

        _games[game.Id] = game;
        _playerToGame[whitePlayerId] = game.Id;
        _playerToGame[blackPlayerId] = game.Id;

        return game;
    }

    public ActiveGame? GetGame(Guid gameId) =>
        _games.TryGetValue(gameId, out var game) ? game : null;

    public ActiveGame? GetGameByPlayer(Guid playerId) =>
        _playerToGame.TryGetValue(playerId, out var gameId) ? GetGame(gameId) : null;

    public MoveResult TryMakeMove(Guid gameId, Guid playerId, string uciMove)
    {
        var game = GetGame(gameId);
        if (game == null)
            return new MoveResult { IsLegal = false, Error = "Game not found." };

        if (game.Status != GameStatus.Active)
            return new MoveResult { IsLegal = false, Error = "Game is not active." };

        if (game.CurrentPlayerId != playerId)
            return new MoveResult { IsLegal = false, Error = "Not your turn." };

        var result = _chessEngine.TryMakeMove(game.CurrentFen, uciMove);
        if (!result.IsLegal)
            return result;

        // Update game state
        game.CurrentFen = result.Fen;
        game.MoveHistory.Add(uciMove);
        game.SanHistory.Add(result.San);
        game.PositionHistory.Add(result.Fen);
        game.Turn = game.Turn == Color.White ? Color.Black : Color.White;
        game.MoveCount++;
        game.DrawOffer = DrawOfferState.None;

        // Update clocks
        var clockResult = _clockService.UpdateClockOnMove(game);
        if (clockResult.Flagged)
        {
            game.Status = GameStatus.Completed;
            var flaggedColor = game.PlayerColor(clockResult.FlaggedPlayerId!.Value);
            result.GameResult = flaggedColor == Color.White ? GameResult.BlackWins : GameResult.WhiteWins;
            result.Termination = GameTermination.Timeout;
            return result;
        }

        // Check for game-ending conditions
        if (result.GameResult != GameResult.InProgress)
        {
            game.Status = GameStatus.Completed;
        }
        else
        {
            var (evalResult, evalTermination) = _chessEngine.EvaluatePosition(game.CurrentFen, game.PositionHistory);
            if (evalResult != GameResult.InProgress)
            {
                game.Status = GameStatus.Completed;
                result.GameResult = evalResult;
                result.Termination = evalTermination;
            }
        }

        return result;
    }

    public (GameResult result, GameTermination termination) Resign(Guid gameId, Guid playerId)
    {
        var game = GetGame(gameId)
            ?? throw new InvalidOperationException("Game not found.");

        game.Status = GameStatus.Completed;

        var color = game.PlayerColor(playerId);
        var result = color == Color.White ? GameResult.BlackWins : GameResult.WhiteWins;

        return (result, GameTermination.Resignation);
    }

    public bool OfferDraw(Guid gameId, Guid playerId)
    {
        var game = GetGame(gameId);
        if (game == null || game.Status != GameStatus.Active)
            return false;

        if (game.DrawOffer != DrawOfferState.None)
            return false;

        var color = game.PlayerColor(playerId);
        game.DrawOffer = color == Color.White
            ? DrawOfferState.OfferedByWhite
            : DrawOfferState.OfferedByBlack;

        return true;
    }

    public bool AcceptDraw(Guid gameId, Guid playerId)
    {
        var game = GetGame(gameId);
        if (game == null || game.Status != GameStatus.Active)
            return false;

        var color = game.PlayerColor(playerId);

        // Can only accept if the opponent offered
        var canAccept = (color == Color.White && game.DrawOffer == DrawOfferState.OfferedByBlack)
                     || (color == Color.Black && game.DrawOffer == DrawOfferState.OfferedByWhite);

        if (!canAccept)
            return false;

        game.Status = GameStatus.Completed;
        game.DrawOffer = DrawOfferState.None;
        return true;
    }

    public bool DeclineDraw(Guid gameId, Guid playerId)
    {
        var game = GetGame(gameId);
        if (game == null || game.Status != GameStatus.Active)
            return false;

        if (game.DrawOffer == DrawOfferState.None)
            return false;

        game.DrawOffer = DrawOfferState.None;
        return true;
    }

    public bool CanAbort(Guid gameId)
    {
        var game = GetGame(gameId);
        if (game == null || game.Status != GameStatus.Active)
            return false;

        return game.MoveCount <= 2;
    }

    public void AbortGame(Guid gameId)
    {
        var game = GetGame(gameId);
        if (game == null) return;

        game.Status = GameStatus.Completed;
    }

    public void RemoveGame(Guid gameId)
    {
        if (_games.TryRemove(gameId, out var game))
        {
            _playerToGame.TryRemove(game.WhitePlayerId, out _);
            _playerToGame.TryRemove(game.BlackPlayerId, out _);
        }
    }

    public void UpdateConnectionId(Guid gameId, Guid playerId, string newConnectionId)
    {
        var game = GetGame(gameId);
        if (game == null) return;

        if (playerId == game.WhitePlayerId)
            game.WhiteConnectionId = newConnectionId;
        else if (playerId == game.BlackPlayerId)
            game.BlackConnectionId = newConnectionId;
    }

    public IEnumerable<ActiveGame> GetAllActiveGames() =>
        _games.Values.Where(g => g.Status == GameStatus.Active);
}
