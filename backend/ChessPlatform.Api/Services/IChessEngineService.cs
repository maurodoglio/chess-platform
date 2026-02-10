using ChessPlatform.Api.Models.Chess;

namespace ChessPlatform.Api.Services;

public interface IChessEngineService
{
    MoveResult TryMakeMove(string currentFen, string uciMove);
    List<string> GetLegalMoves(string fen);
    Color GetSideToMove(string fen);
    (GameResult result, GameTermination termination) EvaluatePosition(string fen, List<string> positionHistory);
    string GetInitialFen();
}
