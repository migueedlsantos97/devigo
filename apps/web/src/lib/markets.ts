import type { Locale } from '@devigo/i18n';
import type { BuildMode, VigMethod } from '@devigo/core';

/**
 * Market shape shared by the demo fixture and the live feed
 * (/api/odds normalises @devigo/adapters events into this).
 */
export interface NormalizedMarket {
  readonly id: string;
  readonly league: string;
  readonly startsAt: string;
  readonly matchup: string;
  readonly marketName: Record<Locale, string>;
  /**
   * `price` is the best commission-adjusted offer across `books`; `book` names the
   * offering bookmaker and `commission` its rate on net winnings ('' / 0 in demo).
   */
  readonly runners: ReadonlyArray<{
    id: string; label: Record<Locale, string>; price: number; book: string; commission: number;
  }>;
  /** Bookmaker keys behind `priceSets` rows; empty in demo (single implicit book). */
  readonly books: ReadonlyArray<string>;
  /** Per-book GROSS decimal prices (pre-commission), columns aligned with `runners`. Empty in demo. */
  readonly priceSets: ReadonlyArray<ReadonlyArray<number>>;
  /** Commission rate per `priceSets` row (0 for classic sportsbooks). Empty in demo. */
  readonly commissions: ReadonlyArray<number>;
}

export interface OddsFeedResponse {
  readonly source: 'live' | 'demo';
  readonly markets: ReadonlyArray<NormalizedMarket>;
}

const both = (v: string): Record<Locale, string> => ({ es: v, en: v });

const demoRunner = (id: string, label: Record<Locale, string>, price: number) => ({
  id, label, price, book: '', commission: 0,
});

/** Demo fixture shown until a live feed is configured (ODDS_API_KEY). */
export const DEMO_MARKETS: ReadonlyArray<NormalizedMarket> = [
  {
    id: 'm1', league: 'EPL', startsAt: '2026-08-29T13:00:00Z', matchup: 'Arsenal vs Brighton',
    marketName: both('1X2'), books: [], priceSets: [], commissions: [],
    runners: [
      demoRunner('m1a', both('Arsenal'), 1.72),
      demoRunner('m1b', { es: 'Empate', en: 'Draw' }, 4.1),
      demoRunner('m1c', both('Brighton'), 4.8),
    ],
  },
  {
    id: 'm2', league: 'NBA', startsAt: '2026-08-29T17:30:00Z', matchup: 'Celtics @ Nuggets',
    marketName: { es: 'Ganador', en: 'Moneyline' }, books: [], priceSets: [], commissions: [],
    runners: [
      demoRunner('m2a', both('Celtics'), 2.28),
      demoRunner('m2b', both('Nuggets'), 1.68),
    ],
  },
  {
    id: 'm3', league: 'NFL', startsAt: '2026-08-30T16:05:00Z', matchup: 'Ravens vs Bengals',
    marketName: { es: 'Hándicap -2.5', en: 'Spread -2.5' }, books: [], priceSets: [], commissions: [],
    runners: [
      demoRunner('m3a', both('Ravens -2.5'), 1.95),
      demoRunner('m3b', both('Bengals +2.5'), 1.92),
    ],
  },
  {
    id: 'm4', league: 'LALIGA', startsAt: '2026-08-30T18:00:00Z', matchup: 'Girona vs Real Sociedad',
    marketName: { es: 'Más/Menos 2.5', en: 'Over/Under 2.5' }, books: [], priceSets: [], commissions: [],
    runners: [
      demoRunner('m4a', { es: 'Más de 2.5', en: 'Over 2.5' }, 1.83),
      demoRunner('m4b', { es: 'Menos de 2.5', en: 'Under 2.5' }, 2.02),
    ],
  },
  {
    id: 'm5', league: 'ATP', startsAt: '2026-08-31T09:00:00Z', matchup: 'Sinner vs Rune',
    marketName: { es: 'Ganador del partido', en: 'Match winner' }, books: [], priceSets: [], commissions: [],
    runners: [
      demoRunner('m5a', both('Sinner'), 1.3),
      demoRunner('m5b', both('Rune'), 3.55),
    ],
  },
  {
    id: 'm6', league: 'MLB', startsAt: '2026-08-30T23:10:00Z', matchup: 'Dodgers @ Padres',
    marketName: { es: 'Línea de carreras -1.5', en: 'Run line -1.5' }, books: [], priceSets: [], commissions: [],
    runners: [
      demoRunner('m6a', both('Dodgers -1.5'), 2.15),
      demoRunner('m6b', both('Padres +1.5'), 1.76),
    ],
  },
];

export const METHODS: ReadonlyArray<{ key: VigMethod; short: string }> = [
  { key: 'shin', short: 'SHIN' },
  { key: 'multiplicative', short: 'MULT' },
  { key: 'additive', short: 'ADD' },
];

/** Sport a league/competition belongs to, for the sport-tab hierarchy above the board. */
export const SPORT_OF_LEAGUE: Record<string, { key: string; label: Record<Locale, string> }> = {
  EPL: { key: 'futbol', label: { es: 'Fútbol', en: 'Football' } },
  LALIGA: { key: 'futbol', label: { es: 'Fútbol', en: 'Football' } },
  NBA: { key: 'basket', label: { es: 'Baloncesto', en: 'Basketball' } },
  NFL: { key: 'nfl', label: { es: 'Fútbol americano', en: 'American football' } },
  MLB: { key: 'beisbol', label: { es: 'Béisbol', en: 'Baseball' } },
  ATP: { key: 'tenis', label: { es: 'Tenis', en: 'Tennis' } },
};

export const sportOf = (league: string): string => SPORT_OF_LEAGUE[league]?.key ?? 'other';
export const sportLabel = (sportKey: string, locale: Locale): string =>
  Object.values(SPORT_OF_LEAGUE).find((s) => s.key === sportKey)?.label[locale] ?? sportKey;

/**
 * Per-style ticket-builder config: how many legs it will use, the floor on a leg's
 * own fair probability and edge before it's even considered, and how much of a
 * full Kelly stake it recommends. Conservative trades payout for a higher floor;
 * fantasy drops BOTH floors — it is explicitly the no-value, chase-the-longshot
 * style, so gating it on +EV would leave it unable to build anything — and stakes
 * a token fraction of Kelly to match.
 */
export const STYLE_CONFIG: Record<BuildMode, { maxLegs: number; minLegProb: number; minEdge: number; kellyMultiplier: number }> = {
  conservative: { maxLegs: 3, minLegProb: 0.45, minEdge: 0.02, kellyMultiplier: 0.25 },
  balanced: { maxLegs: 4, minLegProb: 0.22, minEdge: 0.02, kellyMultiplier: 0.2 },
  fantasy: { maxLegs: 6, minLegProb: 0, minEdge: Number.NEGATIVE_INFINITY, kellyMultiplier: 0.1 },
};

/** Fixed pairwise correlation applied between legs sharing a matchup — not user-tunable. */
export const SAME_MATCH_RHO = 0.35;

export const STAKE_STEPS: ReadonlyArray<number> = [5, 10, 25, 50, 100];

/** Baseline bankroll fed to simulateTicket; median return = medianBankroll - SIM_BANKROLL. */
export const SIM_BANKROLL = 100;
export const DEFAULT_BANKROLL = 1000;
export const MIN_EDGE = 0.02;
export const KELLY_MULTIPLIER = 0.25;
