# Prompt 02 — EF Core + User Entity + Database Migrations

## Context
We have a working ASP.NET Core 8 backend with Docker Compose running PostgreSQL. The `/health` endpoint works. Now we need to set up Entity Framework Core with the User entity and create our first database migration.

## What to Build
Add EF Core with Npgsql provider, create the User entity matching the spec, configure the DbContext, and generate the initial migration.

## Prompt

```text
Building on the existing ChessPlatform.Api project, add Entity Framework Core with PostgreSQL support:

NUGET PACKAGES:
- Npgsql.EntityFrameworkCore.PostgreSQL
- Microsoft.EntityFrameworkCore.Design (dev dependency for migrations)

DB CONTEXT — /Data/ChessPlatformDbContext.cs:
- Register DbSet<User>
- Configure the connection string from IConfiguration ("ConnectionStrings:DefaultConnection")
- Override OnModelCreating to apply entity configurations

USER ENTITY — /Models/User.cs:
public class User
{
    public Guid Id { get; set; }
    public string Provider { get; set; }       // "google" or "github"
    public string ProviderId { get; set; }     // Unique ID from OAuth provider
    public string DisplayName { get; set; }
    public string? AvatarUrl { get; set; }
    public int RatingBullet { get; set; } = 1200;
    public int RatingBlitz { get; set; } = 1200;
    public int RatingRapid { get; set; } = 1200;
    public int GamesPlayedBullet { get; set; } = 0;
    public int GamesPlayedBlitz { get; set; } = 0;
    public int GamesPlayedRapid { get; set; } = 0;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

ENTITY CONFIGURATION — /Data/Configurations/UserConfiguration.cs:
- id: UUID primary key with default gen_random_uuid()
- provider + provider_id: unique composite index
- display_name: max length 100, required
- rating fields: NOT NULL with default 1200
- games_played fields: NOT NULL with default 0
- created_at, updated_at: NOT NULL with default NOW()
- Use snake_case column naming convention for PostgreSQL

REGISTER in Program.cs:
- Add DbContext to DI with Npgsql provider
- Read connection string from configuration

MIGRATION:
- Create initial migration named "InitialCreate"
- The migration should create the "users" table with all columns and indexes

AUTO-MIGRATE on startup (development only):
- In Program.cs, apply pending migrations automatically when in Development environment
- Log a warning when auto-migrating

Verify: After `docker-compose up`, the "users" table should exist in PostgreSQL with the correct schema.
```
