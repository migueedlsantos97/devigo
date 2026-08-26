import { describe, expect, it } from 'vitest';
import { DEFAULT_LOCALE, LOCALES, formatMoney, formatPercent, getDictionary, isLocale } from './index.js';

describe('i18n', () => {
  it('exposes a complete dictionary for every locale', () => {
    for (const locale of LOCALES) {
      const d = getDictionary(locale);
      expect(d.nav.console.length).toBeGreaterThan(0);
      expect(d.hero.h1a.length).toBeGreaterThan(0);
      expect(d.verdict.positive('5%')).toContain('5%');
    }
  });

  it('guards locale codes', () => {
    expect(isLocale('es')).toBe(true);
    expect(isLocale('de')).toBe(false);
    expect(DEFAULT_LOCALE).toBe('es');
  });

  it('formats money and percentages per locale', () => {
    expect(formatMoney('en', 38)).toContain('38');
    expect(formatMoney('es', 38)).toContain('38');
    expect(formatPercent('en', 0.0642, 2)).toBe('6.42%');
  });
});
