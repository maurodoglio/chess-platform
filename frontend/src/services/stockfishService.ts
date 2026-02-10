import { Chess } from 'chess.js';

export type Difficulty = 'easy' | 'medium' | 'hard';

const THINK_TIME: Record<Difficulty, { min: number; max: number }> = {
  easy: { min: 500, max: 1500 },
  medium: { min: 1000, max: 3000 },
  hard: { min: 1500, max: 5000 },
};

const DIFFICULTY_SETTINGS: Record<Difficulty, { skill: number; depth: number }> = {
  easy: { skill: 3, depth: 3 },
  medium: { skill: 10, depth: 8 },
  hard: { skill: 20, depth: 18 },
};

function randomDelay(difficulty: Difficulty): Promise<void> {
  const { min, max } = THINK_TIME[difficulty];
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Real Stockfish via Web Worker ---

class StockfishWorkerService {
  private worker: Worker | null = null;
  private isReady = false;
  private currentDepth = 8;
  private pendingResolve: ((move: string) => void) | null = null;

  async init(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        this.worker = new Worker('/stockfish/stockfish-17.1-lite-single-03e3232.js');
      } catch {
        reject(new Error('Failed to create Stockfish worker'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Stockfish init timeout'));
      }, 10000);

      let waitingForUciOk = true;

      this.worker.onmessage = (e: MessageEvent) => {
        const data = typeof e.data === 'string' ? e.data : String(e.data);
        if (waitingForUciOk && data === 'uciok') {
          waitingForUciOk = false;
          this.sendCommand('isready');
          return;
        }
        if (data === 'readyok' && !this.isReady) {
          this.isReady = true;
          clearTimeout(timeout);
          resolve();
          return;
        }
        this.onMessage(data);
      };

      this.worker.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Stockfish worker error'));
      };

      this.sendCommand('uci');
    });
  }

  setDifficulty(difficulty: Difficulty): void {
    const s = DIFFICULTY_SETTINGS[difficulty];
    this.sendCommand(`setoption name Skill Level value ${s.skill}`);
    this.currentDepth = s.depth;
  }

  async getBestMove(fen: string): Promise<string> {
    return new Promise((resolve) => {
      this.pendingResolve = resolve;
      this.sendCommand(`position fen ${fen}`);
      this.sendCommand(`go depth ${this.currentDepth}`);
    });
  }

  stop(): void {
    this.sendCommand('stop');
  }

  destroy(): void {
    this.worker?.terminate();
    this.worker = null;
    this.isReady = false;
  }

  private sendCommand(cmd: string): void {
    this.worker?.postMessage(cmd);
  }

  private onMessage(data: string): void {
    if (data.startsWith('bestmove')) {
      const move = data.split(' ')[1];
      if (move && this.pendingResolve) {
        this.pendingResolve(move);
        this.pendingResolve = null;
      }
    }
  }
}

// --- Fallback: chess.js-based AI ---

class FallbackStockfishService {
  private difficulty: Difficulty = 'medium';

  async init(): Promise<void> {
    // No-op; always ready
  }

  setDifficulty(difficulty: Difficulty): void {
    this.difficulty = difficulty;
  }

  async getBestMove(fen: string): Promise<string> {
    const chess = new Chess(fen);
    const moves = chess.moves({ verbose: true });
    if (moves.length === 0) return '(none)';

    let chosen;
    switch (this.difficulty) {
      case 'easy':
        chosen = moves[Math.floor(Math.random() * moves.length)];
        break;
      case 'medium': {
        const captures = moves.filter((m) => m.captured);
        chosen = captures.length > 0 && Math.random() < 0.6
          ? captures[Math.floor(Math.random() * captures.length)]
          : moves[Math.floor(Math.random() * moves.length)];
        break;
      }
      case 'hard': {
        const checks = moves.filter((m) => {
          const sim = new Chess(fen);
          sim.move(m);
          return sim.isCheck();
        });
        if (checks.length > 0) {
          chosen = checks[Math.floor(Math.random() * checks.length)];
        } else {
          const captures = moves.filter((m) => m.captured);
          chosen = captures.length > 0
            ? captures[Math.floor(Math.random() * captures.length)]
            : moves[Math.floor(Math.random() * moves.length)];
        }
        break;
      }
    }

    // Return UCI move format (e.g. "e2e4", "e7e8q")
    return chosen.from + chosen.to + (chosen.promotion ?? '');
  }

  stop(): void {}
  destroy(): void {}
}

// --- Unified service that tries real Stockfish, falls back to mock ---

interface StockfishEngine {
  init(): Promise<void>;
  setDifficulty(d: Difficulty): void;
  getBestMove(fen: string): Promise<string>;
  stop(): void;
  destroy(): void;
}

class StockfishService {
  private engine: StockfishEngine | null = null;
  private difficulty: Difficulty = 'medium';
  private usingFallback = false;

  async init(): Promise<void> {
    try {
      const real = new StockfishWorkerService();
      await real.init();
      this.engine = real;
      this.usingFallback = false;
    } catch {
      console.warn('Real Stockfish unavailable, using fallback AI');
      const fallback = new FallbackStockfishService();
      await fallback.init();
      this.engine = fallback;
      this.usingFallback = true;
    }
    this.engine.setDifficulty(this.difficulty);
  }

  get isFallback(): boolean {
    return this.usingFallback;
  }

  setDifficulty(difficulty: Difficulty): void {
    this.difficulty = difficulty;
    this.engine?.setDifficulty(difficulty);
  }

  async getBestMove(fen: string): Promise<string> {
    if (!this.engine) throw new Error('Engine not initialized');
    const [move] = await Promise.all([
      this.engine.getBestMove(fen),
      randomDelay(this.difficulty),
    ]);
    return move;
  }

  stop(): void {
    this.engine?.stop();
  }

  destroy(): void {
    this.engine?.destroy();
    this.engine = null;
  }
}

export const stockfishService = new StockfishService();
