using ChessPlatform.Api.Models;
using ChessPlatform.Api.Models.Chess;
using ChessPlatform.Api.Services;

namespace ChessPlatform.Tests;

public class GameStateManagerTests
{
    private readonly GameStateManager _manager;
    private readonly Guid _whiteId = Guid.NewGuid();
    private readonly Guid _blackId = Guid.NewGuid();

    public GameStateManagerTests()
    {
        var engine = new ChessEngineService();
        var clockService = new ClockService();
        _manager = new GameStateManager(engine, clockService);
    }

    private ActiveGame CreateTestGame(string timeControl = "blitz_5_0")
    {
        return _manager.CreateGame(_whiteId, "conn-white", _blackId, "conn-black", timeControl);
    }

    [Fact]
    public void CreateGame_SetsInitialFenAndCorrectTimes()
    {
        var game = CreateTestGame("blitz_5_0");

        Assert.Equal(GameStatus.Active, game.Status);
        Assert.Equal(Color.White, game.Turn);
        Assert.Equal(300_000, game.TimeWhiteMs);
        Assert.Equal(300_000, game.TimeBlackMs);
        Assert.Equal(0, game.IncrementMs);
        Assert.Equal(0, game.MoveCount);
        Assert.Contains("rnbqkbnr", game.CurrentFen);
        Assert.Single(game.PositionHistory);
        Assert.Equal(game.CurrentFen, game.PositionHistory[0]);
    }

    [Fact]
    public void CreateGame_WithIncrement_SetsIncrementMs()
    {
        var game = CreateTestGame("rapid_15_10");

        Assert.Equal(900_000, game.TimeWhiteMs);
        Assert.Equal(900_000, game.TimeBlackMs);
        Assert.Equal(10_000, game.IncrementMs);
    }

    [Fact]
    public void TryMakeMove_LegalMove_UpdatesFenAndTogglesTurn()
    {
        var game = CreateTestGame();
        var result = _manager.TryMakeMove(game.Id, _whiteId, "e2e4");

        Assert.True(result.IsLegal);
        Assert.Equal(Color.Black, game.Turn);
        Assert.Equal(1, game.MoveCount);
        Assert.Single(game.MoveHistory);
        Assert.Equal("e2e4", game.MoveHistory[0]);
        Assert.Single(game.SanHistory);
        Assert.Equal(result.Fen, game.CurrentFen);
        Assert.Equal(2, game.PositionHistory.Count);
    }

    [Fact]
    public void TryMakeMove_IllegalMove_ReturnsError_StateUnchanged()
    {
        var game = CreateTestGame();
        var originalFen = game.CurrentFen;

        var result = _manager.TryMakeMove(game.Id, _whiteId, "e2e5");

        Assert.False(result.IsLegal);
        Assert.Equal(originalFen, game.CurrentFen);
        Assert.Equal(Color.White, game.Turn);
        Assert.Equal(0, game.MoveCount);
        Assert.Empty(game.MoveHistory);
    }

    [Fact]
    public void TryMakeMove_OutOfTurn_Rejected()
    {
        var game = CreateTestGame();

        var result = _manager.TryMakeMove(game.Id, _blackId, "e7e5");

        Assert.False(result.IsLegal);
        Assert.Equal("Not your turn.", result.Error);
        Assert.Equal(Color.White, game.Turn);
    }

    [Fact]
    public void Resign_ReturnsCorrectWinner()
    {
        var game = CreateTestGame();

        var (resultWhiteResigns, termination1) = _manager.Resign(game.Id, _whiteId);
        Assert.Equal(GameResult.BlackWins, resultWhiteResigns);
        Assert.Equal(GameTermination.Resignation, termination1);
        Assert.Equal(GameStatus.Completed, game.Status);

        // Create a new game for black resignation
        var game2 = _manager.CreateGame(Guid.NewGuid(), "c1", _blackId, "c2", "blitz_5_0");
        var (resultBlackResigns, termination2) = _manager.Resign(game2.Id, _blackId);
        Assert.Equal(GameResult.WhiteWins, resultBlackResigns);
        Assert.Equal(GameTermination.Resignation, termination2);
    }

    [Fact]
    public void DrawOffer_AcceptFlow_Works()
    {
        var game = CreateTestGame();

        // White offers draw
        Assert.True(_manager.OfferDraw(game.Id, _whiteId));
        Assert.Equal(DrawOfferState.OfferedByWhite, game.DrawOffer);

        // White cannot offer again while pending
        Assert.False(_manager.OfferDraw(game.Id, _whiteId));

        // White cannot accept own draw offer
        Assert.False(_manager.AcceptDraw(game.Id, _whiteId));

        // Black accepts
        Assert.True(_manager.AcceptDraw(game.Id, _blackId));
        Assert.Equal(GameStatus.Completed, game.Status);
    }

    [Fact]
    public void DrawOffer_DeclineFlow_Works()
    {
        var game = CreateTestGame();

        Assert.True(_manager.OfferDraw(game.Id, _whiteId));
        Assert.True(_manager.DeclineDraw(game.Id, _blackId));
        Assert.Equal(DrawOfferState.None, game.DrawOffer);
        Assert.Equal(GameStatus.Active, game.Status);
    }

    [Fact]
    public void DrawOffer_ClearedAfterMove()
    {
        var game = CreateTestGame();

        Assert.True(_manager.OfferDraw(game.Id, _whiteId));
        _manager.TryMakeMove(game.Id, _whiteId, "e2e4");

        Assert.Equal(DrawOfferState.None, game.DrawOffer);
    }

    [Fact]
    public void CanAbort_TrueForTwoOrFewerMoves_FalseAfter()
    {
        var game = CreateTestGame();

        Assert.True(_manager.CanAbort(game.Id));

        _manager.TryMakeMove(game.Id, _whiteId, "e2e4");
        Assert.True(_manager.CanAbort(game.Id));

        _manager.TryMakeMove(game.Id, _blackId, "e7e5");
        Assert.True(_manager.CanAbort(game.Id));

        _manager.TryMakeMove(game.Id, _whiteId, "d2d4");
        Assert.False(_manager.CanAbort(game.Id));
    }

    [Fact]
    public void GetGameByPlayer_ReturnsCorrectGame()
    {
        var game = CreateTestGame();

        Assert.Equal(game.Id, _manager.GetGameByPlayer(_whiteId)?.Id);
        Assert.Equal(game.Id, _manager.GetGameByPlayer(_blackId)?.Id);
        Assert.Null(_manager.GetGameByPlayer(Guid.NewGuid()));
    }

    [Fact]
    public void RemoveGame_CleansUpBothDictionaries()
    {
        var game = CreateTestGame();

        _manager.RemoveGame(game.Id);

        Assert.Null(_manager.GetGame(game.Id));
        Assert.Null(_manager.GetGameByPlayer(_whiteId));
        Assert.Null(_manager.GetGameByPlayer(_blackId));
    }

    [Fact]
    public void UpdateConnectionId_UpdatesCorrectPlayer()
    {
        var game = CreateTestGame();

        _manager.UpdateConnectionId(game.Id, _whiteId, "new-white-conn");
        _manager.UpdateConnectionId(game.Id, _blackId, "new-black-conn");

        Assert.Equal("new-white-conn", game.WhiteConnectionId);
        Assert.Equal("new-black-conn", game.BlackConnectionId);
    }
}
