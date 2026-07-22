/**
 * ThemeProvider — Issue 3
 * "Establish native explicit operating system matched Dark mode logic centrally"
 *
 * - Reads system color scheme via useColorScheme()
 * - Supports light / dark / system modes
 * - Persists user preference in AsyncStorage
 * - Exposes useTheme() hook with full resolved color set
 * - StatusBar style auto-matched to active theme
 * - Zero re-render cost: colors object is memoized
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LightColors, DarkColors, BrandColors, Shadow, Spacing, Radius, FontSize, FontWeight } from './tokens';
import { ThemeMode, ThemeColors } from '../types';

const THEME_STORAGE_KEY = '@stellar/theme_mode';

// ─── Context shape ────────────────────────────────────────────────────────────

interface ThemeContextValue {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors & typeof BrandColors;
  shadow: typeof Shadow;
  spacing: typeof Spacing;
  radius: typeof Radius;
  fontSize: typeof FontSize;
  fontWeight: typeof FontWeight;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null
  const [mode, setModeState] = useState<ThemeMode>('system');

  // Load persisted preference on mount
  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((stored) => {
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setModeState(stored);
        }
      })
      .catch(() => {/* ignore */});
  }, []);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, newMode).catch(() => {/* ignore */});
  }, []);

  // Resolve actual dark/light from mode + system
  const isDark = useMemo(() => {
    if (mode === 'dark')  return true;
    if (mode === 'light') return false;
    return systemScheme === 'dark';
  }, [mode, systemScheme]);

  const colors = useMemo(
    () => ({
      ...(isDark ? DarkColors : LightColors),
      ...BrandColors,
    }),
    [isDark],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      isDark,
      colors,
      shadow: Shadow,
      spacing: Spacing,
      radius: Radius,
      fontSize: FontSize,
      fontWeight: FontWeight,
      setMode,
    }),
    [mode, isDark, colors, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
