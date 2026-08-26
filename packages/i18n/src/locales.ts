export const LOCALES = ['es', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'es';

export const LOCALE_META: Record<Locale, { readonly label: string; readonly bcp47: string; readonly currency: string }> = {
  es: { label: 'Español', bcp47: 'es-ES', currency: 'EUR' },
  en: { label: 'English', bcp47: 'en-US', currency: 'USD' },
};

export const isLocale = (value: string): value is Locale =>
  (LOCALES as ReadonlyArray<string>).includes(value);
