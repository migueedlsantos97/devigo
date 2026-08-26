import { LOCALE_META, type Locale } from './locales.js';

const cache = new Map<string, Intl.NumberFormat>();
const get = (key: string, make: () => Intl.NumberFormat): Intl.NumberFormat => {
  const hit = cache.get(key);
  if (hit) return hit;
  const made = make();
  cache.set(key, made);
  return made;
};

export const formatMoney = (locale: Locale, value: number, currency = LOCALE_META[locale].currency): string =>
  get(`m:${locale}:${currency}`, () =>
    new Intl.NumberFormat(LOCALE_META[locale].bcp47, { style: 'currency', currency, maximumFractionDigits: 2 }),
  ).format(value);

export const formatPercent = (locale: Locale, value: number, digits = 2): string =>
  get(`p:${locale}:${digits}`, () =>
    new Intl.NumberFormat(LOCALE_META[locale].bcp47, { style: 'percent', minimumFractionDigits: digits, maximumFractionDigits: digits }),
  ).format(value);

export const formatOdds = (locale: Locale, price: number): string =>
  get(`o:${locale}`, () =>
    new Intl.NumberFormat(LOCALE_META[locale].bcp47, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  ).format(price);
