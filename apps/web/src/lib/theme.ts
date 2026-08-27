'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'devigo:theme';

export type Theme = 'dark' | 'light';

/**
 * Theme preference. First visit follows the device setting; once the user
 * picks one it sticks. The attribute is written on <html> so the CSS token
 * blocks in globals.css resolve.
 */
export const useTheme = (): [Theme, (next: Theme) => void] => {
  const [theme, setThemeState] = useState<Theme>('dark');

  useEffect(() => {
    let initial: Theme = 'dark';
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') initial = saved;
      else if (window.matchMedia('(prefers-color-scheme: light)').matches) initial = 'light';
    } catch {
      // storage or matchMedia unavailable — dark is the product default
    }
    setThemeState(initial);
    document.documentElement.setAttribute('data-theme', initial);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    document.documentElement.setAttribute('data-theme', next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // noop
    }
  }, []);

  return [theme, setTheme];
};
