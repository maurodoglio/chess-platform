# Prompt 01 — Backend Scaffold + Docker Compose + PostgreSQL

## Context
We are building a web-based chess platform from scratch. This is the very first step. Nothing exists yet. We need to establish the backend project structure and a local development environment using Docker.

## What to Build
Set up the foundational ASP.NET Core backend project with Docker Compose orchestrating the backend and a PostgreSQL database.

## Prompt

```text
Create a new ASP.NET Core 8 Web API project for a chess platform called "ChessPlatform". Set up the following:

PROJECT STRUCTURE:
/backend
  /ChessPlatform.Api          — ASP.NET Core Web API project
    Program.cs                 — Minimal API setup with CORS, JSON options
    appsettings.json           — Config with ConnectionStrings:DefaultConnection placeholder
    appsettings.Development.json — Dev overrides (connection string pointing to localhost:5432)
    /Properties
      launchSettings.json      — Configure to run on port 5000

DOCKER COMPOSE (at project root):
docker-compose.yml with two services:
1. "postgres" — PostgreSQL 16-alpine
   - Database: chessplatform, User: chess, Password via ${DB_PASSWORD:-devpassword}
   - Volume: pgdata for data persistence
   - Health check: pg_isready
   - Exposed on port 5432

2. "backend" — Build from ./backend/ChessPlatform.Api/Dockerfile
   - Depends on postgres (condition: service_healthy)
   - Port 5000:5000
   - Environment variables for DB connection string pointing to the postgres service

docker-compose.override.yml for development convenience.

.env file with DB_PASSWORD=devpassword

BACKEND Dockerfile (multi-stage):
- Build stage: mcr.microsoft.com/dotnet/sdk:8.0, restore + publish
- Runtime stage: mcr.microsoft.com/dotnet/aspnet:8.0

HEALTH CHECK ENDPOINT:
- GET /health → returns 200 OK with { "status": "healthy", "timestamp": "<utc-now>" }

CORS:
- Configure CORS to allow http://localhost:5173 (Vite dev server) in development.

.gitignore at root covering .NET, Node, Docker, IDE files.

Make sure `docker-compose up` starts both services and the /health endpoint is reachable at http://localhost:5000/health.
```
