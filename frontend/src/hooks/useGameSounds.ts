import { useCallback } from 'react';
import { soundService } from '../services/sounds';
import type { MoveInfo } from '../types/chess';

export function useGameSounds() {
  const playMoveSound = useCallback((info: Pick<MoveInfo, 'isCapture' | 'isCheck' | 'isCastle'>) => {
    soundService.playMoveSound(info);
  }, []);

  const playGameStart = useCallback(() => {
    soundService.playGameStart();
  }, []);

  const playGameEnd = useCallback(() => {
    soundService.playGameEnd();
  }, []);

  const playIllegal = useCallback(() => {
    soundService.playIllegal();
  }, []);

  return { playMoveSound, playGameStart, playGameEnd, playIllegal };
}

/** Parse SAN notation to extract move characteristics for sound playback. */
export function parseSanForSound(san: string): { isCapture: boolean; isCheck: boolean; isCastle: boolean } {
  return {
    isCapture: san.includes('x'),
    isCheck: san.includes('+') || san.includes('#'),
    isCastle: san === 'O-O' || san === 'O-O-O',
  };
}
