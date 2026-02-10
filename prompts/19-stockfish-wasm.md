# Prompt 19 — Stockfish WASM Web Worker Integration

## Context
Online multiplayer is fully functional with clocks, ratings, persistence, and replay. Now we add the computer opponent. Stockfish runs in a Web Worker via WebAssembly — entirely client-side, no server cost.

## What to Build
A Web Worker wrapper for Stockfish WASM with UCI protocol communication and difficulty presets.

## Prompt

```text
Integrate Stockfish WASM into the frontend as a Web Worker for the "Play vs Computer" mode.

INSTALL:
- Install the stockfish.js npm package (or stockfish-nnue.wasm, or use the stockfish.wasm files from the official Stockfish repository). Choose whichever has the best WASM support for browsers.
- If no good npm package exists, download the Stockfish WASM binary and JS glue file and place them in /frontend/public/stockfish/.

STOCKFISH WORKER SERVICE — /services/stockfishWorker.ts:

class StockfishService {
  private worker: Worker | null = null;
  private isReady: boolean = false;
  private onMoveCallback: ((move: string) => void) | null = null;

  // Initialize the Web Worker and load Stockfish
  async init(): Promise<void> {
    // Create a Web Worker that loads the Stockfish WASM
    // Send "uci" command, wait for "uciok"
    // Send "isready", wait for "readyok"
    // Set this.isReady = true
  }

  // Set the difficulty level
  setDifficulty(difficulty: 'easy' | 'medium' | 'hard'): void {
    const settings = {
      easy:   { skillLevel: 3,  depth: 3  },
      medium: { skillLevel: 10, depth: 8  },
      hard:   { skillLevel: 20, depth: 18 },
    };
    const s = settings[difficulty];
    this.sendCommand(`setoption name Skill Level value ${s.skillLevel}`);
    // Store depth for use in getBestMove
  }

  // Get the best move for a given FEN position
  async getBestMove(fen: string): Promise<string> {
    return new Promise((resolve) => {
      this.onMoveCallback = resolve;
      this.sendCommand(`position fen ${fen}`);
      this.sendCommand(`go depth ${this.currentDepth}`);
    });
    // Parse worker output: look for "bestmove <uci_move>"
    // Resolve the promise with the UCI move string
  }

  // Stop any current search
  stop(): void {
    this.sendCommand('stop');
  }

  // Terminate the worker
  destroy(): void {
    this.worker?.terminate();
    this.worker = null;
    this.isReady = false;
  }

  private sendCommand(cmd: string): void {
    this.worker?.postMessage(cmd);
  }

  // Handle messages from the worker
  private onMessage(event: MessageEvent): void {
    const line = typeof event.data === 'string' ? event.data : event.data.toString();
    if (line.startsWith('bestmove')) {
      const move = line.split(' ')[1];  // e.g., "e2e4"
      this.onMoveCallback?.(move);
      this.onMoveCallback = null;
    }
  }
}

export const stockfishService = new StockfishService();

STOCKFISH HOOK — /hooks/useStockfish.ts:

function useStockfish(difficulty: 'easy' | 'medium' | 'hard') {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    stockfishService.init()
      .then(() => {
        if (!cancelled) {
          stockfishService.setDifficulty(difficulty);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) setError('Failed to load chess engine. Please refresh.');
      });

    return () => {
      cancelled = true;
      stockfishService.destroy();
    };
  }, [difficulty]);

  const getBestMove = async (fen: string): Promise<string> => {
    return stockfishService.getBestMove(fen);
  };

  return { isLoading, error, getBestMove };
}

SIMULATED THINK TIME:
- After getting the best move from Stockfish, add a random delay before playing it:
  - Easy: 500ms – 1500ms
  - Medium: 1000ms – 3000ms  
  - Hard: 1500ms – 5000ms
- This makes the AI feel more natural (not instant).

VITE CONFIG UPDATE:
- If Stockfish WASM files are in /public/stockfish/, configure Vite to serve them properly.
- Ensure WASM MIME type is correct (application/wasm).
- If using a Web Worker with `new Worker()`, ensure Vite handles the worker import correctly (may need `?worker` suffix or manual worker file).

Verify:
- StockfishService initializes without errors.
- Calling getBestMove("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1") returns a valid UCI move (e.g., "e2e4").
- Different difficulties return at different speeds and (generally) different quality moves.
- The worker is properly terminated on cleanup.
- (Integration with the game UI happens in the next step.)
```
