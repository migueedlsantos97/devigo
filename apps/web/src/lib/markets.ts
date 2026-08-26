import type { Locale } from '@devigo/i18n';
import type { VigMethod } from '@devigo/core';

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
  readonly runners: ReadonlyArray<{ id: string; label: Record<Locale, string>; price: number }>;
}

export interface OddsFeedResponse {
  readonly source: 'live' | 'demo';
  readonly markets: ReadonlyArray<NormalizedMarket>;
}

const both = (v: string): Record<Locale, string> => ({ es: v, en: v });

/** Demo fixture shown until a live feed is configured (ODDS_API_KEY). */
export const DEMO_MARKETS: ReadonlyArray<NormalizedMarket> = [
  {
    id: 'm1', league: 'EPL', startsAt: '2026-08-29T13:00:00Z', matchup: 'Arsenal vs Brighton',
    marketName: both('1X2'),
    runners: [
      { id: 'm1a', label: both('Arsenal'), price: 1.72 },
      { id: 'm1b', label: { es: 'Empate', en: 'Draw' }, price: 4.1 },
      { id: 'm1c', label: both('Brighton'), price: 4.8 },
    ],
  },
  {
    id: 'm2', league: 'NBA', startsAt: '2026-08-29T17:30:00Z', matchup: 'Celtics @ Nuggets',
    marketName: { es: 'Ganador', en: 'Moneyline' },
    runners: [
      { id: 'm2a', label: both('Celtics'), price: 2.28 },
      { id: 'm2b', label: both('Nuggets'), price: 1.68 },
    ],
  },
  {
    id: 'm3', league: 'NFL', startsAt: '2026-08-30T16:05:00Z', matchup: 'Ravens vs Bengals',
    marketName: { es: 'Hándicap -2.5', en: 'Spread -2.5' },
    runners: [
      { id: 'm3a', label: both('Ravens -2.5'), price: 1.95 },
      { id: 'm3b', label: both('Bengals +2.5'), price: 1.92 },
    ],
  },
  {
    id: 'm4', league: 'LALIGA', startsAt: '2026-08-30T18:00:00Z', matchup: 'Girona vs Real Sociedad',
    marketName: { es: 'Más/Menos 2.5', en: 'Over/Under 2.5' },
    runners: [
      { id: 'm4a', label: { es: 'Más de 2.5', en: 'Over 2.5' }, price: 1.83 },
      { id: 'm4b', label: { es: 'Menos de 2.5', en: 'Under 2.5' }, price: 2.02 },
    ],
  },
  {
    id: 'm5', league: 'ATP', startsAt: '2026-08-31T09:00:00Z', matchup: 'Sinner vs Rune',
    marketName: { es: 'Ganador del partido', en: 'Match winner' },
    runners: [
      { id: 'm5a', label: both('Sinner'), price: 1.3 },
      { id: 'm5b', label: both('Rune'), price: 3.55 },
    ],
  },
  {
    id: 'm6', league: 'MLB', startsAt: '2026-08-30T23:10:00Z', matchup: 'Dodgers @ Padres',
    marketName: { es: 'Línea de carreras -1.5', en: 'Run line -1.5' },
    runners: [
      { id: 'm6a', label: both('Dodgers -1.5'), price: 2.15 },
      { id: 'm6b', label: both('Padres +1.5'), price: 1.76 },
    ],
  },
];

export const METHODS: ReadonlyArray<{ key: VigMethod; short: string }> = [
  { key: 'shin', short: 'SHIN' },
  { key: 'multiplicative', short: 'MULT' },
  { key: 'additive', short: 'ADD' },
];

/** Baseline bankroll fed to simulateTicket; median return = medianBankroll - SIM_BANKROLL. */
export const SIM_BANKROLL = 100;
export const DEFAULT_BANKROLL = 1000;
export const MIN_EDGE = 0.02;
export const KELLY_MULTIPLIER = 0.25;
