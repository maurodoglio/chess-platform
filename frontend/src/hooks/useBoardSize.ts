import { useState, useEffect } from 'react';

export default function useBoardSize(): number {
  const [boardSize, setBoardSize] = useState(560);

  useEffect(() => {
    const calculate = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (vw >= 1024) setBoardSize(Math.min(560, vh * 0.65));
      else if (vw >= 768) setBoardSize(Math.min(vw * 0.7, vh * 0.5));
      else setBoardSize(vw - 16);
    };
    calculate();
    window.addEventListener('resize', calculate);
    return () => window.removeEventListener('resize', calculate);
  }, []);

  return boardSize;
}
