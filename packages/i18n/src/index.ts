export * from './locales.js';
export * from './dictionaries.js';
export * from './format.js';

import { DICTIONARIES, type Dictionary } from './dictionaries.js';
import type { Locale } from './locales.js';

export const getDictionary = (locale: Locale): Dictionary => DICTIONARIES[locale];
