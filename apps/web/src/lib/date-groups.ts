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

/** How far ahead the board is showing. */
export type MatchWindow = 'today' | 'tomorrow' | 'threeDays' | 'all';

const daysAhead = (key: string): number => {
  const [y, m, d] = key.split('-').map(Number);
  const day = new Date(y as number, (m as number) - 1, d as number);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((day.getTime() - today.getTime()) / 86_400_000);
};

/**
 * Whether a fixture falls inside a window, counted in the viewer's own
 * calendar days rather than in hours from now: "tomorrow" has to mean the
 * date on their phone, not a rolling twenty-four hours, or a match at 21:00
 * tonight lands under "tomorrow" for anyone browsing after 21:00.
 *
 * A fixture already in the past is outside every window but `all`, which is
 * the escape hatch that shows the board exactly as the feed sent it.
 */
export const withinWindow = (iso: string, window: MatchWindow): boolean => {
  if (window === 'all') return true;
  const ahead = daysAhead(localDateKey(iso));
  if (ahead < 0) return false;
  if (window === 'today') return ahead === 0;
  if (window === 'tomorrow') return ahead === 1;
  return ahead <= 2;
};
