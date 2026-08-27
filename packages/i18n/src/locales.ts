export const LOCALES = ['es', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'es';

/**
 * Spanish here means the Río de la Plata, not Spain: the board is South
 * American football and the first user is in Montevideo, so pesos and the
 * local date format are the defaults that need no changing. Either can still
 * be switched in the header.
 */
export const LOCALE_META: Record<Locale, { readonly label: string; readonly bcp47: string; readonly currency: string }> = {
  es: { label: 'Español', bcp47: 'es-UY', currency: 'UYU' },
  en: { label: 'English', bcp47: 'en-US', currency: 'USD' },
};

export const isLocale = (value: string): value is Locale =>
  (LOCALES as ReadonlyArray<string>).includes(value);
