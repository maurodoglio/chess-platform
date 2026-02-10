# Prompt 05 — Login Page + Auth Context + Auth Flow Wiring

## Context
We have a React frontend with routing and a backend with OAuth (Google + GitHub) and JWT authentication. Now we need to wire them together: a real login page with social login buttons, an auth context to track login state, and route protection.

## What to Build
Auth context provider, login page UI, protected route wrapper, and the full auth flow from clicking "Sign in" to landing on the home page as an authenticated user.

## Prompt

```text
Implement authentication on the frontend, connecting to the existing backend OAuth flow.

API SERVICE — /services/api.ts:
- Create a base fetch wrapper that handles JSON responses and errors.
- **Per-window auth**: create a getAuthHeaders() helper that reads `auth_token` from sessionStorage. If present, returns `{ Authorization: "Bearer <token>" }`. All fetch calls include these headers AND credentials: "include" (cookie fallback for OAuth).
- fetchCurrentUser(): GET /api/user/me → returns UserInfo or null (if 401).
- logout(): POST /api/auth/logout. Also clears sessionStorage `auth_token`.
- devLogin(displayName, providerId): POST /api/auth/dev-login with JSON body. **Stores the returned `token` in sessionStorage** — this enables per-window auth so two regular browser windows can authenticate as different dev users (sessionStorage is per-window, unlike cookies which are shared).

AUTH CONTEXT — /contexts/AuthContext.tsx:
- Create AuthContext with:
  - user: UserInfo | null
  - isLoading: boolean (true while checking auth on app load)
  - isAuthenticated: boolean (derived from user !== null)
  - logout: () => Promise<void>
  - refreshUser: () => Promise<void> (re-fetches /api/user/me and updates state)
- AuthProvider component:
  - On mount, call fetchCurrentUser(). If success, set user. If 401, set user to null. Set isLoading to false.
  - logout() calls the API, clears user state, navigates to /login.
  - refreshUser() calls fetchCurrentUser() and updates user state (used after dev login).
- Wrap the entire App in AuthProvider.

PROTECTED ROUTE — /components/ProtectedRoute.tsx:
- If isLoading, show a centered loading spinner.
- If not authenticated, redirect to /login.
- Otherwise, render the child route (Outlet).

LOGIN PAGE — /pages/LoginPage.tsx:
- If already authenticated, redirect to /.
- Centered card with:
  - App title/logo: "♔ ChessPlatform" (large, styled)
  - Subtitle: "Play chess online"
  - "Sign in with Google" button → navigates to /api/auth/login/google
  - "Sign in with GitHub" button → navigates to /api/auth/login/github
  - Style: dark themed card, buttons with provider brand colors
    (Google: white bg with Google icon colors; GitHub: dark gray/black bg)
  - Buttons use <a href="..."> tags (not onClick) since they trigger a full-page redirect to the OAuth provider.
  - DEV LOGIN SECTION (only when import.meta.env.DEV is true):
    - Separator line with "⚙️ Development only" label
    - "Dev Login — Player 1" button → calls devLogin("Dev Player 1", "dev-user-1"), then refreshUser()
    - "Dev Login — Player 2" button → calls devLogin("Dev Player 2", "dev-user-2"), then refreshUser()
    - Styled with green background to distinguish from real OAuth buttons
    - Disabled while login is in progress

UPDATE ROUTING (App.tsx):
- /login → LoginPage (public)
- All other routes wrapped in ProtectedRoute:
  - / → HomePage
- * → NotFoundPage

HOME PAGE — /pages/HomePage.tsx (update from placeholder):
- Display: "Welcome, {user.displayName}!" with the user's avatar (small circle image).
- Show three rating badges: Bullet {rating}, Blitz {rating}, Rapid {rating}.
- A "Logout" button that calls the auth context's logout function.
- (Mode selection buttons will be added in the next step.)

Verify: 
1. Visiting / while not logged in redirects to /login.
2. Clicking "Sign in with Google" redirects to Google OAuth.
3. After OAuth callback, the user lands on / and sees their name and ratings.
4. Clicking Logout clears the cookie and redirects to /login.
5. (Dev mode) Clicking "Dev Login — Player 1" logs in immediately without OAuth and redirects to /.
6. (Dev mode) Dev login buttons are NOT visible in production builds.
```
