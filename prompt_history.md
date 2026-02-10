# Chess Platform — Prompt History

This document captures the full conversation that led to the design, specification, and implementation of the chess platform.

---

## Phase 1: Brainstorming & Requirements Gathering

### Q1: What platforms do you want to support?
**Answer:** Web only (browser-based)

### Q2: What game modes should players have access to?
**Answer:** Both (humans and computer) + local pass-and-play (two players, one device)

### Q3: What time controls should be available?
**Answer:** Bullet (1-2 min), Blitz (3-5 min), Rapid (10-15 min) — all timed

### Q4: Should the platform have a player rating/ranking system?
**Answer:** Yes — separate Elo-style ratings per time control (like chess.com)

### Q5: How should users authenticate and create accounts?
**Answer:** Social logins only (Google, GitHub, etc.)

### Q6: For online multiplayer, how should players find opponents?
**Answer:** Random matchmaking only (pair players by rating)

### Q7: Should the platform offer post-game features like game history, analysis, or replay?
**Answer:** Yes — basic game history (list of past games, results, and replays)

### Q8: For the "Play vs Computer" mode, what difficulty options?
**Answer:** Easy / Medium / Hard (3 levels)

### Q9: What level of UI/UX polish are you aiming for?
**Answer:** Rich — animations, premoves, draw/resign buttons, captured pieces display

### Q10: Should there be any social or communication features?
**Answer:** No chat at all

### Q11: Do you have a preference for the technology stack?
**Answer:** React (frontend) + .NET/C# (backend) + SignalR

### Q12: What database do you want to use?
**Answer:** PostgreSQL

### Q13: Where should the chess game logic run?
**Answer:** Client-side with server validation — fast UX, server verifies legality

### Q14: What's your deployment/hosting preference?
**Answer:** Docker containers with orchestration (Kubernetes, Docker Compose)

### Q15: What scale are you targeting initially?
**Answer:** Small — up to ~100 concurrent players

### Q16: Should there be a leaderboard or player profile pages?
**Answer:** No — just play games

### Q17: For the computer opponent, what approach should the AI engine use?
**Answer:** Use an existing open-source chess engine (e.g., Stockfish compiled to WebAssembly)

### Q18: Should the platform support any chess variants?
**Answer:** Standard chess only

### Q19: Should the web app be responsive/mobile-friendly?
**Answer:** Yes — responsive design that works well on phones and tablets

---

## Phase 2: Specification

After brainstorming, the findings were compiled into a comprehensive developer-ready specification saved as `spec.md`. The spec covers 20 sections:

1. Overview
2. Architecture (with data flow diagrams)
3. Technology Stack (React + .NET + SignalR + PostgreSQL)
4. Authentication & Authorization (Google/GitHub OAuth + JWT)
5. Game Modes (Online Multiplayer, vs Computer, Pass-and-Play)
6. Time Controls (Bullet, Blitz, Rapid presets)
7. Rating System (Elo with per-time-control ratings)
8. Game Logic & Validation (client-side + server-side)
9. Real-Time Communication (SignalR hub methods)
10. REST API (auth, user, games endpoints)
11. Database Schema (users + games tables)
12. Chess AI (Stockfish WASM in Web Worker)
13. User Interface (rich board, clocks, themes, premoves)
14. Game History & Replay
15. Error Handling (frontend + backend strategies)
16. Security (OAuth, JWT, move validation, rate limiting)
17. Deployment & Infrastructure (Docker Compose)
18. Testing Plan (unit, integration, E2E, performance)
19. Non-Functional Requirements
20. Scope Summary (in-scope vs out-of-scope)

---

## Phase 3: Implementation Plan — 26 Prompts

The spec was broken down into 26 incremental implementation prompts, each building on the previous one with no orphaned code. Prompts were saved as individual files in the `prompts/` directory.

### Prompt Sequence

