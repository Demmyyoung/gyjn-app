/**
 * ─── Jinni Design System — ThemeProvider ─────────────────────────────────────
 *
 * React Context that wraps the entire app and provides:
 *  - `colors`  — current palette (light or dark)
 *  - `shadows` — current shadow set
 *  - `isDark`  — boolean for conditional logic
 *  - All static tokens (typography, spacing, radii, layout, gradients)
 *
 * Usage:
 *   import { useTheme } from '../lib/ThemeProvider';
 *   const { colors, typography, isDark } = useTheme();
 */

import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  colors as allColors,
  shadows as allShadows,
  typography,
  fonts,
  spacing,
  radii,
  layout,
  gradients,
} from './theme';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const systemColorScheme = useColorScheme();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Force light mode
    setIsDark(false);
  }, []);

  const toggleDarkMode = () => {
    // Disabled
  };

  const value = useMemo(() => ({
    isDark,
    toggleDarkMode,
    colors:     isDark ? allColors.dark : allColors.light,
    shadows:    isDark ? allShadows.dark : allShadows.light,
    typography,
    fonts,
    spacing,
    radii,
    layout,
    gradients,
  }), [isDark]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access the current theme tokens.
 *
 * @returns {{
 *   isDark: boolean,
 *   colors: import('./theme').colors['light'],
 *   shadows: import('./theme').shadows['light'],
 *   typography: import('./theme').typography,
 *   fonts: import('./theme').fonts,
 *   spacing: import('./theme').spacing,
 *   radii: import('./theme').radii,
 *   layout: import('./theme').layout,
 *   gradients: import('./theme').gradients,
 * }}
 */
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a <ThemeProvider>');
  }
  return ctx;
}
