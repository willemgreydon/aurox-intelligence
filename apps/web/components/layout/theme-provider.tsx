'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { themeStorageKey } from '@repo/design-tokens';

type ThemeMode = 'light' | 'dark';

type ThemeContextValue = {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type ThemeProviderProps = {
  children: ReactNode;
  initialTheme?: ThemeMode;
  cookieKey?: string;
};

function persistTheme(theme: ThemeMode, cookieKey: string) {
  try {
    window.localStorage.setItem(themeStorageKey, theme);
  } catch {
    // ignore storage failures
  }

  try {
    document.cookie = `${cookieKey}=${theme}; Path=/; Max-Age=31536000; SameSite=Lax`;
  } catch {
    // ignore cookie failures
  }
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = theme;
}

export function ThemeProvider({
  children,
  initialTheme = 'dark',
  cookieKey = 'aurox-theme',
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeMode>(initialTheme);

  useEffect(() => {
    let resolvedTheme: ThemeMode = initialTheme;

    try {
      const saved = window.localStorage.getItem(themeStorageKey);

      if (saved === 'light' || saved === 'dark') {
        resolvedTheme = saved;
      }
    } catch {
      // ignore storage failures
    }

    setThemeState(resolvedTheme);
    applyTheme(resolvedTheme);
    persistTheme(resolvedTheme, cookieKey);
  }, [initialTheme, cookieKey]);

  const setTheme = useCallback(
    (nextTheme: ThemeMode) => {
      setThemeState(nextTheme);
      applyTheme(nextTheme);
      persistTheme(nextTheme, cookieKey);
    },
    [cookieKey],
  );

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      toggleTheme,
    }),
    [theme, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}