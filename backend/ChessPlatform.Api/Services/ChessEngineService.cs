using Chess;
using ChessPlatform.Api.Models.Chess;
using Color = ChessPlatform.Api.Models.Chess.Color;

namespace ChessPlatform.Api.Services;

public class ChessEngineService : IChessEngineService
{
    private const string InitialFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

    public string GetInitialFen() => InitialFen;

    public MoveResult TryMakeMove(string currentFen, string uciMove)
    {
        if (string.IsNullOrWhiteSpace(uciMove) || uciMove.Length < 4 || uciMove.Length > 5)
            return new MoveResult { IsLegal = false, Error = "Invalid UCI move format." };

        ChessBoard board;
        try
        {
            board = ChessBoard.LoadFromFen(currentFen, AutoEndgameRules.All);
        }
        catch (Exception ex)
        {
            return new MoveResult { IsLegal = false, Error = $"Invalid FEN: {ex.Message}" };
        }

        var from = uciMove[..2].ToLowerInvariant();
        var to = uciMove[2..4].ToLowerInvariant();
        char? promotionChar = uciMove.Length == 5 ? char.ToLowerInvariant(uciMove[4]) : null;

        var legalMoves = board.Moves();
        var matchingMove = FindMatchingMove(legalMoves, from, to, promotionChar);

        if (matchingMove == null)
            return new MoveResult { IsLegal = false, Error = "Illegal move." };

        // Handle promotion via event if needed
        if (matchingMove.IsPromotion)
        {
            var promoType = MapPromotionChar(promotionChar ?? 'q');
            board.OnPromotePawn += (_, args) => args.PromotionResult = promoType;
        }

        try
        {
            board.Move(matchingMove);
        }
        catch (Exception ex)
        {
            return new MoveResult { IsLegal = false, Error = $"Move failed: {ex.Message}" };
        }

        var executedMove = board.ExecutedMoves[^1];
        var result = new MoveResult
        {
            IsLegal = true,
            Fen = board.ToFen(),
            San = executedMove.San ?? string.Empty,
            IsCheck = executedMove.IsCheck,
            IsCapture = executedMove.CapturedPiece != null,
            IsCastle = executedMove.IsCastling,
        };

        if (board.IsEndGame && board.EndGame != null)
        {
            (result.GameResult, result.Termination) = MapEndGame(board.EndGame);
        }

        return result;
    }

    public List<string> GetLegalMoves(string fen)
    {
        var board = ChessBoard.LoadFromFen(fen, AutoEndgameRules.All);
        var moves = board.Moves();
        var uciMoves = new List<string>();

        foreach (var move in moves)
        {
            var uci = move.OriginalPosition.ToString().ToLowerInvariant()
                    + move.NewPosition.ToString().ToLowerInvariant();

            if (move.IsPromotion && move.Promotion != null)
            {
                var promoStr = move.Promotion.ToString();
                if (promoStr.Length >= 2)
                    uci += char.ToLowerInvariant(promoStr[1]); // "wq" -> 'q', "bn" -> 'n'
            }

            if (!uciMoves.Contains(uci))
                uciMoves.Add(uci);
        }

        return uciMoves;
    }

    public Color GetSideToMove(string fen)
    {
        var parts = fen.Split(' ');
        if (parts.Length < 2)
            return Color.White;

        return parts[1].Equals("b", StringComparison.OrdinalIgnoreCase)
            ? Color.Black
            : Color.White;
    }

    public (GameResult result, GameTermination termination) EvaluatePosition(
        string fen, List<string> positionHistory)
    {
        var board = ChessBoard.LoadFromFen(fen, AutoEndgameRules.All);

        // Library auto-detects checkmate, stalemate, insufficient material
        if (board.IsEndGame && board.EndGame != null)
            return MapEndGame(board.EndGame);

        // Check threefold repetition from position history
        if (positionHistory != null && positionHistory.Count > 0)
        {
            var currentPositionKey = GetPositionKey(fen);
            var count = positionHistory.Count(h => GetPositionKey(h) == currentPositionKey);
            if (count >= 3)
                return (GameResult.Draw, GameTermination.ThreefoldRepetition);
        }

        // Check fifty-move rule from FEN halfmove clock
        var fenParts = fen.Split(' ');
        if (fenParts.Length >= 5 && int.TryParse(fenParts[4], out var halfmoveClock))
        {
            if (halfmoveClock >= 100)
                return (GameResult.Draw, GameTermination.FiftyMoveRule);
        }

        return (GameResult.InProgress, GameTermination.None);
    }

    /// <summary>
    /// Extracts the position key from a FEN (position + turn + castling + en passant, excluding move clocks).
    /// </summary>
    private static string GetPositionKey(string fen)
    {
        var parts = fen.Split(' ');
        if (parts.Length >= 4)
            return $"{parts[0]} {parts[1]} {parts[2]} {parts[3]}";
        return fen;
    }

    private static Move? FindMatchingMove(Move[] legalMoves, string from, string to, char? promotionChar)
    {
        foreach (var move in legalMoves)
        {
            var moveFrom = move.OriginalPosition.ToString().ToLowerInvariant();
            var moveTo = move.NewPosition.ToString().ToLowerInvariant();

            if (moveFrom != from || moveTo != to)
                continue;

            if (!move.IsPromotion)
                return move;

            // For promotion moves, match the promotion piece
            if (promotionChar == null)
            {
                // Default to queen if no promotion specified
                if (move.Promotion?.ToString().EndsWith("q") == true)
                    return move;
            }
            else
            {
                var promoStr = move.Promotion?.ToString() ?? "";
                if (promoStr.Length >= 2 && char.ToLowerInvariant(promoStr[1]) == promotionChar)
                    return move;
            }
        }

        return null;
    }

    private static PromotionType MapPromotionChar(char c) => char.ToLowerInvariant(c) switch
    {
        'q' => PromotionType.ToQueen,
        'r' => PromotionType.ToRook,
        'b' => PromotionType.ToBishop,
        'n' => PromotionType.ToKnight,
        _ => PromotionType.ToQueen,
    };

    private static (GameResult, GameTermination) MapEndGame(EndGameInfo endGame)
    {
        var termination = endGame.EndgameType switch
        {
            EndgameType.Checkmate => GameTermination.Checkmate,
            EndgameType.Stalemate => GameTermination.Stalemate,
            EndgameType.Resigned => GameTermination.Resignation,
            EndgameType.Timeout => GameTermination.Timeout,
            EndgameType.DrawDeclared => GameTermination.DrawAgreement,
            EndgameType.InsufficientMaterial => GameTermination.InsufficientMaterial,
            EndgameType.FiftyMoveRule => GameTermination.FiftyMoveRule,
            EndgameType.Repetition => GameTermination.ThreefoldRepetition,
            _ => GameTermination.None,
        };

        GameResult result;
        if (endGame.EndgameType == EndgameType.Checkmate ||
            endGame.EndgameType == EndgameType.Resigned ||
            endGame.EndgameType == EndgameType.Timeout)
        {
            result = endGame.WonSide == PieceColor.White
                ? GameResult.WhiteWins
                : GameResult.BlackWins;
        }
        else
        {
            result = GameResult.Draw;
        }

        return (result, termination);
    }
}
