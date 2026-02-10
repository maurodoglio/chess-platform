# Chess Platform — Developer Specification

> **Version**: 1.0
> **Date**: 2026-02-08
> **Status**: Ready for implementation

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Authentication & Authorization](#4-authentication--authorization)
5. [Game Modes](#5-game-modes)
6. [Time Controls](#6-time-controls)
7. [Rating System](#7-rating-system)
8. [Game Logic & Validation](#8-game-logic--validation)
9. [Real-Time Communication (SignalR)](#9-real-time-communication-signalr)
10. [REST API](#10-rest-api)
11. [Database Schema](#11-database-schema)
12. [Chess AI — Stockfish WASM](#12-chess-ai--stockfish-wasm)
13. [User Interface](#13-user-interface)
14. [Game History & Replay](#14-game-history--replay)
15. [Error Handling](#15-error-handling)
16. [Security](#16-security)
17. [Deployment & Infrastructure](#17-deployment--infrastructure)
18. [Testing Plan](#18-testing-plan)
19. [Non-Functional Requirements](#19-non-functional-requirements)
20. [Scope Summary](#20-scope-summary)

---

## 1. Overview

A web-based chess platform that enables users to:

- **Play online** against other humans in real-time, matched by skill rating.
- **Play against a computer** (Stockfish AI) at three difficulty levels.
- **Play locally** in pass-and-play mode (two players, one device).

The platform is browser-only, responsive across desktop/tablet/phone, and features a rich, polished chess UI with animations, premoves, sounds, and customizable themes. There is no chat, no leaderboards, no chess variants — the focus is purely on core gameplay.

### Target Scale

- Up to **~100 concurrent players** at launch.
- Single-instance backend is sufficient; architecture does not need horizontal scaling for MVP.

---

## 2. Architecture

### High-Level Diagram

```
┌─────────────────────────────────────────────────────────┐
│                      Client (Browser)                   │
│                                                         │
│  ┌──────────┐  ┌───────────┐  ┌──────────────────────┐  │
│  │  React   │  │  chess.js  │  │  Stockfish WASM      │  │
│  │  (UI)    │  │  (logic)   │  │  (Web Worker, AI)    │  │
│  └────┬─────┘  └─────┬─────┘  └──────────────────────┘  │
│       │               │                                  │
│       └───────┬───────┘                                  │
│               │                                          │
└───────────────┼──────────────────────────────────────────┘
                │  SignalR (WebSocket)  +  REST (HTTPS)
                │
┌───────────────┼──────────────────────────────────────────┐
│               ▼          Backend (.NET)                   │
│  ┌──────────────────┐  ┌────────────────────┐            │
│  │  SignalR Hub      │  │  REST Controllers  │            │
│  │  (Game, Match)    │  │  (Auth, User, Games│            │
│  └────────┬─────────┘  └────────┬───────────┘            │
│           │                      │                        │
│  ┌────────▼──────────────────────▼───────────┐           │
│  │          Application Services              │           │
│  │  ┌──────────┐ ┌──────────┐ ┌────────────┐ │           │
│  │  │ Game     │ │ Match-   │ │  Rating    │ │           │
│  │  │ Engine   │ │ making   │ │  Service   │ │           │
│  │  └──────────┘ └──────────┘ └────────────┘ │           │
│  └───────────────────┬───────────────────────┘           │
│                      │                                    │
│  ┌───────────────────▼───────────────────────┐           │
│  │              PostgreSQL                    │           │
│  │  ┌────────┐  ┌────────┐  ┌─────────────┐  │           │
│  │  │ Users  │  │ Games  │  │ ActiveGames │  │           │
│  │  └────────┘  └────────┘  └─────────────┘  │           │
│  └───────────────────────────────────────────┘           │
└──────────────────────────────────────────────────────────┘
```

### Data Flow — Online Game Lifecycle

1. **User authenticates** via OAuth (Google/GitHub) or dev login (development only) → backend creates/retrieves user record → returns JWT.
2. **User joins matchmaking** → SignalR `JoinMatchmaking(timeControl)` → backend adds to in-memory queue.
3. **Match found** → backend pairs two players, creates an `ActiveGame` in memory, sends `GameStarted` to both clients.
4. **Gameplay loop** → client validates move locally (chess.js) → sends `MakeMove` via SignalR → backend validates independently → if legal, broadcasts `MoveMade` to opponent and updates server clock → if illegal, sends error to sender.
5. **Game ends** → backend detects terminal condition (checkmate, timeout, resignation, draw) → sends `GameOver` to both → persists game record to PostgreSQL → updates Elo ratings.

---

## 3. Technology Stack

| Layer | Technology | Version / Notes |
|---|---|---|
| **Frontend** | React with TypeScript | Latest stable (v18+). Use Vite for build tooling. |
| **UI Board Library** | react-chessboard or chessboard.js (React wrapper) | Drag-and-drop, animations, theming support. |
| **Chess Logic (Client)** | chess.js | Move generation, validation, game state management. |
| **Chess AI** | Stockfish WASM | Run in Web Worker. Use stockfish.js npm package. |
| **Backend** | ASP.NET Core 8+ (C#) | Minimal API or Controllers. |
| **Real-Time** | ASP.NET Core SignalR | WebSocket transport preferred, with fallback to SSE/long-polling. |
| **ORM** | Entity Framework Core | Code-first migrations targeting PostgreSQL. |
| **Database** | PostgreSQL 16+ | Via Npgsql EF Core provider. |
| **Auth** | ASP.NET Core Authentication | Google and GitHub OAuth with JWT bearer tokens for API/SignalR. OAuth schemes are registered conditionally — only when their ClientId is configured. |
| **Containerization** | Docker + Docker Compose | Multi-stage builds for both frontend and backend. |

### Recommended npm Packages (Frontend)

| Package | Purpose |
|---|---|
| `chess.js` | Chess move logic, validation, PGN/FEN |
| `react-chessboard` | Chessboard UI component with drag-and-drop |
| `@microsoft/signalr` | SignalR client for real-time communication |
| `stockfish.js` or `stockfish-nnue.wasm` | Stockfish engine in WASM |
| `react-router-dom` | Client-side routing |
| `zustand` or `@reduxjs/toolkit` | State management |
| `howler.js` or `use-sound` | Audio playback for move sounds |

### Recommended NuGet Packages (Backend)

| Package | Purpose |
|---|---|
| `Microsoft.AspNetCore.SignalR` | Built-in with ASP.NET Core |
| `Npgsql.EntityFrameworkCore.PostgreSQL` | EF Core PostgreSQL provider |
| `Microsoft.AspNetCore.Authentication.Google` | Google OAuth |
| `Microsoft.AspNetCore.Authentication.OAuth` | GitHub OAuth (generic OAuth handler) |
| `ChessDotNet` or custom implementation | Server-side chess validation |

---

## 4. Authentication & Authorization

### Flow

1. User clicks "Sign in with Google" or "Sign in with GitHub" on the login page.
2. Browser redirects to provider's OAuth consent screen.
3. Provider redirects back to `/api/auth/callback/{provider}` with authorization code.
4. Backend exchanges code for access token, fetches user profile (email, name, avatar).
5. Backend upserts the user in the `Users` table (match on `provider` + `provider_id`).
6. Backend issues a **JWT** (access token) and sets it as an HTTP-only cookie or returns it in the response body.
7. Client includes the JWT on all subsequent REST requests (`Authorization: Bearer <token>`) and SignalR connection.

### Dev Login (Development Only)

For local development without OAuth credentials, a bypass endpoint is available:

- `POST /api/auth/dev-login` with optional `{ displayName, providerId }` body.
- Creates/upserts a user with provider `"dev"` and sets the JWT cookie.
- **Also returns the JWT in the response body** (`{ message, userId, displayName, token }`). The frontend stores this token in `sessionStorage` (which is per-window), enabling two regular browser windows to authenticate as different users simultaneously. Without this, shared cookies would cause both windows to authenticate as the same user, breaking multiplayer testing.
- Returns **404 in production** — gated behind `IsDevelopment()` check.
- The login page shows two dev login buttons ("Dev Player 1" / "Dev Player 2") only when the frontend runs via `npm run dev` (Vite's `import.meta.env.DEV`).
- To test multiplayer: open two regular browser windows, log in as Player 1 in one and Player 2 in the other, then both navigate to "Play Online".

### Token Resolution Priority

The JWT bearer middleware resolves tokens in this priority order:

1. **`Authorization: Bearer <token>` header** — checked first by the default JWT handler. The frontend sends this from `sessionStorage` on all API calls. This enables per-window auth for dev login.
2. **`access_token` query parameter** — used by SignalR WebSocket connections. The frontend passes its `sessionStorage` token via `accessTokenFactory`.
3. **`auth_token` HTTP-only cookie** — fallback for OAuth flow (where the token is only set as a cookie, not returned in the response body).

This ordering is critical: if the cookie were checked first, two browser windows sharing the same cookie jar would both authenticate as whichever user logged in last.

### JWT Configuration

- The JWT bearer handler **must** set `MapInboundClaims = true` so that the standard `sub` claim is mapped to `ClaimTypes.NameIdentifier`. Without this, .NET 8+ defaults to `JsonWebTokenHandler` with `MapInboundClaims = false`, and code using `ClaimTypes.NameIdentifier` (GameHub, controllers) will fail to identify the user.
- OAuth schemes (Google, GitHub) **must** only be registered when their `ClientId` is configured (non-empty). If registered with an empty `ClientId`, `OAuthOptions.Validate()` throws an `ArgumentException` on every HTTP request through the auth middleware, breaking the entire app — including non-OAuth endpoints like dev-login.

### JWT Claims

```json
{
  "sub": "<user-uuid>",
  "name": "Display Name",
  "avatar": "https://...",
  "iat": 1700000000,
  "exp": 1700086400
}
```

- Token expiry: **24 hours**.
- No refresh tokens for MVP — user re-authenticates after expiry.

### Authorization Rules

| Resource | Rule |
|---|---|
| Login page | Public |
| Home page | Authenticated |
| Play online / matchmaking | Authenticated |
| Play vs computer | Authenticated |
| Pass-and-play | Authenticated (user must be logged in, but no opponent account needed) |
| Game history | Authenticated (own games only) |
| SignalR Hub | Authenticated (reject unauthenticated connections) |

---

## 5. Game Modes

### 5.1 Online Multiplayer

- **Matchmaking**: Players select a time control and join a queue. The server pairs players with the closest Elo rating.
- **Matchmaking algorithm**:
  1. Player joins queue for a specific time control (e.g., `blitz_5`).
  2. Server searches queue for opponent within ±100 Elo.
  3. Every 5 seconds, widen range by 50 (±150, ±200, …) up to ±500.
  4. After 60 seconds with no match, notify client — offer to keep waiting or cancel.
- **Color assignment**: Random (alternating if same pair rematches).
- **Game state**: Held in server memory (`ConcurrentDictionary<Guid, ActiveGame>`). Persisted to DB only on completion.
- **Disconnection handling**:
  - If a player disconnects, start a **60-second reconnection timer**.
  - If they reconnect in time, resume game with full state.
  - If timer expires, the disconnected player **forfeits**.
  - Notify the connected player of the disconnection status.

### 5.2 Play vs Computer

- Entirely client-side. No server involvement during gameplay.
- Player selects: difficulty (Easy/Medium/Hard), color (White/Black/Random), time control.
- Chess clock runs locally.
- Game is **not saved** to game history and has **no rating impact**.

### 5.3 Local Pass-and-Play

- Entirely client-side. No server involvement.
- Player selects: time control (or untimed).
- Board does **not** flip between turns (both players see from White's perspective, or add a toggle).
- Game is **not saved** and has **no rating impact**.

---

## 6. Time Controls

### Available Presets

| ID | Name | Base Time | Increment | Category |
|---|---|---|---|---|
| `bullet_1_0` | Bullet 1+0 | 1 min | 0 sec | Bullet |
| `bullet_2_1` | Bullet 2+1 | 2 min | 1 sec | Bullet |
| `blitz_3_0` | Blitz 3+0 | 3 min | 0 sec | Blitz |
| `blitz_5_0` | Blitz 5+0 | 5 min | 0 sec | Blitz |
| `blitz_5_2` | Blitz 5+2 | 5 min | 2 sec | Blitz |
| `rapid_10_0` | Rapid 10+0 | 10 min | 0 sec | Rapid |
| `rapid_15_10` | Rapid 15+10 | 15 min | 10 sec | Rapid |

### Clock Behavior

- **Online games**: Server is authoritative for time. Client receives `timeWhite` and `timeBlack` (milliseconds remaining) with every `MoveMade` event and interpolates locally between updates.
- **Flag (timeout)**: Server checks on each move and via a periodic timer. When a player's time reaches 0, the game ends immediately.
- **Increment**: Added to the moving player's clock **after** their move is validated by the server.
- **Latency compensation**: Server records the timestamp when it sends `MoveMade` and when it receives the next `MakeMove`. Network transit time (estimated via periodic SignalR pings) is subtracted from the player's consumed time, up to a cap of 500ms.

---

## 7. Rating System

### Elo Calculation

```
Expected score:  E = 1 / (1 + 10^((Ro - Rp) / 400))
New rating:      Rp' = Rp + K × (S - E)
```

Where:
- `Rp` = player's current rating
- `Ro` = opponent's current rating
- `S` = actual score (1 for win, 0.5 for draw, 0 for loss)
- `K` = K-factor

### K-Factor

| Condition | K |
|---|---|
| Player has < 20 games in this time control (provisional) | 40 |
| Player has ≥ 20 games and rating < 2400 | 20 |
| Player has ≥ 20 games and rating ≥ 2400 | 10 |

### Rules

- Separate rating per time control category: **Bullet**, **Blitz**, **Rapid**.
- Starting rating: **1200** for all categories.
- Ratings are updated **atomically** at game end (both players in a single transaction).
- Minimum rating floor: **100** (rating cannot drop below this).
- Rating changes are stored with each game record (`white_rating_before`, `white_rating_after`, etc.).

---

## 8. Game Logic & Validation

### Client-Side (chess.js)

Responsibilities:
- Generate and display legal moves when a piece is selected.
- Validate moves locally before sending to server (for instant UI feedback).
- Track game state: position (FEN), move history, turn, castling rights, en passant.
- Detect check (highlight king).
- Support premoves: allow queuing one move while waiting for opponent; validate when opponent's move arrives.

### Server-Side (.NET Chess Engine)

Responsibilities:
- Maintain an independent, authoritative `GameState` per active game.
- On receiving `MakeMove(gameId, move)`:
  1. Verify it is the sender's turn.
  2. Parse the move (UCI or algebraic notation, e.g., `e2e4` or `e4`).
  3. Validate the move is legal given the current position.
  4. Apply the move, update FEN, update clocks.
  5. Check for terminal conditions: checkmate, stalemate, threefold repetition, 50-move rule, insufficient material.
  6. If game over, compute rating changes, persist game, notify both clients.
  7. If not game over, broadcast `MoveMade` to opponent.
- On receiving `Resign`, `OfferDraw`, `AcceptDraw`: validate that the caller is a participant in the game and the action is valid given the current game state.

### Move Format

Use **UCI notation** for client↔server communication (e.g., `e2e4`, `e7e8q` for promotion). The client and server both convert to/from SAN (Standard Algebraic Notation) for display and PGN storage.

---

## 9. Real-Time Communication (SignalR)

### Hub: `/hubs/game`

Requires authenticated connection (JWT in query string or header).

#### Server → Client Events

| Event | Payload | Description |
|---|---|---|
| `GameStarted` | `{ gameId, opponentName, opponentAvatar, playerColor, timeControl, initialTimeMs }` | Match found; initialize board. |
| `MoveMade` | `{ move, fen, timeWhiteMs, timeBlackMs, moveNumber }` | Opponent moved; update board and clocks. |
| `GameOver` | `{ result, reason, ratingChange, newRating }` | Game ended. |
| `DrawOffered` | `{}` | Opponent offers a draw. |
| `DrawDeclined` | `{}` | Opponent declined your draw offer. |
| `OpponentDisconnected` | `{ reconnectionDeadlineUtc }` | Opponent lost connection. |
| `OpponentReconnected` | `{}` | Opponent is back. |
| `MatchmakingStatus` | `{ status, estimatedWaitSec }` | Queue update (searching, widening range, etc.). |
| `IllegalMove` | `{ attemptedMove, reason }` | Your move was rejected by the server. |

#### Client → Server Methods

| Method | Parameters | Description |
|---|---|---|
| `JoinMatchmaking` | `timeControlId: string` | Enter matchmaking queue. |
| `LeaveMatchmaking` | — | Exit matchmaking queue. |
| `MakeMove` | `gameId: Guid, move: string` | Submit a move (UCI notation). |
| `Resign` | `gameId: Guid` | Resign the current game. |
| `OfferDraw` | `gameId: Guid` | Offer a draw to the opponent. |
| `AcceptDraw` | `gameId: Guid` | Accept a pending draw offer. |
| `DeclineDraw` | `gameId: Guid` | Decline a pending draw offer. |

#### Connection Lifecycle

- On connect: authenticate via JWT, associate the `ConnectionId` with the user.
- On disconnect: if the user is in a game, start the 60-second reconnection timer. If in matchmaking, remove from queue.
- On reconnect: re-associate `ConnectionId`, cancel reconnection timer if in a game, send full game state to client.
- **Important**: The `JoinMatchmaking` method must check if the player has an **active** game (not just any game). Completed games remain in the `_playerToGame` mapping until removed, so checking `GetGameByPlayer(userId) != null` without filtering by `GameStatus.Active` would incorrectly block players from queuing for new games.

#### Frontend SignalR Connection

- The SignalR connection is a **singleton** (`GameHubService` instance) shared across all pages.
- The `useGameHub` hook connects the singleton on mount but **does not disconnect on unmount**. React StrictMode double-mounts in development, and disconnecting the singleton during cleanup kills the connection for the second mount, leaving `invoke()` calls silently failing (due to `this.connection?.invoke()` optional chaining on a null connection).
- The connection persists across page navigations (e.g., Home → Play Online → back) and is only closed when the browser tab closes.

---

## 10. REST API

### Base URL: `/api`

All endpoints require authentication unless marked otherwise.

#### Authentication

| Method | Path | Auth | Request | Response | Notes |
|---|---|---|---|---|---|
| GET | `/auth/login/{provider}` | Public | — | 302 Redirect to OAuth | `provider` = `google` or `github` |
| GET | `/auth/callback/{provider}` | Public | OAuth query params | Set-Cookie (JWT) + 302 to home | Exchange code, create/fetch user |
| POST | `/auth/dev-login` | Public | `{ displayName?, providerId? }` | Set-Cookie (JWT) + `{ message, userId, displayName, token }` | **Development only.** Creates a test user without OAuth. Returns JWT in body for per-window `sessionStorage`. Returns 404 in production. |
| POST | `/auth/logout` | Auth | — | 200 OK | Clear auth cookie |

#### User

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/user/me` | Auth | — | `{ id, displayName, avatarUrl, ratingBullet, ratingBlitz, ratingRapid }` |

#### Games

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/games` | Auth | `?page=1&pageSize=20` | `{ games: [...], totalCount, page, pageSize }` |
| GET | `/games/{id}` | Auth | — | `{ id, white, black, timeControl, result, termination, pgn, finalFen, timestamps, ratings }` |

#### Response Envelope

All API responses use a consistent envelope:

```json
// Success
{
  "data": { ... },
  "error": null
}

// Error
{
  "data": null,
  "error": {
    "code": "GAME_NOT_FOUND",
    "message": "The requested game does not exist."
  }
}
```

#### HTTP Status Codes

| Code | Usage |
|---|---|
| 200 | Successful GET |
| 302 | OAuth redirects |
| 400 | Bad request / validation failure |
| 401 | Not authenticated |
| 403 | Not authorized (accessing another user's data) |
| 404 | Resource not found |
| 500 | Internal server error |

---

## 11. Database Schema

### Entity-Relationship

```
Users 1──────M Games (as white_player)
Users 1──────M Games (as black_player)
```

### Table: `users`

| Column | Type | Constraints | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` | PK | `gen_random_uuid()` | |
| `provider` | `VARCHAR(20)` | NOT NULL | | `google` or `github` |
| `provider_id` | `VARCHAR(255)` | NOT NULL | | Unique ID from provider |
| `display_name` | `VARCHAR(100)` | NOT NULL | | |
| `avatar_url` | `VARCHAR(500)` | | | |
| `rating_bullet` | `INT` | NOT NULL | `1200` | |
| `rating_blitz` | `INT` | NOT NULL | `1200` | |
| `rating_rapid` | `INT` | NOT NULL | `1200` | |
| `games_played_bullet` | `INT` | NOT NULL | `0` | For K-factor calculation |
| `games_played_blitz` | `INT` | NOT NULL | `0` | |
| `games_played_rapid` | `INT` | NOT NULL | `0` | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | |

**Indexes:**
- `UNIQUE (provider, provider_id)`

### Table: `games`

| Column | Type | Constraints | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` | PK | `gen_random_uuid()` | |
| `white_player_id` | `UUID` | FK → users(id), NOT NULL | | |
| `black_player_id` | `UUID` | FK → users(id), NOT NULL | | |
| `time_control` | `VARCHAR(20)` | NOT NULL | | e.g., `blitz_5_0` |
| `result` | `VARCHAR(10)` | NOT NULL | | `white`, `black`, `draw` |
| `termination` | `VARCHAR(30)` | NOT NULL | | `checkmate`, `timeout`, `resignation`, `stalemate`, `draw_agreement`, `draw_repetition`, `draw_50_move`, `draw_insufficient`, `abort` |
| `pgn` | `TEXT` | NOT NULL | | Full PGN |
| `final_fen` | `VARCHAR(100)` | NOT NULL | | |
| `white_rating_before` | `INT` | NOT NULL | | |
| `black_rating_before` | `INT` | NOT NULL | | |
| `white_rating_after` | `INT` | NOT NULL | | |
| `black_rating_after` | `INT` | NOT NULL | | |
| `started_at` | `TIMESTAMPTZ` | NOT NULL | | |
| `ended_at` | `TIMESTAMPTZ` | NOT NULL | | |

**Indexes:**
- `INDEX (white_player_id, ended_at DESC)`
- `INDEX (black_player_id, ended_at DESC)`

### In-Memory Structures (Not Persisted)

#### ActiveGame (Server Memory)

```csharp
class ActiveGame
{
    Guid Id;
    Guid WhitePlayerId;
    Guid BlackPlayerId;
    string WhiteConnectionId;
    string BlackConnectionId;
    string CurrentFen;
    List<string> Moves;          // UCI notation
    Color Turn;                  // White or Black
    long TimeWhiteMs;
    long TimeBlackMs;
    int IncrementMs;
    DateTime LastMoveTimestamp;
    DrawOfferState DrawOffer;    // None, OfferedByWhite, OfferedByBlack
    GameStatus Status;           // Active, Completed
}
```

#### MatchmakingQueue (Server Memory)

```csharp
class QueueEntry
{
    Guid UserId;
    string ConnectionId;
    int Rating;
    string TimeControlId;
    DateTime JoinedAt;
    int CurrentRangeExpansion;    // Widens over time
}
```

---

## 12. Chess AI — Stockfish WASM

### Integration

1. Bundle `stockfish.wasm` and its JS glue as static assets.
2. On "Play vs Computer" start, spawn a **Web Worker** that loads Stockfish.
3. Communicate with the worker via `postMessage` / `onmessage`.

### UCI Protocol Commands

```
// Initialize
uci
isready

// Set difficulty
setoption name Skill Level value <level>

// Set position and request move
position fen <current_fen>
go depth <max_depth>

// Parse response
bestmove <move_uci>
```

### Difficulty Presets

| Difficulty | Skill Level | Search Depth | Simulated Think Time |
|---|---|---|---|
| **Easy** | 3 | 3 | 500ms – 1500ms |
| **Medium** | 10 | 8 | 1000ms – 3000ms |
| **Hard** | 20 | 18 | 1500ms – 5000ms |

- **Simulated think time**: Add a random delay within the range before playing the engine's move, so it feels more natural (not instant).
- Terminate the Web Worker when the game ends to free resources.

---

## 13. User Interface

### 13.1 Pages & Routing

| Route | Page | Description |
|---|---|---|
| `/login` | Login | Social login buttons (Google, GitHub). Redirect to home if authenticated. |
| `/` | Home | Mode selection: Play Online, Play vs Computer, Pass-and-Play. Shows user's ratings. |
| `/play/online` | Online Game | Matchmaking → active game board. |
| `/play/computer` | vs Computer | Difficulty/color selection → game board. |
| `/play/local` | Pass-and-Play | Time control selection → game board. |
| `/history` | Game History | Paginated list of past games. |
| `/history/:id` | Replay | Replay viewer for a specific game. |

### 13.2 Chessboard Component

**Interactions:**
- **Drag-and-drop**: Pick up a piece and drop on target square.
- **Click-to-move**: Click piece, then click destination. Show legal move indicators (dots on empty squares, rings on capturable pieces).
- **Premove**: When it's the opponent's turn, allow the player to pre-select a move. Render premove with a translucent highlight. Execute automatically when the opponent moves (if still legal), otherwise cancel silently.
- **Right-click**: Cancel premove / deselect piece.

**Visual Elements:**
- Coordinate labels (a-h, 1-8) along edges.
- Last move highlight: colored overlay on the from/to squares.
- Check highlight: red tint or border on the king's square.
- Promotion dialog: popup with Queen/Rook/Bishop/Knight choice when a pawn reaches the 8th rank.

**Animations:**
- Piece slides smoothly from origin to destination (~150ms CSS transition or spring animation).
- Captured piece fades briefly before being removed.
- Board flip animation when orientation changes.

**Themes & Customization** (stored in `localStorage`):
- Board colors: Green (default), Brown, Blue.
- Piece sets: Classic (default), Neo, Pixel — or use SVG piece sets from open-source libraries.
- Allow toggling sound on/off.

### 13.3 Game Panel

```
┌─────────────────────────────┐
│  Opponent Name    ♟♟♝  5:00 │  ← opponent info, captured pieces, clock
├─────────────────────────────┤
│                             │
│        Chessboard           │
│                             │
├─────────────────────────────┤
│  Your Name        ♙♙   4:32 │  ← your info, captured pieces, clock
├─────────────────────────────┤
│  1. e4 e5  2. Nf3 Nc6 ...  │  ← move list (scrollable)
├─────────────────────────────┤
│  [Resign] [Offer Draw]     │  ← action buttons
└─────────────────────────────┘
```

- **Clock**: Counts down in real-time. Active clock is visually prominent (bold, colored). Shows tenths of seconds when under 10 seconds.
- **Captured pieces**: Small icons grouped by piece type. Show material point differential (e.g., "+3").
- **Move list**: Two-column format (white/black). Scrolls to latest. Clickable in replay mode.
- **Action buttons**:
  - **Resign**: Confirm dialog ("Are you sure?").
  - **Offer Draw**: Disabled if a draw offer is already pending. Shows "Draw offered — waiting" state.
  - **Abort**: Only visible in the first 2 full moves. Cancels the game with no rating change.

### 13.4 Sounds

| Event | Sound |
|---|---|
| Move (non-capture) | Soft wood tap |
| Capture | Louder thud |
| Check | Sharp ping |
| Castle | Double tap |
| Game start | Short fanfare / ping |
| Game end | Result-dependent chime |
| Premove execute | Soft click |
| Illegal move attempt | Error buzz (subtle) |

Use short audio files (MP3/OGG, < 50KB each). Preload on game start.

### 13.5 Responsive Breakpoints

| Breakpoint | Layout |
|---|---|
| **Desktop** (≥1024px) | Board on left, game panel on right (side-by-side). |
| **Tablet** (768–1023px) | Board on top (80% width), panel below. |
| **Mobile** (<768px) | Board fills width, panel below. Move list collapsed by default (expandable). Action buttons as icons. |

---

## 14. Game History & Replay

### Game History Page

- Paginated table (20 games per page).
- Columns: **Date**, **Opponent**, **Result** (W/L/D with color coding), **Time Control**, **Rating Change** (+/−).
- Click a row to open the replay viewer.

### Replay Viewer

- Full chessboard rendering of the game.
- Controls: **⏮ Start**, **◀ Back**, **▶ Forward**, **⏭ End**, **▶ Autoplay** (1 move/sec).
- Move list is displayed and highlighted in sync with the board position.
- Keyboard shortcuts: ← (back), → (forward), Home (start), End (end).
- No analysis or engine evaluation — purely replay.

---

## 15. Error Handling

### Frontend Error Handling

| Scenario | Behavior |
|---|---|
| **SignalR connection lost** | Show "Reconnecting…" banner. Auto-retry with exponential backoff (1s, 2s, 4s, 8s, max 30s). After 5 failures, show "Connection lost" with manual reconnect button. |
| **Illegal move rejected by server** | Revert the piece to its original square. Show brief toast: "Illegal move." Resync board with server FEN. |
| **OAuth login failure** | Show error message on login page: "Login failed. Please try again." Log details to console. |
| **API error (4xx/5xx)** | Show user-friendly toast notification. Do not expose internal details. |
| **Stockfish WASM fails to load** | Show error: "Chess engine failed to load. Please refresh." Disable "Play vs Computer" mode. |
| **Game state desync** | If client FEN diverges from server FEN (detected on `MoveMade`), force-resync the board from the server's FEN. Show brief toast. |

### Backend Error Handling

| Scenario | Behavior |
|---|---|
| **Invalid move received** | Return `IllegalMove` event with reason. Do not update game state. Log at WARN level. |
| **Player sends move for wrong game** | Ignore. Log at WARN level. |
| **Player sends move out of turn** | Return error event. Do not update state. |
| **Database failure on game persist** | Retry up to 3 times with backoff. If all retries fail, log at ERROR, rating changes are lost. Consider an outbox pattern for critical writes. |
| **Player not found in matchmaking** | Return error event. Log at WARN. |
| **Duplicate matchmaking join** | Ignore duplicate. Return current matchmaking status. |
| **SignalR hub exception** | Catch in hub filter/middleware. Log full exception. Return sanitized error to client. |
| **Unhandled exception** | Global exception handler logs at ERROR. Returns 500 with generic message. |

### Logging

- Use **structured logging** (Serilog recommended) with JSON output.
- Log levels: DEBUG for move-by-move details (disable in production), INFO for game events (start, end, matchmaking), WARN for recoverable issues, ERROR for failures.
- Include correlation IDs: `gameId`, `userId` in all game-related logs.

---

## 16. Security

### Authentication Security

- OAuth state parameter to prevent CSRF during login flow.
- JWT stored in HTTP-only, Secure, SameSite=Strict cookie.
- JWT validated on every API request and SignalR connection.
- No sensitive data in JWT payload (no email, no provider tokens).

### Game Integrity

- **Server-side move validation**: Every move is independently validated. Client is never trusted.
- **Clock authority**: Server is the sole source of truth for time remaining in online games.
- **Rate limiting**: Max 5 moves per second per player (reject excess). Prevents scripted rapid-fire moves.
- **Input sanitization**: Validate move format (UCI regex: `^[a-h][1-8][a-h][1-8][qrbn]?$`) before processing.
- **CORS**: Restrict to the frontend's origin only.
- **HTTPS**: Enforce TLS in production. Redirect HTTP to HTTPS.

### General

- No user-generated content (no chat, no custom names beyond OAuth display name).
- Rate limit API endpoints: 60 requests/minute per user.
- Helmet-style security headers (Content-Security-Policy, X-Frame-Options, etc.).

---

## 17. Deployment & Infrastructure

### Docker Compose

```yaml
version: "3.8"

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "5000:5000"
    environment:
      - ConnectionStrings__DefaultConnection=Host=postgres;Database=chessplatform;Username=chess;Password=${DB_PASSWORD}
      - Auth__Google__ClientId=${GOOGLE_CLIENT_ID}
      - Auth__Google__ClientSecret=${GOOGLE_CLIENT_SECRET}
      - Auth__GitHub__ClientId=${GITHUB_CLIENT_ID}
      - Auth__GitHub__ClientSecret=${GITHUB_CLIENT_SECRET}
      - Auth__Jwt__Secret=${JWT_SECRET}
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=chessplatform
      - POSTGRES_USER=chess
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U chess -d chessplatform"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

### Frontend Dockerfile (Multi-Stage)

```dockerfile
# Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Serve
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

### Backend Dockerfile (Multi-Stage)

```dockerfile
# Build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY *.csproj ./
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app

# Run
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app .
ENTRYPOINT ["dotnet", "ChessPlatform.dll"]
```

### Environment Variables

| Variable | Description |
|---|---|
| `DB_PASSWORD` | PostgreSQL password |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GITHUB_CLIENT_ID` | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth client secret |
| `JWT_SECRET` | Secret key for signing JWTs (min 256-bit) |

### Database Migrations

- Use EF Core migrations (`dotnet ef migrations add`, `dotnet ef database update`).
- Run migrations automatically on application startup in development.
- In production, run migrations as a separate step before deploying new versions.

---

## 18. Testing Plan

### 18.1 Unit Tests

**Backend (xUnit + Moq)**

| Area | Tests |
|---|---|
| **Chess engine / validation** | Legal move validation for all piece types. Edge cases: castling (king-side, queen-side, blocked, through check), en passant, pawn promotion, pinned pieces. Illegal move rejection. |
| **Game state management** | FEN generation after moves. Turn tracking. Draw detection (threefold repetition, 50-move rule, insufficient material). Checkmate and stalemate detection. |
| **Rating service** | Elo calculation: standard case, provisional K-factor, minimum rating floor. Symmetric updates (winner gains what loser loses ± rounding). |
| **Matchmaking service** | Pairing within rating range. Range expansion over time. Queue removal on cancel/disconnect. |
| **Auth service** | JWT generation with correct claims. Token validation. User upsert logic (new user vs returning user). |

**Frontend (Vitest + React Testing Library)**

| Area | Tests |
|---|---|
| **Chess logic (chess.js wrapper)** | Move generation, validation, FEN parsing. |
| **Board component** | Renders correct pieces from FEN. Highlights legal moves on piece selection. Handles promotion dialog. |
| **Clock component** | Counts down correctly. Displays tenths under 10 seconds. |
| **Game state management** | State transitions: idle → matchmaking → playing → game over. |
| **Replay viewer** | Navigate forward/back through moves. Board reflects correct position at each step. |

### 18.2 Integration Tests

**Backend (xUnit + TestServer + Testcontainers)**

| Test | Description |
|---|---|
| **Full game flow** | Two simulated clients connect via SignalR, join matchmaking, get paired, play a complete game (Scholar's Mate), verify game persisted to DB with correct PGN and ratings. |
| **Matchmaking pairing** | Multiple clients join queue; verify closest-rated players are paired first. |
| **Disconnection/reconnection** | Simulate client disconnect during a game. Verify reconnection restores state. Verify timeout forfeit if reconnection fails. |
| **Concurrent games** | Multiple games running simultaneously. Moves in one game do not affect another. |
| **Auth flow** | Mock OAuth provider. Verify user creation, JWT issuance, and authenticated API access. |
| **Illegal move handling** | Client sends illegal move via SignalR. Verify rejection and game state unchanged. |
| **Rating update correctness** | Play a game to completion. Verify both players' ratings updated correctly in the database. |
| **Game history API** | Complete a game, then fetch via REST API. Verify all fields (PGN, ratings, result) are correct. |

### 18.3 End-to-End Tests

**Tools: Playwright**

| Test | Description |
|---|---|
| **Login flow** | Navigate to login page, click "Sign in with Google" (mocked OAuth), verify redirect to home page with user info displayed. |
| **Play vs Computer** | Select Easy difficulty, play a few moves, verify AI responds, verify clock ticks. |
| **Online game (dual browser)** | Open two browser contexts, both log in, both join matchmaking, verify they are paired, play a game to checkmate, verify game over screen and rating change. |
| **Pass-and-play** | Start a local game, make moves for both sides, verify turns alternate correctly, verify clock behavior. |
| **Game history & replay** | Complete an online game, navigate to history, find the game, open replay, step through moves, verify board matches expectations. |
| **Responsive layout** | Run board tests at mobile viewport (375px). Verify board fits screen, controls are accessible. |
| **Premove** | In an online game, make a premove while waiting for opponent. Verify it executes after opponent moves. |
| **Resign and draw** | Test resign (with confirmation), offer draw, accept draw, decline draw flows. |

### 18.4 Performance Tests

| Test | Tool | Target |
|---|---|---|
| **SignalR throughput** | k6 or custom .NET benchmark | 100 concurrent WebSocket connections with moves every 2 seconds. Server response time < 50ms p99. |
| **API response time** | k6 | `/api/games` and `/api/user/me` respond in < 200ms p95 under 100 concurrent users. |
| **Client rendering** | Lighthouse | Board interaction (move piece) paints in < 100ms. No layout shift during gameplay. |
| **Stockfish WASM load** | Manual / Playwright timing | Engine ready within 3 seconds on mid-range hardware. |

### 18.5 Test Coverage Targets

| Layer | Target |
|---|---|
| Backend unit tests | ≥ 80% line coverage |
| Frontend unit tests | ≥ 70% line coverage |
| Integration tests | All critical paths covered (auth, matchmaking, full game, rating) |
| E2E tests | All user-facing flows covered |

---

## 19. Non-Functional Requirements

| Requirement | Target |
|---|---|
| **Availability** | 99% uptime (acceptable for small scale) |
| **Latency** | < 100ms move feedback (client-side); < 200ms round-trip for SignalR moves |
| **Browser support** | Latest versions of Chrome, Firefox, Safari, Edge |
| **Accessibility** | Keyboard navigable. ARIA labels on interactive elements. High contrast themes. |
| **Localization** | English only for MVP |
| **Data retention** | Game history kept indefinitely |
| **Backup** | Daily PostgreSQL backup via `pg_dump` (cron job or Docker sidecar) |

### Excluded from MVP

- Chat / messaging
- Leaderboards / public profiles
- Post-game analysis engine
- Chess variants (960, Crazyhouse, etc.)
- Mobile native apps
- Guest play (account required)
- Challenge links / friend invites
- Daily / correspondence games
- Tournaments

---

## 20. Scope Summary

### In Scope

- ✅ Social login (Google, GitHub)
- ✅ Online multiplayer with Elo-based matchmaking
- ✅ Play vs Stockfish WASM (Easy / Medium / Hard)
- ✅ Local pass-and-play
- ✅ Bullet, Blitz, Rapid time controls
- ✅ Separate Elo ratings per time control
- ✅ Rich chessboard UI (drag-and-drop, animations, premoves, sounds, themes)
- ✅ Game history and move-by-move replay viewer
- ✅ Responsive design (desktop, tablet, mobile)
- ✅ Server-side move validation
- ✅ Docker Compose deployment
- ✅ Comprehensive error handling and reconnection logic
- ✅ Unit, integration, E2E, and performance tests

### Out of Scope

- ❌ Mobile native apps
- ❌ Chat / messaging
- ❌ Leaderboards / public profiles
- ❌ Post-game analysis engine
- ❌ Chess variants
- ❌ Guest play
- ❌ Challenge links / friend invites
- ❌ Daily / correspondence games
- ❌ Tournaments
