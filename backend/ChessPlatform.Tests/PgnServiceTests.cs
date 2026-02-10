using ChessPlatform.Api.Models;
using ChessPlatform.Api.Services;

namespace ChessPlatform.Tests;

public class PgnServiceTests
{
    private readonly PgnService _sut = new();

    [Fact]
    public void GeneratePgn_ProducesValidPgnString()
    {
        var game = new ActiveGame
        {
            Id = Guid.NewGuid(),
            WhitePlayerId = Guid.NewGuid(),
            BlackPlayerId = Guid.NewGuid(),
            TimeControlId = "blitz_5_0",
            StartedAt = new DateTime(2025, 1, 15, 12, 0, 0, DateTimeKind.Utc),
            SanHistory = new List<string> { "e4", "e5", "Nf3", "Nc6", "Bb5" }
        };

        var pgn = _sut.GeneratePgn(game, "1-0", "Alice", "Bob");

        Assert.Contains("[White \"Alice\"]", pgn);
        Assert.Contains("[Black \"Bob\"]", pgn);
        Assert.Contains("[Result \"1-0\"]", pgn);
        Assert.Contains("[Date \"2025.01.15\"]", pgn);
        Assert.Contains("1. e4 e5 2. Nf3 Nc6 3. Bb5 1-0", pgn);
    }

    [Fact]
    public void GeneratePgn_EmptyMoveHistory_JustHeaders()
    {
        var game = new ActiveGame
        {
            Id = Guid.NewGuid(),
            WhitePlayerId = Guid.NewGuid(),
            BlackPlayerId = Guid.NewGuid(),
            TimeControlId = "rapid_10_0",
            StartedAt = new DateTime(2025, 6, 1, 0, 0, 0, DateTimeKind.Utc),
            SanHistory = new List<string>()
        };

        var pgn = _sut.GeneratePgn(game, "1/2-1/2", "Player1", "Player2");

        Assert.Contains("[Result \"1/2-1/2\"]", pgn);
        Assert.Contains("1/2-1/2", pgn);
    }
}
