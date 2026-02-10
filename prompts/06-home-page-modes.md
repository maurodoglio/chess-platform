# Prompt 06 — Home Page with Mode Selection

## Context
Users can now log in and see a welcome message with their ratings. The home page needs to become the central hub where players choose a game mode. No game logic yet — just the UI and navigation that will connect to future steps.

## What to Build
The complete home page with mode selection cards and the stub pages/routes for each game mode.

## Prompt

```text
Build out the home page as the central navigation hub and create stub pages for each game mode.

HOME PAGE — /pages/HomePage.tsx (replace current content):
- Top bar: user avatar (circle, 40px) + display name on the left, Logout button on the right.
- Center content: three large mode selection cards arranged vertically (mobile) or in a row (desktop):

  1. "Play Online" card:
     - Icon: ⚔️ or a crossed-swords SVG
     - Subtitle: "Match with players at your skill level"
     - Shows current ratings: Bullet / Blitz / Rapid as small badges
     - Click → navigates to /play/online

  2. "Play vs Computer" card:
     - Icon: 🤖 or a robot SVG
     - Subtitle: "Challenge Stockfish AI"
     - Click → navigates to /play/computer

  3. "Pass & Play" card:
     - Icon: 🤝 or a handshake SVG
     - Subtitle: "Two players, one device"
     - Click → navigates to /play/local

- Below the cards: a "Game History" text link → navigates to /history

CARD COMPONENT — /components/ModeCard.tsx:
- Reusable card: icon, title, subtitle, optional children (for ratings), onClick.
- Styled: dark card with subtle border, hover effect (slight lift/glow), pointer cursor.

STUB PAGES:
- /pages/OnlineGamePage.tsx → "Online Game — Coming Soon" + Back to Home link
- /pages/ComputerGamePage.tsx → "Play vs Computer — Coming Soon" + Back to Home link
- /pages/LocalGamePage.tsx → "Pass & Play — Coming Soon" + Back to Home link
- /pages/GameHistoryPage.tsx → "Game History — Coming Soon" + Back to Home link

UPDATE ROUTING (App.tsx):
Add routes inside ProtectedRoute:
  - /play/online → OnlineGamePage
  - /play/computer → ComputerGamePage
  - /play/local → LocalGamePage
  - /history → GameHistoryPage

LAYOUT COMPONENT — /components/Layout.tsx:
- Simple layout wrapper with consistent padding, max-width (1200px), centered.
- Optional top nav bar with app title "♔ ChessPlatform" (clickable → home) + user info + logout.
- Used by all authenticated pages.

Verify: Home page shows three mode cards. Clicking each navigates to the correct stub page. All pages have consistent layout with nav bar. Back navigation works.
```
