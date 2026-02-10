# Prompt 04 — Frontend Scaffold (Vite + React + TypeScript + Router)

## Context
The backend has authentication working with OAuth and JWT. Now we need to create the frontend application. This is the first frontend step — just the project scaffold with routing and basic structure.

## What to Build
A React + TypeScript project using Vite, with React Router for client-side routing, a proxy to the backend, and a minimal page structure.

## Prompt

```text
Create a new React + TypeScript frontend application using Vite in a /frontend directory at the project root.

SETUP:
- Use Vite with the React + TypeScript template
- Install dependencies: react-router-dom, @microsoft/signalr
- Install dev dependencies: @types/react, @types/react-dom

PROJECT STRUCTURE:
/frontend
  /public
  /src
    /components        — Reusable UI components
    /pages             — Page-level components
      LoginPage.tsx    — Placeholder: "Login Page" heading
      HomePage.tsx     — Placeholder: "Home Page" heading
      NotFoundPage.tsx — Simple 404 page
    /contexts          — React contexts
    /hooks             — Custom hooks
    /services          — API and SignalR service modules
    /types             — TypeScript type definitions
    /assets            — Static assets (images, sounds)
    App.tsx            — Router setup
    main.tsx           — Entry point
    index.css          — Base styles (CSS reset, basic typography)
  index.html
  vite.config.ts
  tsconfig.json
  package.json

VITE CONFIG (vite.config.ts):
- Dev server on port 5173
- Proxy /api/* and /hubs/* to http://localhost:5000 (the backend)
  - For /hubs/*, enable WebSocket proxying

ROUTING (App.tsx):
- /login → LoginPage
- / → HomePage
- * → NotFoundPage

TYPES (/types/index.ts):
export interface UserInfo {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  ratingBullet: number;
  ratingBlitz: number;
  ratingRapid: number;
}

BASE STYLES (index.css):
- CSS reset (box-sizing, margin 0)
- Font: system-ui or Inter
- Dark background (#1a1a2e or similar chess-platform feel), light text
- Basic utility classes

Update the root docker-compose.yml:
- Add a "frontend" service that builds from ./frontend/Dockerfile
- For now, just create a simple Dockerfile that runs `npm install && npm run dev` for development
- Expose port 5173, depends_on backend

Verify: `npm run dev` in /frontend starts the app. Navigating to http://localhost:5173/ shows "Home Page" and /login shows "Login Page". API proxy works (http://localhost:5173/api/health returns the backend health check).
```
