import { LOCALE_META, type Locale } from '@devigo/i18n';

const toLocalKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Local-calendar-day key ('YYYY-MM-DD') for an ISO timestamp, in the viewer's timezone. */
export const localDateKey = (iso: string): string => toLocalKey(new Date(iso));

export const todayKey = (): string => toLocalKey(new Date());

export const tomorrowKey = (): string => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toLocalKey(d);
};

/**
 * "HOY" / "MAÑANA" for the next two days, otherwise the short weekday alone —
 * day cards render the day number separately, so repeating it here would
 * read as "28 FRI 28".
 */
export const dayLabel = (
  key: string,
  locale: Locale,
  todayStr: string,
  tomorrowStr: string,
): string => {
  if (key === todayKey()) return todayStr;
  if (key === tomorrowKey()) return tomorrowStr;
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y as number, (m as number) - 1, d as number);
  return new Intl.DateTimeFormat(LOCALE_META[locale].bcp47, { weekday: 'short' })
    .format(date)
    .toUpperCase()
    .replace(/\.$/, '');
};
