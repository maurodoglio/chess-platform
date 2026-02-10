# Prompt 25 — Responsive Design

## Context
The app is feature-complete and robust. Now it needs to work beautifully on all screen sizes — desktop, tablet, and phone. The chessboard and game panel must adapt to the viewport.

## What to Build
Responsive layouts, dynamic board sizing, touch-friendly controls, and mobile-optimized navigation.

## Prompt

```text
Make the entire chess platform responsive across desktop (≥1024px), tablet (768–1023px), and mobile (<768px).

=== BOARD SIZING ===

RESPONSIVE BOARD HOOK — /hooks/useBoardSize.ts:

function useBoardSize() {
  const [boardSize, setBoardSize] = useState(560);

  useEffect(() => {
    const calculateSize = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      if (vw >= 1024) {
        // Desktop: board takes up ~60% of viewport height, max 560px
        setBoardSize(Math.min(560, vh * 0.6));
      } else if (vw >= 768) {
        // Tablet: board fits 80% of viewport width
        setBoardSize(Math.min(vw * 0.8, vh * 0.5));
      } else {
        // Mobile: board fills viewport width minus padding
        setBoardSize(vw - 16);  // 8px padding each side
      }
    };

    calculateSize();
    window.addEventListener('resize', calculateSize);
    return () => window.removeEventListener('resize', calculateSize);
  }, []);

  return boardSize;
}

- Pass boardSize to the ChessBoard component's boardWidth prop.

=== LAYOUT BREAKPOINTS ===

DESKTOP (≥1024px):
- GamePanel: board on the left, info panel on the right (side-by-side).
  ┌──────────────────────┬──────────────┐
  │  Opponent + Clock     │  Move List   │
  │  ┌────────────────┐  │  1. e4 e5    │
  │  │                │  │  2. Nf3 Nc6  │
  │  │   Chessboard   │  │  ...         │
  │  │                │  │              │
  │  └────────────────┘  │  [Resign]    │
  │  Player + Clock       │  [Draw]      │
  └──────────────────────┴──────────────┘

- Home page: mode cards in a horizontal row.
- Nav bar: full text labels.

TABLET (768–1023px):
- GamePanel: board centered at top, info panel below.
- Home page: mode cards in a 2-column grid (third card full-width below).
- Nav bar: slightly condensed.

MOBILE (<768px):
- GamePanel: board fills full width, everything stacks vertically:
  ┌─────────────────────┐
  │ Opponent  ♟♟  5:00  │
  ├─────────────────────┤
  │                     │
  │     Chessboard      │
  │   (full width)      │
  │                     │
  ├─────────────────────┤
  │ Player    ♙♙  4:32  │
  ├─────────────────────┤
  │ Moves (collapsed)   │
  │  ▼ Expand           │
  ├─────────────────────┤
  │ [⚑ Resign] [🤝 Draw]│
  └─────────────────────┘

- Move list: collapsed by default, expandable with a toggle button. Shows last 2 moves when collapsed.
- Action buttons: icon-only on mobile (with tooltips).
- Home page: mode cards stacked vertically.
- Nav bar: hamburger menu or simplified (just logo + avatar).

=== TOUCH INTERACTIONS ===

- Ensure drag-and-drop works on touch devices (react-chessboard supports this natively).
- Increase touch target sizes for buttons (min 44x44px).
- Promotion dialog: pieces are large enough to tap on mobile.
- Clock display: still readable at small sizes (min font 16px).
- Move list: scrollable with momentum scrolling on mobile.

=== CSS APPROACH ===

Use CSS media queries or a responsive utility (CSS-in-JS or CSS modules):

@media (max-width: 767px) { /* mobile */ }
@media (min-width: 768px) and (max-width: 1023px) { /* tablet */ }
@media (min-width: 1024px) { /* desktop */ }

RESPONSIVE GAME PANEL — Update /components/GamePanel.tsx:
- Use the useBoardSize hook for dynamic board width.
- Use CSS Flexbox/Grid that reflows based on viewport:
  - Desktop: flex-direction: row (board + side panel)
  - Tablet/Mobile: flex-direction: column (stacked)

RESPONSIVE HOME PAGE — Update /pages/HomePage.tsx:
- Mode cards use CSS Grid:
  - Desktop: grid-template-columns: repeat(3, 1fr)
  - Tablet: grid-template-columns: repeat(2, 1fr) (third card spans full width)
  - Mobile: grid-template-columns: 1fr

RESPONSIVE NAV — Update /components/Layout.tsx:
- Desktop: full nav with logo, user name, settings icon, logout button.
- Mobile: logo + avatar only. Tap avatar for dropdown menu (settings, history, logout).

RESPONSIVE GAME HISTORY — Update /pages/GameHistoryPage.tsx:
- Desktop: full table with all columns.
- Mobile: card-based layout. Each game is a card showing:
  - Result icon + opponent name
  - Time control + rating change
  - Date

RESPONSIVE SETTINGS PANEL:
- Desktop: slide-in panel from the right.
- Mobile: full-screen modal.

RESPONSIVE LOGIN PAGE:
- Centered card works at all sizes.
- Buttons stack vertically on mobile.

Verify:
1. Open the app at 1440px, 768px, and 375px viewports.
2. Board scales appropriately at each breakpoint.
3. Game panel layout reflows (side-by-side → stacked).
4. All buttons are tappable on mobile (44px+ targets).
5. Move list is collapsed on mobile, expandable.
6. Home page cards reflow from row → column.
7. Touch drag-and-drop works on simulated mobile.
```
