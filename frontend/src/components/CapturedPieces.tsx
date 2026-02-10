interface CapturedPiecesProps {
  fen: string;
  color: 'white' | 'black';
}

const STARTING_MATERIAL = { p: 8, n: 2, b: 2, r: 2, q: 1 };

// Pieces captured BY this color (i.e., opponent's pieces that are gone)
const PIECE_SYMBOLS: Record<string, Record<string, string>> = {
  // Captured black pieces (shown for white)
  white: { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛' },
  // Captured white pieces (shown for black)
  black: { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕' },
};

const PIECE_VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
const PIECE_ORDER = ['q', 'r', 'b', 'n', 'p'];

type PieceCounts = Record<string, number>;

function countPieces(fen: string): { white: PieceCounts; black: PieceCounts } {
  const board = fen.split(' ')[0];
  const counts: { white: PieceCounts; black: PieceCounts } = {
    white: { p: 0, n: 0, b: 0, r: 0, q: 0 },
    black: { p: 0, n: 0, b: 0, r: 0, q: 0 },
  };

  for (const ch of board) {
    if (ch >= 'A' && ch <= 'Z') {
      const key = ch.toLowerCase();
      if (key in counts.white) counts.white[key]++;
    } else if (ch >= 'a' && ch <= 'z') {
      if (ch in counts.black) counts.black[ch]++;
    }
  }

  return counts;
}

export default function CapturedPieces({ fen, color }: CapturedPiecesProps) {
  const onBoard = countPieces(fen);
  // Pieces captured BY this color = opponent's starting material - opponent's current pieces
  const opponentColor = color === 'white' ? 'black' : 'white';
  const opponentOnBoard = onBoard[opponentColor];

  const captured: { type: string; count: number }[] = [];
  let myMaterialCaptured = 0;
  let opponentMaterialCaptured = 0;

  for (const type of PIECE_ORDER) {
    const gone = STARTING_MATERIAL[type as keyof typeof STARTING_MATERIAL] - opponentOnBoard[type];
    if (gone > 0) {
      captured.push({ type, count: gone });
      myMaterialCaptured += gone * PIECE_VALUES[type];
    }
  }

  // Calculate opponent's captures for advantage
  const myOnBoard = onBoard[color];
  for (const type of PIECE_ORDER) {
    const gone = STARTING_MATERIAL[type as keyof typeof STARTING_MATERIAL] - myOnBoard[type];
    if (gone > 0) {
      opponentMaterialCaptured += gone * PIECE_VALUES[type];
    }
  }

  const advantage = myMaterialCaptured - opponentMaterialCaptured;

  if (captured.length === 0) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.9rem', color: '#b0b0b0' }}>
      {captured.map(({ type, count }) => (
        <span key={type}>
          {Array.from({ length: count }, (_, i) => (
            <span key={i} className="captured-piece">{PIECE_SYMBOLS[color][type]}</span>
          ))}
        </span>
      ))}
      {advantage > 0 && (
        <span style={{ fontSize: '0.8rem', color: '#888', marginLeft: '4px' }}>+{advantage}</span>
      )}
    </div>
  );
}
