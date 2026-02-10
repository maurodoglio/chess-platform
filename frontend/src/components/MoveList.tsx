import { useEffect, useRef } from 'react';

interface MoveListProps {
  moves: string[];
  currentMoveIndex?: number;
  onMoveClick?: (index: number) => void;
}

export default function MoveList({ moves, currentMoveIndex, onMoveClick }: MoveListProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [moves.length]);

  if (moves.length === 0) return null;

  const pairs: { number: number; white: string; black?: string }[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push({
      number: Math.floor(i / 2) + 1,
      white: moves[i],
      black: moves[i + 1],
    });
  }

  const moveStyle = (index: number): React.CSSProperties => ({
    padding: '1px 4px',
    borderRadius: '3px',
    cursor: onMoveClick ? 'pointer' : 'default',
    background: currentMoveIndex === index ? 'rgba(124, 131, 255, 0.3)' : 'transparent',
    color: currentMoveIndex === index ? '#fff' : '#b0b0b0',
  });

  return (
    <div
      ref={containerRef}
      style={{
        maxWidth: '560px',
        width: '100%',
        background: '#16213e',
        borderRadius: '8px',
        padding: '0.5rem 0.75rem',
        maxHeight: '140px',
        overflowY: 'auto',
        fontFamily: '"SF Mono", "Cascadia Code", "Fira Code", monospace',
        fontSize: '0.85rem',
        lineHeight: 1.8,
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 12px' }}>
        {pairs.map(({ number, white, black }) => (
          <div key={number} style={{ display: 'flex', gap: '4px', whiteSpace: 'nowrap' }}>
            <span style={{ color: '#666', minWidth: '2ch', textAlign: 'right' }}>{number}.</span>
            <span
              style={moveStyle((number - 1) * 2)}
              onClick={() => onMoveClick?.((number - 1) * 2)}
            >
              {white}
            </span>
            {black && (
              <span
                style={moveStyle((number - 1) * 2 + 1)}
                onClick={() => onMoveClick?.((number - 1) * 2 + 1)}
              >
                {black}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
