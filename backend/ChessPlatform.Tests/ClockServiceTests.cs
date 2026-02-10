using ChessPlatform.Api.Models;
using ChessPlatform.Api.Models.Chess;
using ChessPlatform.Api.Services;

namespace ChessPlatform.Tests;

public class ClockServiceTests
{
    private readonly ClockService _clockService = new();

    private ActiveGame CreateTestGame(long timeMs = 300_000, int incrementMs = 2_000)
    {
        return new ActiveGame
        {
            Id = Guid.NewGuid(),
            WhitePlayerId = Guid.NewGuid(),
            BlackPlayerId = Guid.NewGuid(),
            CurrentFen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
            Turn = Color.Black, // White just moved, turn toggled to Black
            TimeWhiteMs = timeMs,
            TimeBlackMs = timeMs,
            IncrementMs = incrementMs,
            MoveCount = 1,
            ClockRunning = false,
            LastMoveTimestamp = null,
            Status = GameStatus.Active,
            StartedAt = DateTime.UtcNow
        };
    }

    [Fact]
    public void FirstMove_DoesNotDeductTime()
    {
        var game = CreateTestGame();
        // MoveCount == 1 means white just made the first move

        var result = _clockService.UpdateClockOnMove(game);

        Assert.Equal(300_000, result.TimeWhiteMs);
        Assert.Equal(300_000, result.TimeBlackMs);
        Assert.False(result.Flagged);
        Assert.True(game.ClockRunning);
        Assert.NotNull(game.LastMoveTimestamp);
    }

    [Fact]
    public void SubsequentMove_DeductsElapsedMinusGrace()
    {
        var game = CreateTestGame();
        game.MoveCount = 2;
        game.ClockRunning = true;
        // Simulate 1 second elapsed since last move
        game.LastMoveTimestamp = DateTime.UtcNow.AddMilliseconds(-1000);
        game.Turn = Color.White; // Turn is White, meaning Black just moved — deduct from Black's clock

        var result = _clockService.UpdateClockOnMove(game);

        // Should deduct ~900ms (1000 - 100 grace) from Black's clock, then add 2000 increment
        // Black: 300000 - 900 + 2000 = 301100
        Assert.Equal(300_000, result.TimeWhiteMs);
        Assert.InRange(result.TimeBlackMs, 300_900, 301_200);
        Assert.False(result.Flagged);
    }

    [Fact]
    public void IncrementIsAddedAfterDeduction()
    {
        var game = CreateTestGame(timeMs: 10_000, incrementMs: 5_000);
        game.MoveCount = 2;
        game.ClockRunning = true;
        game.LastMoveTimestamp = DateTime.UtcNow.AddMilliseconds(-2000);
        game.Turn = Color.White; // Black just moved

        var result = _clockService.UpdateClockOnMove(game);

        // Black: 10000 - ~1900 + 5000 = ~13100
        Assert.InRange(result.TimeBlackMs, 12_900, 13_200);
        Assert.Equal(10_000, result.TimeWhiteMs);
        Assert.False(result.Flagged);
    }

    [Fact]
    public void FlagDetection_WhenTimeRunsOut()
    {
        var game = CreateTestGame(timeMs: 500, incrementMs: 0);
        game.MoveCount = 2;
        game.ClockRunning = true;
        game.LastMoveTimestamp = DateTime.UtcNow.AddMilliseconds(-1000);
        game.Turn = Color.White; // Black just moved, deduct from Black

        var result = _clockService.UpdateClockOnMove(game);

        Assert.True(result.Flagged);
        Assert.Equal(game.BlackPlayerId, result.FlaggedPlayerId);
        Assert.Equal(0, result.TimeBlackMs);
    }

    [Fact]
    public void CheckFlags_DetectsFlaggedGame()
    {
        var game = CreateTestGame(timeMs: 500, incrementMs: 0);
        game.MoveCount = 3;
        game.ClockRunning = true;
        game.LastMoveTimestamp = DateTime.UtcNow.AddMilliseconds(-1000);
        game.Turn = Color.Black; // Black's clock is running

        var flagged = _clockService.CheckFlags(new[] { game });

        Assert.Single(flagged);
        Assert.Equal(game.Id, flagged[0].gameId);
        Assert.Equal(game.BlackPlayerId, flagged[0].flaggedPlayerId);
    }

    [Fact]
    public void CheckFlags_IgnoresNonRunningClocks()
    {
        var game = CreateTestGame(timeMs: 500, incrementMs: 0);
        game.ClockRunning = false;
        game.LastMoveTimestamp = DateTime.UtcNow.AddMilliseconds(-10000);

        var flagged = _clockService.CheckFlags(new[] { game });

        Assert.Empty(flagged);
    }

    [Fact]
    public void CheckFlags_IgnoresCompletedGames()
    {
        var game = CreateTestGame(timeMs: 500, incrementMs: 0);
        game.ClockRunning = true;
        game.Status = GameStatus.Completed;
        game.LastMoveTimestamp = DateTime.UtcNow.AddMilliseconds(-10000);

        var flagged = _clockService.CheckFlags(new[] { game });

        Assert.Empty(flagged);
    }
}
