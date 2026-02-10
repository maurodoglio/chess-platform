# Prompt 09 — In-Memory Game State Manager

## Context
We have a SignalR hub with auth and connection tracking, and a chess engine service for move validation. Now we need an in-memory game state manager that holds active games, applies moves (using the chess engine), and manages game lifecycle.

## What to Build
An ActiveGame model and a GameStateManager service that creates games, processes moves, handles resign/draw, and detects game completion.

## Prompt

```text
Create the in-memory game state manager that will sit between the SignalR hub and the chess engine service.

ACTIVE GAME MODEL — /Models/ActiveGame.cs:

public class ActiveGame
{
    public Guid Id { get; set; }
    public Guid WhitePlayerId { get; set; }
    public Guid BlackPlayerId { get; set; }
    public string? WhiteConnectionId { get; set; }
    public string? BlackConnectionId { get; set; }
    public string CurrentFen { get; set; }
    public List<string> MoveHistory { get; set; } = new();   // UCI moves
    public List<string> SanHistory { get; set; } = new();    // SAN moves for PGN
    public Color Turn { get; set; } = Color.White;
    public long TimeWhiteMs { get; set; }
    public long TimeBlackMs { get; set; }
    public int IncrementMs { get; set; }
    public string TimeControlId { get; set; }
    public DateTime? LastMoveTimestamp { get; set; }
    public DrawOfferState DrawOffer { get; set; } = DrawOfferState.None;
    public GameStatus Status { get; set; } = GameStatus.Active;
    public int MoveCount { get; set; } = 0;
    public DateTime StartedAt { get; set; }

    public Guid CurrentPlayerId => Turn == Color.White ? WhitePlayerId : BlackPlayerId;
    public Guid OpponentPlayerId(Guid playerId) => playerId == WhitePlayerId ? BlackPlayerId : WhitePlayerId;
    public Color PlayerColor(Guid playerId) => playerId == WhitePlayerId ? Color.White : Color.Black;
    public bool IsPlayer(Guid playerId) => playerId == WhitePlayerId || playerId == BlackPlayerId;
}

public enum DrawOfferState { None, OfferedByWhite, OfferedByBlack }
public enum GameStatus { Active, Completed }

TIME CONTROL CONFIG — /Models/TimeControlConfig.cs:

public record TimeControlConfig(string Id, string Name, string Category, int BaseTimeMs, int IncrementMs);

public static class TimeControls
{
    public static readonly Dictionary<string, TimeControlConfig> All = new()
    {
        ["bullet_1_0"] = new("bullet_1_0", "Bullet 1+0", "bullet", 60_000, 0),
        ["bullet_2_1"] = new("bullet_2_1", "Bullet 2+1", "bullet", 120_000, 1_000),
        ["blitz_3_0"] = new("blitz_3_0", "Blitz 3+0", "blitz", 180_000, 0),
        ["blitz_5_0"] = new("blitz_5_0", "Blitz 5+0", "blitz", 300_000, 0),
        ["blitz_5_2"] = new("blitz_5_2", "Blitz 5+2", "blitz", 300_000, 2_000),
        ["rapid_10_0"] = new("rapid_10_0", "Rapid 10+0", "rapid", 600_000, 0),
        ["rapid_15_10"] = new("rapid_15_10", "Rapid 15+10", "rapid", 900_000, 10_000),
    };

    public static TimeControlConfig? Get(string id) => All.GetValueOrDefault(id);
}

GAME STATE MANAGER — /Services/GameStateManager.cs:

public interface IGameStateManager
{
    // Create a new active game between two players
    ActiveGame CreateGame(Guid whitePlayerId, string whiteConnectionId,
                          Guid blackPlayerId, string blackConnectionId,
                          string timeControlId);

    // Get an active game by ID
    ActiveGame? GetGame(Guid gameId);

    // Get the active game for a specific player (a player can only be in one game at a time)
    ActiveGame? GetGameByPlayer(Guid playerId);

    // Attempt to make a move. Returns the MoveResult from the chess engine.
    // Updates game state if the move is legal.
    MoveResult TryMakeMove(Guid gameId, Guid playerId, string uciMove);

    // Player resigns. Returns (result, termination).
    (GameResult result, GameTermination termination) Resign(Guid gameId, Guid playerId);

    // Offer a draw. Returns true if offer was placed.
    bool OfferDraw(Guid gameId, Guid playerId);

    // Accept a draw. Returns true if accepted (there was a pending offer from opponent).
    bool AcceptDraw(Guid gameId, Guid playerId);

    // Decline a draw.
    bool DeclineDraw(Guid gameId, Guid playerId);

    // Abort a game (only within first 2 moves).
    bool CanAbort(Guid gameId);
    void AbortGame(Guid gameId);

    // Remove a completed game from memory.
    void RemoveGame(Guid gameId);

    // Update connection ID (for reconnection).
    void UpdateConnectionId(Guid gameId, Guid playerId, string newConnectionId);
}

IMPLEMENTATION:
- Use ConcurrentDictionary<Guid, ActiveGame> for game storage.
- Use ConcurrentDictionary<Guid, Guid> for player-to-game lookup.
- TryMakeMove:
  1. Verify it's the player's turn.
  2. Call IChessEngineService.TryMakeMove(game.CurrentFen, uciMove).
  3. If legal: update game FEN, add to move history, toggle turn, clear any draw offer, increment move count.
  4. If game is over (checkmate/stalemate/draw), set game status to Completed.
  5. Return the MoveResult.
- Resign: Set status to Completed, return appropriate result.
- OfferDraw: Set DrawOffer state. Can't offer if one is already pending.
- AcceptDraw: Only valid if opponent offered. Set status to Completed.
- Register as singleton.

UNIT TESTS:
- CreateGame sets up initial position and correct time.
- TryMakeMove with legal move updates FEN and turn.
- TryMakeMove with illegal move returns error and doesn't change state.
- TryMakeMove out of turn is rejected.
- Resign sets correct winner.
- Draw offer/accept/decline flow.
- Abort only allowed within first 2 moves.

Verify: All tests pass. A full game (Scholar's Mate) can be played through the GameStateManager and correctly ends in checkmate.
```
