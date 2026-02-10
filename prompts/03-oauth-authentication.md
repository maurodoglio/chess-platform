# Prompt 03 — OAuth Authentication (Google + GitHub) + JWT

## Context
We have an ASP.NET Core backend with EF Core and a `Users` table in PostgreSQL. Now we need authentication. The platform uses social logins only (Google and GitHub). After OAuth, the backend issues a JWT stored in an HTTP-only cookie.

## What to Build
Implement the full OAuth flow for Google and GitHub providers, user upsert logic, and JWT issuance.

## Prompt

```text
Add OAuth authentication with Google and GitHub to the ChessPlatform.Api project. After successful OAuth, issue a JWT as an HTTP-only cookie.

NUGET PACKAGES:
- Microsoft.AspNetCore.Authentication.Google
- Microsoft.AspNetCore.Authentication.JwtBearer
- System.IdentityModel.Tokens.Jwt

CONFIGURATION — appsettings.json (add sections):
{
  "Auth": {
    "Google": { "ClientId": "", "ClientSecret": "" },
    "GitHub": { "ClientId": "", "ClientSecret": "" },
    "Jwt": { "Secret": "CHANGE_ME_IN_PRODUCTION_MIN_32_CHARS!", "Issuer": "ChessPlatform", "ExpiryHours": 24 }
  }
}

AUTH SERVICE — /Services/AuthService.cs:
- UpsertUser(provider, providerId, displayName, avatarUrl): Look up user by provider+providerId. If exists, update displayName and avatarUrl and updatedAt. If not, create new user with defaults. Return the User entity.
- GenerateJwt(User user): Create a JWT with claims: sub=user.Id, name=user.DisplayName, avatar=user.AvatarUrl. Sign with HMAC-SHA256 using the configured secret. Set expiry from config.

AUTH CONTROLLER — /Controllers/AuthController.cs:
- GET /api/auth/login/{provider}
  - provider must be "google" or "github", else return 400.
  - Issue an authentication challenge that redirects to the OAuth provider.
  - Set the callback URL to /api/auth/callback/{provider}.

- GET /api/auth/callback/{provider}
  - Handle the OAuth callback.
  - Extract the user's external ID, display name, and avatar URL from the OAuth claims.
  - Call AuthService.UpsertUser().
  - Call AuthService.GenerateJwt().
  - Set the JWT in an HTTP-only, Secure (in prod), SameSite=Lax cookie named "auth_token".
  - Redirect to the frontend URL (http://localhost:5173 in dev, configurable).

- POST /api/auth/logout
  - Delete the "auth_token" cookie.
  - Return 200 OK.

- GET /api/user/me (requires authentication)
  - Read user ID from JWT claims.
  - Fetch user from DB.
  - Return { id, displayName, avatarUrl, ratingBullet, ratingBlitz, ratingRapid }.

- POST /api/auth/dev-login (Development only)
  - Guard with IWebHostEnvironment.IsDevelopment() — return 404 in production.
  - Accept optional JSON body: { displayName?: string, providerId?: string }
  - Default displayName to "Dev User", providerId to "dev-user-1".
  - Call AuthService.UpsertUserAsync("dev", providerId, displayName, null).
  - Generate JWT and set the "auth_token" cookie (Secure=false in dev).
  - **Return 200 OK with { message, userId, displayName, token }** — include the JWT in the response body so the frontend can store it in sessionStorage for per-window auth.

CONFIGURE AUTHENTICATION in Program.cs:
- **CRITICAL**: Set `options.MapInboundClaims = true` on the JWT Bearer handler. Without this, .NET 8+ uses `JsonWebTokenHandler` which defaults to `MapInboundClaims = false`, meaning the JWT `sub` claim stays as `"sub"` and is NOT mapped to `ClaimTypes.NameIdentifier`. This causes `GetUserId()` in the GameHub and `User.FindFirstValue(ClaimTypes.NameIdentifier)` in controllers to return null, breaking auth everywhere.
- **Token resolution priority** in OnMessageReceived: (1) If Authorization header is present, skip (let default handler use it). (2) Check `access_token` query param (for SignalR WebSocket). (3) Fall back to `auth_token` cookie. This ordering is critical for dev login where sessionStorage tokens must override shared cookies.
- **Conditionally register** Google and GitHub OAuth schemes — only when their ClientId is configured (non-empty). If an OAuth scheme is registered with an empty ClientId, `OAuthOptions.Validate()` throws `ArgumentException` on every HTTP request, breaking the entire application including non-OAuth endpoints.
- Add GitHub OAuth scheme (use generic OAuth handler since there's no built-in GitHub provider — set AuthorizationEndpoint: https://github.com/login/oauth/authorize, TokenEndpoint: https://github.com/login/oauth/access_token, UserInformationEndpoint: https://api.github.com/user).
- Set JWT Bearer as the default authentication scheme.
- Add Authorization middleware.

UPDATE docker-compose.yml:
- Add environment variables for Auth__Google__ClientId, Auth__Google__ClientSecret, Auth__GitHub__ClientId, Auth__GitHub__ClientSecret, Auth__Jwt__Secret to the backend service (read from .env).

Verify: The /api/auth/login/google endpoint redirects to Google. After callback, a JWT cookie is set and /api/user/me returns user data. In development, POST /api/auth/dev-login with { "displayName": "Test" } sets a JWT cookie and /api/user/me returns the test user.
```
