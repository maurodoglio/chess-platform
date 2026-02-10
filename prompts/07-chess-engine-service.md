# Prompt 07 — Server-Side Chess Engine Service

## Context
We have a full auth flow and page structure. Before building real-time gameplay, we need a reliable server-side chess engine that validates moves and detects game-ending conditions. This will be the authoritative game logic that prevents cheating.

## What to Build
A chess engine service in C# that manages board state, validates moves, and detects checkmate/stalemate/draws. This is a pure logic layer with no HTTP or SignalR dependencies.

## Prompt

```text
Create a server-side chess engine service in the ChessPlatform.Api project. This service validates moves and tracks game state. It will be used by the SignalR hub (built in a later step).

CHESS MODELS — /Models/Chess/:

Color.cs:
  public enum Color { White, Black }

PieceType.cs:
  public enum PieceType { Pawn, Knight, Bishop, Rook, Queen, King }

Move.cs:
  public class Move
  {
      public string From { get; set; }      // e.g., "e2"
      public string To { get; set; }        // e.g., "e4"
      public PieceType? Promotion { get; set; }  // For pawn promotion
      public string Uci => $"{From}{To}{PromotionChar}";  // e.g., "e2e4" or "e7e8q"
  }

GameResult.cs:
  public enum GameResult { InProgress, WhiteWins, BlackWins, Draw }

GameTermination.cs:
  public enum GameTermination { None, Checkmate, Stalemate, Resignation, Timeout, DrawAgreement, ThreefoldRepetition, FiftyMoveRule, InsufficientMaterial }

MoveResult.cs:
  public class MoveResult
  {
      public bool IsLegal { get; set; }
      public string? Error { get; set; }
      public string Fen { get; set; }
      public string San { get; set; }       // Standard Algebraic Notation (e.g., "Nf3")
      public bool IsCheck { get; set; }
      public bool IsCapture { get; set; }
      public bool IsCastle { get; set; }
      public GameResult GameResult { get; set; }
      public GameTermination Termination { get; set; }
  }

CHESS ENGINE SERVICE — /Services/ChessEngineService.cs:

Use a well-maintained .NET chess library (consider installing the "Chess" NuGet package or "Rudzoft.ChessLib", or implement core logic). If no suitable library exists, implement the following with a FEN-based approach.

The service should be stateless — it takes a FEN string and a move, and returns a result.

public interface IChessEngineService
{
    // Validate and apply a move. Returns the result including new FEN.
    MoveResult TryMakeMove(string currentFen, string uciMove);

    // Get all legal moves for the current position.
    List<string> GetLegalMoves(string fen);

    // Get the side to move from a FEN.
    Color GetSideToMove(string fen);

    // Check if the position is a terminal state (checkmate, stalemate, draw).
    (GameResult result, GameTermination termination) EvaluatePosition(string fen, List<string> moveHistory);

    // Convert UCI move to SAN given a position.
    string UciToSan(string fen, string uciMove);
    
    // Get the initial FEN for a standard chess game.
    string GetInitialFen();
}

IMPLEMENTATION REQUIREMENTS:
- Full legal move generation for all pieces including castling (king-side and queen-side), en passant, and pawn promotion.
- Check detection: a move is illegal if it leaves the king in check.
- Checkmate: current side has no legal moves AND is in check.
- Stalemate: current side has no legal moves AND is NOT in check.
- Threefold repetition: position (piece placement + side to move + castling rights + en passant square) has occurred 3 times.
- Fifty-move rule: 50 consecutive moves by both sides without a pawn move or capture.
- Insufficient material: K vs K, K+B vs K, K+N vs K, K+B vs K+B (same color bishops).

REGISTER in Program.cs:
- Register IChessEngineService as a singleton in DI.

UNIT TESTS — Create a test project /backend/ChessPlatform.Tests:
- Use xUnit.
- Test at minimum:
  - Legal move from starting position (e.g., e2e4 is legal).
  - Illegal move rejection (e.g., e2e5 from start is illegal).
  - Checkmate detection (Scholar's Mate sequence: 1.e4 e5 2.Bc4 Nc6 3.Qh5 Nf6 4.Qxf7#).
  - Stalemate detection.
  - Castling legality (can't castle through check, can't castle after king has moved).
  - En passant.
  - Pawn promotion.

Verify: All unit tests pass. The service correctly validates a full game of Scholar's Mate and returns GameResult.WhiteWins with Termination.Checkmate.
```
