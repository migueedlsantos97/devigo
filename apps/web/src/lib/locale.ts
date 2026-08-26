'use client';

import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_LOCALE, isLocale, type Locale } from '@devigo/i18n';

const STORAGE_KEY = 'devigo:lang';

/** Client locale with localStorage persistence, per the handoff spec. */
export const useLocale = (): [Locale, (next: Locale) => void] => {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved !== null && isLocale(saved)) setLocale(saved);
    } catch {
      // storage unavailable
    }
  }, []);

  const set = useCallback((next: Locale) => {
    setLocale(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // noop
    }
  }, []);

  return [locale, set];
};
