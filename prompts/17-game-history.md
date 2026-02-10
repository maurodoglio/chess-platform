# Prompt 17 — Game History REST API + Frontend Page

## Context
Games are now persisted to PostgreSQL with full PGN, ratings, and results. We need a REST API to fetch a user's game history and a frontend page to display it.

## What to Build
Backend API endpoints for listing and retrieving games, and a frontend page showing the user's game history.

## Prompt

```text
Build the game history REST API and frontend page.

=== BACKEND ===

GAMES CONTROLLER — /Controllers/GamesController.cs:

[Authorize]
[ApiController]
[Route("api/games")]

GET /api/games?page=1&pageSize=20
  - Get the current user's ID from JWT claims.
  - Query games where user is white_player_id OR black_player_id.
  - Order by ended_at DESC.
  - Return paginated response:
    {
      "data": {
        "games": [
          {
            "id": "...",
            "opponentName": "...",
            "opponentAvatar": "...",
            "playerColor": "white",
            "result": "white",          // who won
            "playerResult": "win",      // "win", "loss", "draw" relative to the user
            "termination": "checkmate",
            "timeControl": "blitz_5_0",
            "ratingBefore": 1200,
            "ratingAfter": 1212,
            "endedAt": "2026-02-08T22:00:00Z"
          }
        ],
        "totalCount": 42,
        "page": 1,
        "pageSize": 20
      }
    }
  - Include opponent info (join with Users table on the opponent's player ID).
  - Determine "playerResult" based on whether the user was white/black and the game result.

GET /api/games/{id}
  - Get a specific game by ID.
  - Verify the current user is a participant (return 403 if not).
  - Return full game details:
    {
      "data": {
        "id": "...",
        "whiteName": "...",
        "whiteAvatar": "...",
        "blackName": "...",
        "blackAvatar": "...",
        "timeControl": "blitz_5_0",
        "result": "white",
        "termination": "checkmate",
        "pgn": "1. e4 e5 2. ...",
        "finalFen": "...",
        "whiteRatingBefore": 1200,
        "whiteRatingAfter": 1215,
        "blackRatingBefore": 1180,
        "blackRatingAfter": 1165,
        "startedAt": "...",
        "endedAt": "..."
      }
    }

=== FRONTEND ===

API FUNCTIONS — Update /services/api.ts:
- fetchGameHistory(page: number, pageSize: number): GET /api/games?page&pageSize
- fetchGame(id: string): GET /api/games/{id}

TYPES — /types/game.ts:
export interface GameHistoryEntry {
  id: string;
  opponentName: string;
  opponentAvatar: string | null;
  playerColor: 'white' | 'black';
  playerResult: 'win' | 'loss' | 'draw';
  termination: string;
  timeControl: string;
  ratingBefore: number;
  ratingAfter: number;
  endedAt: string;
}

export interface GameDetail { ... full game with PGN, etc. }

GAME HISTORY PAGE — /pages/GameHistoryPage.tsx:
Replace the stub with a real page:
- Title: "Game History"
- If no games: "No games played yet. Start playing!" with link to home.
- Table/list of games:
  - Each row shows:
    - Result indicator: ● green (win), ● red (loss), ● gray (draw)
    - Opponent: avatar (small) + name
    - Termination: "Checkmate", "Timeout", "Resignation", etc. (human-readable)
    - Time control: "Blitz 5+0" (formatted from the ID)
    - Rating change: "+12" (green) or "-8" (red) or "+0" (gray)
    - Date: relative time ("2 hours ago", "Yesterday") using simple date formatting
  - Each row is clickable → navigates to /history/{id}
- Pagination controls at the bottom: Previous / Page X of Y / Next.
- Fetch data on mount and on page change using useEffect.

STYLING:
- Table rows with alternating subtle background colors.
- Hover effect on rows (slight highlight).
- Win/loss/draw colors consistent: green/red/gray.
- Responsive: on mobile, hide less important columns (time control, date) or stack vertically.

Verify:
- After playing some games, navigate to /history.
- Games appear in reverse chronological order with correct results, ratings, and opponent info.
- Clicking a game row navigates to /history/{id} (replay page — built in next step, for now it can 404 or show raw game data).
- Pagination works (if you have > 20 games).
```
