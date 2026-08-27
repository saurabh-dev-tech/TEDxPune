import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useColorScheme as useNativeColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setStatusBarStyle } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { C, Colors } from '@/constants/theme';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  themeMode: ThemeMode;
  effectiveTheme: 'light' | 'dark';
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  colors: typeof Colors.light;
  isDark: boolean;
}

const THEME_STORAGE_KEY = '@tedxpune_theme_mode';

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useNativeColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setThemeModeState(stored);
        }
      } catch (err) {
        console.warn('[Theme] Failed to load stored theme preference:', err);
      } finally {
        setInitialized(true);
      }
    })();
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (err) {
      console.warn('[Theme] Failed to persist theme preference:', err);
    }
  };

  const effectiveTheme: 'light' | 'dark' =
    themeMode === 'system'
      ? systemColorScheme === 'dark'
        ? 'dark'
        : 'light'
      : themeMode;

  const isDark = effectiveTheme === 'dark';
  const colors = Colors[effectiveTheme];

  // Sync native status bar style and system UI background color immediately
  useEffect(() => {
    setStatusBarStyle(isDark ? 'light' : 'dark', true);
    SystemUI.setBackgroundColorAsync(isDark ? C.darkPaper : C.paper).catch(() => {});
  }, [isDark]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeMode,
      effectiveTheme,
      setThemeMode,
      colors,
      isDark,
    }),
    [themeMode, effectiveTheme, isDark, colors]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    const isDark = false;
    return {
      themeMode: 'system',
      effectiveTheme: 'light',
      setThemeMode: async () => {},
      colors: Colors.light,
      isDark,
    };
  }
  return context;
}