| # | File | Description |
|---|---|---|
| 01 | `01-backend-scaffold.md` | ASP.NET Core project + Docker Compose + PostgreSQL + /health endpoint |
| 02 | `02-ef-core-user-entity.md` | EF Core + User entity + initial migration + auto-migrate in dev |
| 03 | `03-oauth-authentication.md` | Google & GitHub OAuth + JWT issuance + /api/user/me endpoint |
| 04 | `04-frontend-scaffold.md` | Vite + React + TypeScript + React Router + proxy config |
| 05 | `05-login-auth-wiring.md` | Auth context + login page + protected routes + session flow |
| 06 | `06-home-page-modes.md` | Home page with mode selection cards + stub pages + layout |
| 07 | `07-chess-engine-service.md` | Server-side chess engine (move validation, game endings) + unit tests |
| 08 | `08-signalr-hub-setup.md` | SignalR GameHub + connection tracking + auth + hub filter |
| 09 | `09-game-state-manager.md` | In-memory ActiveGame model + GameStateManager + time controls |
| 10 | `10-matchmaking-service.md` | Rating-based matchmaking queue + background service + SignalR wiring |
| 11 | `11-frontend-chessboard.md` | react-chessboard + chess.js + legal moves + drag-and-drop |
| 12 | `12-signalr-client-matchmaking.md` | SignalR client service + matchmaking UI + time control selection |
| 13 | `13-online-game-flow.md` | Full game flow: moves, resign, draw, game over (backend + frontend) |
| 14 | `14-server-side-clocks.md` | Clock service + time deduction + increment + flag detection |
| 15 | `15-frontend-clocks.md` | ChessClock component + GamePanel + CapturedPieces + MoveList |
| 16 | `16-game-persistence-ratings.md` | Game entity + Elo rating service + PGN + game completion |
| 17 | `17-game-history.md` | REST API for game history + paginated frontend page |
| 18 | `18-replay-viewer.md` | Move-by-move replay with navigation + keyboard controls |
| 19 | `19-stockfish-wasm.md` | Stockfish WASM Web Worker + fallback AI + difficulty presets |
| 20 | `20-play-vs-computer.md` | Computer game setup + AI auto-play + local clocks |
| 21 | `21-pass-and-play.md` | Local two-player mode + name inputs + untimed option |
| 22 | `22-sounds-animations.md` | Web Audio sounds + piece animations + check pulse + game flash |
| 23 | `23-themes-premoves.md` | 3 board themes + settings panel + premove system |
| 24 | `24-error-handling-reconnection.md` | Reconnection timers + game resync + toast notifications |
| 25 | `25-responsive-design.md` | Responsive breakpoints + dynamic board sizing + mobile layout |
| 26 | `26-docker-production.md` | Production Dockerfiles + Nginx + docker-compose.prod.yml + README |

---

## Phase 4: Implementation Execution

All 26 prompts were executed in order. Each step was verified before moving to the next.

### Execution Summary

**Phase 1: Backend Foundation (Prompts 1-3)**
- Created ASP.NET Core 8 project with Docker Compose + PostgreSQL
- Added EF Core with User entity, snake_case PostgreSQL schema, auto-migration
- Implemented Google & GitHub OAuth with JWT cookie authentication
- Endpoints: /health, /api/auth/login/{provider}, /api/auth/callback/{provider}, /api/auth/logout, /api/user/me

**Phase 2: Frontend Foundation (Prompts 4-6)**
- Scaffolded Vite + React + TypeScript with React Router
- Built auth context, protected routes, login page with OAuth buttons
- Created home page with mode selection cards (Play Online, vs Computer, Pass & Play)
- Added Layout component with nav bar

**Phase 3: Game Infrastructure (Prompts 7-10)**
- Built server-side chess engine using Gera.Chess NuGet package
- Created SignalR GameHub with JWT auth and connection tracking
- Implemented in-memory GameStateManager with ActiveGame model
- Built matchmaking service with rating-based pairing and progressive range expansion
- 25 unit tests passing

