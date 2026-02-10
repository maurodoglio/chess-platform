# Chess Platform

A full-featured online chess platform with real-time multiplayer, AI opponents (Stockfish WASM), OAuth authentication, Elo ratings, and game history with PGN export.

## Tech Stack

| Layer    | Technology |
|----------|------------|
| Frontend | React 18 + TypeScript, Vite, react-chessboard, SignalR client |
| Backend  | ASP.NET Core 8, SignalR, Entity Framework Core, PostgreSQL |
| AI       | Stockfish WASM (runs in-browser) |
| Auth     | Google & GitHub OAuth → JWT in HttpOnly cookie |
| Infra    | Docker, Docker Compose, Nginx |

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & Docker Compose

For local development without Docker:
- .NET 8 SDK
- Node.js 20+
- PostgreSQL 16

## Development

```bash
# Start all services (frontend hot-reload on localhost:5173, backend on localhost:5000)
docker-compose up
```

The development compose setup uses `docker-compose.override.yml` to set `ASPNETCORE_ENVIRONMENT=Development`, which enables auto-migration.

## Production

```bash
# 1. Create your environment file
cp .env.example .env
# 2. Edit .env with real secrets and credentials
# 3. Start in production mode
docker-compose -f docker-compose.prod.yml up -d
```

The app will be available at **http://localhost** (port 80). Nginx reverse-proxies `/api/` and `/hubs/` to the backend.

## Running Tests

```bash
cd backend
dotnet test
```

## Project Structure

```
chess-platform/
├── frontend/           # React + TypeScript SPA
├── backend/
│   ├── ChessPlatform.Api/    # ASP.NET Core API + SignalR hubs
│   └── ChessPlatform.Tests/  # xUnit integration tests
├── docker-compose.yml          # Development
├── docker-compose.prod.yml     # Production
└── .env.example                # Environment variable template
```
