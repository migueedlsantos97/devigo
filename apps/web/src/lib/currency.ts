'use client';

import { useCallback, useEffect, useState } from 'react';
import { LOCALE_META, type Locale } from '@devigo/i18n';

const STORAGE_KEY = 'devigo:currency';

/** Currencies offered in the selector; formatting locale gives natural symbols. */
export const CURRENCIES: ReadonlyArray<{ code: string; bcp47: string; label: string }> = [
  { code: 'UYU', bcp47: 'es-UY', label: '$U · UYU' },
  { code: 'USD', bcp47: 'en-US', label: '$ · USD' },
  { code: 'EUR', bcp47: 'es-ES', label: '€ · EUR' },
  { code: 'ARS', bcp47: 'es-AR', label: '$ · ARS' },
  { code: 'BRL', bcp47: 'pt-BR', label: 'R$ · BRL' },
  { code: 'MXN', bcp47: 'es-MX', label: '$ · MXN' },
  { code: 'CLP', bcp47: 'es-CL', label: '$ · CLP' },
  { code: 'COP', bcp47: 'es-CO', label: '$ · COP' },
  { code: 'PEN', bcp47: 'es-PE', label: 'S/ · PEN' },
];

export const isKnownCurrency = (code: string): boolean =>
  CURRENCIES.some((c) => c.code === code.toUpperCase());

/** User currency preference; null falls back to the locale's default (EUR/USD). */
export const useCurrency = (locale: Locale): [string, (code: string) => void] => {
  const [currency, setCurrencyState] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved !== null && isKnownCurrency(saved)) setCurrencyState(saved.toUpperCase());
    } catch {
      // storage unavailable
    }
  }, []);

  const setCurrency = useCallback((code: string) => {
    const clean = code.toUpperCase();
    if (!isKnownCurrency(clean)) return;
    setCurrencyState(clean);
    try {
      window.localStorage.setItem(STORAGE_KEY, clean);
    } catch {
      // noop
    }
  }, []);

  return [currency ?? LOCALE_META[locale].currency, setCurrency];
};

/** Formats money in the user's currency with its natural symbol ($U 4.092, € 38,50…). */
export const formatCurrency = (value: number, code: string): string => {
  const meta = CURRENCIES.find((c) => c.code === code);
  return new Intl.NumberFormat(meta?.bcp47 ?? 'en-US', {
    style: 'currency',
    currency: code,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
};
