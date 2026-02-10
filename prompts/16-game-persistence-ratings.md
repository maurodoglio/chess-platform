# Prompt 16 — Game Persistence + Elo Rating Service

## Context
Online games can be played end-to-end with clocks. But completed games are not saved to the database and ratings don't change. This step adds game persistence and Elo calculation so every online game is recorded and affects player ratings.

## What to Build
The Game entity, a rating calculation service, and the logic to persist completed games and update ratings in a single transaction.

## Prompt

```text
Add game persistence and Elo rating updates to the backend.

GAME ENTITY — /Models/Game.cs:

public class Game
{
    public Guid Id { get; set; }
    public Guid WhitePlayerId { get; set; }
    public Guid BlackPlayerId { get; set; }
    public string TimeControl { get; set; }        // e.g., "blitz_5_0"
    public string Result { get; set; }             // "white", "black", "draw"
    public string Termination { get; set; }        // "checkmate", "timeout", "resignation", etc.
    public string Pgn { get; set; }
    public string FinalFen { get; set; }
    public int WhiteRatingBefore { get; set; }
    public int BlackRatingBefore { get; set; }
    public int WhiteRatingAfter { get; set; }
    public int BlackRatingAfter { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime EndedAt { get; set; }

    // Navigation properties
    public User WhitePlayer { get; set; }
    public User BlackPlayer { get; set; }
}

ENTITY CONFIGURATION — /Data/Configurations/GameConfiguration.cs:
- id: UUID PK with default gen_random_uuid()
- Foreign keys to users for white_player_id and black_player_id
- Indexes on (white_player_id, ended_at DESC) and (black_player_id, ended_at DESC)
- Snake_case column naming
- All fields NOT NULL

UPDATE DbContext:
- Add DbSet<Game>
- Apply GameConfiguration

CREATE MIGRATION:
- Name: "AddGamesTable"

RATING SERVICE — /Services/RatingService.cs:

public interface IRatingService
{
    // Calculate new ratings for both players after a game.
    (int newWhiteRating, int newBlackRating) CalculateNewRatings(
        int whiteRating, int blackRating,
        int whiteGamesPlayed, int blackGamesPlayed,
        GameResult result);
}

Implementation:
- Standard Elo formula:
  Expected = 1 / (1 + 10^((opponentRating - playerRating) / 400))
  NewRating = OldRating + K * (Score - Expected)
- K-factor:
  - gamesPlayed < 20 → K = 40
  - gamesPlayed >= 20 && rating < 2400 → K = 20
  - rating >= 2400 → K = 10
- Score: 1.0 for win, 0.5 for draw, 0.0 for loss
- Minimum rating floor: 100 (never drop below)
- Round to nearest integer

PGN GENERATION — /Services/PgnService.cs:

public interface IPgnService
{
    string GeneratePgn(ActiveGame game, GameResult result, string whitePlayerName, string blackPlayerName);
}

Implementation:
- Generate standard PGN format:
  [Event "ChessPlatform Online"]
  [Site "ChessPlatform"]
  [Date "2026.02.08"]
  [White "PlayerName"]
  [Black "OpponentName"]
  [Result "1-0" / "0-1" / "1/2-1/2"]
  [TimeControl "300+0"]
  
  1. e4 e5 2. Nf3 Nc6 ... 1-0

- Use the SanHistory from ActiveGame for moves.

GAME COMPLETION SERVICE — /Services/GameCompletionService.cs:

public interface IGameCompletionService
{
    // Persist a completed game to the database and update ratings.
    // Called when any game ends (checkmate, timeout, resignation, draw, abort).
    Task<Game> CompleteGameAsync(ActiveGame activeGame, GameResult result, GameTermination termination);
}

Implementation:
1. Fetch both players from the database.
2. Determine the rating category from the time control (bullet/blitz/rapid).
3. Get current ratings and games played for that category.
4. If termination is "abort", don't save the game or change ratings. Just clean up.
5. Calculate new ratings via IRatingService.
6. Create a Game entity with all fields populated.
7. Update both users' ratings and games_played counts.
8. Save Game + updated Users in a single transaction.
9. Return the persisted Game.

WIRE INTO GAME HUB:
- When a game ends (in MakeMove, Resign, AcceptDraw, or FlagDetectionService):
  1. Call IGameCompletionService.CompleteGameAsync().
  2. Include ratingChange (newRating - oldRating) and newRating in the "GameOver" event sent to both players.
  3. Call IGameStateManager.RemoveGame() to clean up memory.

UPDATE GameOverEvent on frontend (/types/signalr.ts):
  Add: ratingChange: number; newRating: number;

UPDATE GameOverDialog:
  Show rating change: "+12" (green) or "-8" (red) and new rating value.

REGISTER SERVICES:
- IRatingService as singleton
- IPgnService as singleton
- IGameCompletionService as scoped (uses DbContext)

UNIT TESTS:
- Elo calculation: equal ratings → winner gets +K/2, loser gets -K/2.
- Provisional K-factor (40) for new players.
- Rating floor: player at 100 who loses stays at 100.
- PGN generation produces valid PGN string.

Verify:
- Play a full game in two browser tabs.
- After game over, check the database: games table has a new row with correct PGN, ratings, result.
- Both users' ratings have changed in the users table.
- The game over dialog shows the rating change.
```
