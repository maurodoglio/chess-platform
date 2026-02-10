using ChessPlatform.Api.Models.Chess;
using ChessPlatform.Api.Services;

namespace ChessPlatform.Tests;

public class ChessEngineServiceTests
{
    private readonly ChessEngineService _engine = new();

    [Fact]
    public void StartingPosition_Has20LegalMoves()
    {
        var fen = _engine.GetInitialFen();
        var moves = _engine.GetLegalMoves(fen);
        Assert.Equal(20, moves.Count);
    }

    [Fact]
    public void E2E4_FromStartingPosition_IsLegal()
    {
        var fen = _engine.GetInitialFen();
        var result = _engine.TryMakeMove(fen, "e2e4");

        Assert.True(result.IsLegal);
        Assert.Null(result.Error);
        Assert.Contains("e4", result.San, StringComparison.OrdinalIgnoreCase);
        Assert.NotEmpty(result.Fen);
    }

    [Fact]
    public void E2E5_FromStartingPosition_IsIllegal()
    {
        var fen = _engine.GetInitialFen();
        var result = _engine.TryMakeMove(fen, "e2e5");

        Assert.False(result.IsLegal);
        Assert.NotNull(result.Error);
    }

    [Fact]
    public void ScholarsMate_EndsInCheckmate()
    {
        var fen = _engine.GetInitialFen();

        // 1. e4 e5
        var r1 = _engine.TryMakeMove(fen, "e2e4");
        Assert.True(r1.IsLegal);
        var r2 = _engine.TryMakeMove(r1.Fen, "e7e5");
        Assert.True(r2.IsLegal);

        // 2. Bc4 Nc6
        var r3 = _engine.TryMakeMove(r2.Fen, "f1c4");
        Assert.True(r3.IsLegal);
        var r4 = _engine.TryMakeMove(r3.Fen, "b8c6");
        Assert.True(r4.IsLegal);

        // 3. Qh5 Nf6
        var r5 = _engine.TryMakeMove(r4.Fen, "d1h5");
        Assert.True(r5.IsLegal);
        var r6 = _engine.TryMakeMove(r5.Fen, "g8f6");
        Assert.True(r6.IsLegal);

        // 4. Qxf7#
        var r7 = _engine.TryMakeMove(r6.Fen, "h5f7");
        Assert.True(r7.IsLegal);
        Assert.True(r7.IsCheck);
        Assert.True(r7.IsCapture);
        Assert.Equal(GameResult.WhiteWins, r7.GameResult);
        Assert.Equal(GameTermination.Checkmate, r7.Termination);
    }

    [Fact]
    public void PawnPromotion_E7E8Q_IsLegal()
    {
        // White pawn on e7, kings on board
        var fen = "8/4P3/8/8/8/8/8/4K2k w - - 0 1";
        var result = _engine.TryMakeMove(fen, "e7e8q");

        Assert.True(result.IsLegal);
        Assert.Contains("=Q", result.San);
        Assert.Contains("Q", result.Fen); // Promoted queen should be in FEN
    }

    [Fact]
    public void KingSideCastling_IsLegal_WhenConditionsMet()
    {
        // Both sides can castle, white to move
        var fen = "r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1";
        var legalMoves = _engine.GetLegalMoves(fen);

        // King-side castling = e1g1
        Assert.Contains("e1g1", legalMoves);

        var result = _engine.TryMakeMove(fen, "e1g1");
        Assert.True(result.IsLegal);
        Assert.True(result.IsCastle);
        Assert.Contains("O-O", result.San);
    }
}