**Phase 4: Online Play (Prompts 11-13)**
- Created interactive ChessBoard component (react-chessboard + chess.js)
- Built SignalR client service with auto-reconnect
- Implemented full online game flow: matchmaking → moves → resign/draw → game over
- GameOverDialog with result display

**Phase 5: Clocks & Persistence (Prompts 14-16)**
- Server-side ClockService with time deduction, increment, latency grace (100ms)
- FlagDetectionService (500ms polling) for timeout detection
- Frontend ChessClock with requestAnimationFrame countdown + tenths display
- GamePanel component (clocks + captured pieces + move list + action buttons)
- Game entity + Elo rating service (K=40/20/10) + PGN generation
- GameCompletionService persists games + updates ratings in single transaction
- 38 unit tests passing

**Phase 6: History & Replay (Prompts 17-18)**
- REST API: GET /api/games (paginated), GET /api/games/{id}
- Game history page with result indicators, rating changes, pagination
- Replay viewer with forward/back/auto-play, keyboard shortcuts, clickable move list

**Phase 7: Offline Modes (Prompts 19-21)**
- Stockfish WASM integration with Web Worker + fallback AI (random/capture-preference)
- Play vs Computer: difficulty selection, color choice, time control, AI auto-play
- Pass-and-Play: name inputs, untimed option, resign per color, declare draw

**Phase 8: Polish (Prompts 22-23)**
- Web Audio API sound effects (move, capture, check, castle, game start/end)
- Sound toggle persisted to localStorage
- Piece slide animation (150ms), check pulse, board fade-in, game-over flash
- 3 board themes (Classic Green, Wooden Brown, Ocean Blue) with settings panel
- Premove system: queue move during opponent's turn, auto-execute on opponent move

**Phase 9: Robustness (Prompts 24-25)**
- ReconnectionTimerService: 60s timeout, forfeit on expiry
- Game state resync on reconnect (GameResynced event)
- Toast notification system (info/success/error/warning)
- ConnectionBanner (reconnecting/disconnected states)
- Global API error middleware
- Responsive design: 3 breakpoints (mobile/tablet/desktop)
- Dynamic board sizing, collapsible move list on mobile, touch-friendly controls

**Phase 10: Deployment (Prompt 26)**
- Production Dockerfiles (multi-stage: node→nginx, dotnet sdk→aspnet)
- Nginx config with API proxy, WebSocket support, SPA fallback, gzip, security headers
- docker-compose.prod.yml with postgres healthcheck
- .env.example with all required variables
- README.md with dev/prod/test instructions

### Final Verification
- **Backend**: 38 tests passing, 0 failures
- **Frontend**: Builds cleanly (463 KB JS, 3.5 KB CSS)
- **Docker**: Both images build successfully (frontend: node→nginx, backend: dotnet 10 sdk→aspnet 10)
- **All 26 prompts**: ✅ Complete

---

## Phase 5: Post-Implementation Refinements

### Dev Auth Bypass
After implementation, a dev bypass auth mode was added to enable local testing without setting up OAuth credentials:

- **Backend**: `POST /api/auth/dev-login` endpoint, gated behind `IsDevelopment()` (returns 404 in production). Accepts `{ displayName, providerId }`, creates a test user with provider `"dev"`, and sets the JWT cookie.
- **Frontend**: Two dev login buttons on the login page ("Dev Player 1" / "Dev Player 2"), visible only in Vite dev mode (`import.meta.env.DEV`). AuthContext gained a `refreshUser()` method to re-fetch user state after dev login.
- **Usage**: Open two browser windows (regular + incognito), log in as Player 1 in one and Player 2 in the other to test multiplayer.

### Docker Image Fixes
- Dockerfiles updated from `dotnet/sdk:8.0` → `dotnet/sdk:10.0` to match the project's `net10.0` target framework.
- Added `.dockerignore` files for both backend (`bin/`, `obj/`) and frontend (`node_modules/`, `dist/`) to prevent stale local artifacts from leaking into containers.
- Updated nginx base image from `nginx:1.25-alpine` → `nginx:alpine`.
