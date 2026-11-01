import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { themeLabel, themes, type AppThemeColors, type AppThemeName } from './themes';

type ThemeContextValue = {
  themeName: AppThemeName;
  colors: AppThemeColors;
  setThemeName: (theme: AppThemeName) => void;
  options: Array<{ id: AppThemeName; label: string }>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeName] = useState<AppThemeName>('claro');

  const value = useMemo<ThemeContextValue>(() => {
    return {
      themeName,
      colors: themes[themeName] || themes.claro,
      setThemeName,
      options: [
        { id: 'claro', label: 'Claro' },
        { id: 'escuro', label: 'Escuro' },
      ],
    };
  }, [themeName]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useAppTheme must be used within ThemeProvider.');
  }

  return context;
}
