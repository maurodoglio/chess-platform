import type { BoardTheme } from '../types/themes';

export const boardThemes: BoardTheme[] = [
  { id: 'green', name: 'Classic Green', lightSquare: '#eeeed2', darkSquare: '#769656', lastMoveHighlight: 'rgba(255,255,0,0.4)', selectedHighlight: 'rgba(20,85,30,0.5)' },
  { id: 'brown', name: 'Wooden Brown', lightSquare: '#f0d9b5', darkSquare: '#b58863', lastMoveHighlight: 'rgba(255,255,0,0.4)', selectedHighlight: 'rgba(20,85,30,0.5)' },
  { id: 'blue', name: 'Ocean Blue', lightSquare: '#dee3e6', darkSquare: '#8ca2ad', lastMoveHighlight: 'rgba(0,150,255,0.3)', selectedHighlight: 'rgba(0,100,200,0.4)' },
];
