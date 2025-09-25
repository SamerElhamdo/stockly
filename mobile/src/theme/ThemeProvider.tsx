import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemeColors, darkThemeColors, lightThemeColors } from './colors';

const STORAGE_KEY = '@stockly/theme-preference';

type ThemeContextValue = {
  theme: ThemeColors;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const readStoredTheme = async (): Promise<'light' | 'dark' | null> => {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEY);
    if (value === 'light' || value === 'dark') {
      return value;
    }
    return null;
  } catch {
    return null;
  }
};

const persistTheme = async (value: 'light' | 'dark') => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, value);
  } catch {
    // ignore
  }
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = Appearance.getColorScheme();
  const [mode, setMode] = useState<'light' | 'dark'>(systemColorScheme === 'dark' ? 'dark' : 'light');

  useEffect(() => {
    readStoredTheme().then((stored) => {
      if (stored) {
        setMode(stored);
      }
    });
  }, []);

  const setTheme = useCallback((value: 'light' | 'dark') => {
    setMode(value);
    void persistTheme(value);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(mode === 'light' ? 'dark' : 'light');
  }, [mode, setTheme]);

  const theme = useMemo<ThemeColors>(() => {
    return mode === 'light' ? lightThemeColors : darkThemeColors;
  }, [mode]);

  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      toggleTheme,
    }),
    [theme, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return ctx;
};
