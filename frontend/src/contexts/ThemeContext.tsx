import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import type { BoardTheme } from '../types/themes';
import { boardThemes } from '../data/themes';

interface ThemeContextValue {
  currentTheme: BoardTheme;
  setTheme: (id: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'selectedBoardThemeId';
const DEFAULT_THEME_ID = 'green';

function getInitialThemeId(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && boardThemes.some(t => t.id === stored)) return stored;
  } catch { /* ignore */ }
  return DEFAULT_THEME_ID;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState(getInitialThemeId);

  const setTheme = useCallback((id: string) => {
    if (boardThemes.some(t => t.id === id)) {
      setThemeId(id);
      try { localStorage.setItem(STORAGE_KEY, id); } catch { /* ignore */ }
    }
  }, []);

  const currentTheme = useMemo(
    () => boardThemes.find(t => t.id === themeId) ?? boardThemes[0],
    [themeId],
  );

  const value = useMemo(() => ({ currentTheme, setTheme }), [currentTheme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
