import React, { createContext, useContext, useMemo } from 'react';

import { darkColors, gradients, lightColors, type ThemeColors } from './colors';
import { radii } from './radii';
import { spacing } from './spacing';
import { duration, easing, springs } from './motion';
import { typography } from './typography';
import { useResolvedScheme } from './use-resolved-scheme';

export interface AppTheme {
  scheme: 'light' | 'dark';
  colors: ThemeColors;
  gradients: (typeof gradients)['light'];
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
  motion: { duration: typeof duration; easing: typeof easing; springs: typeof springs };
}

const ThemeContext = createContext<AppTheme | null>(null);

function buildTheme(scheme: 'light' | 'dark'): AppTheme {
  return {
    scheme,
    colors: scheme === 'dark' ? darkColors : lightColors,
    gradients: scheme === 'dark' ? gradients.dark : gradients.light,
    spacing,
    radii,
    typography,
    motion: { duration, easing, springs },
  };
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const resolvedScheme = useResolvedScheme();

  const theme = useMemo(() => buildTheme(resolvedScheme), [resolvedScheme]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): AppTheme {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useAppTheme must be used within an AppThemeProvider');
  }
  return theme;
}
