import type { VigMethod } from '@devigo/core';
import type { Locale } from '@devigo/i18n';

/**
 * Fixture market data matching the design handoff. In production this is
 * replaced by the live feed via @devigo/adapters behind a route handler
 * (OddsFeedEvent -> the same shape).
 */
export interface MarketFixture {
  readonly id: string;
  readonly league: string;
  readonly time: Record<Locale, string>;
  readonly matchup: string;
  readonly market: Record<Locale, string>;
  readonly runners: ReadonlyArray<{ id: string; label: Record<Locale, string>; price: number }>;
}

export const MARKETS: ReadonlyArray<MarketFixture> = [
  {
    id: 'm1', league: 'EPL', time: { es: 'SÁB 15:00', en: 'SAT 15:00' }, matchup: 'Arsenal vs Brighton',
    market: { es: '1X2', en: '1X2' },
    runners: [
      { id: 'm1a', label: { es: 'Arsenal', en: 'Arsenal' }, price: 1.72 },
      { id: 'm1b', label: { es: 'Empate', en: 'Draw' }, price: 4.1 },
      { id: 'm1c', label: { es: 'Brighton', en: 'Brighton' }, price: 4.8 },
    ],
  },
  {
    id: 'm2', league: 'NBA', time: { es: 'SÁB 19:30', en: 'SAT 19:30' }, matchup: 'Celtics @ Nuggets',
    market: { es: 'Ganador', en: 'Moneyline' },
    runners: [
      { id: 'm2a', label: { es: 'Celtics', en: 'Celtics' }, price: 2.28 },
      { id: 'm2b', label: { es: 'Nuggets', en: 'Nuggets' }, price: 1.68 },
    ],
  },
  {
    id: 'm3', league: 'NFL', time: { es: 'DOM 18:05', en: 'SUN 18:05' }, matchup: 'Ravens vs Bengals',
    market: { es: 'Hándicap -2.5', en: 'Spread -2.5' },
    runners: [
      { id: 'm3a', label: { es: 'Ravens -2.5', en: 'Ravens -2.5' }, price: 1.95 },
      { id: 'm3b', label: { es: 'Bengals +2.5', en: 'Bengals +2.5' }, price: 1.92 },
    ],
  },
  {
    id: 'm4', league: 'LALIGA', time: { es: 'DOM 20:00', en: 'SUN 20:00' }, matchup: 'Girona vs Real Sociedad',
    market: { es: 'Más/Menos 2.5', en: 'Over/Under 2.5' },
    runners: [
      { id: 'm4a', label: { es: 'Más de 2.5', en: 'Over 2.5' }, price: 1.83 },
      { id: 'm4b', label: { es: 'Menos de 2.5', en: 'Under 2.5' }, price: 2.02 },
    ],
  },
  {
    id: 'm5', league: 'ATP', time: { es: 'LUN 11:00', en: 'MON 11:00' }, matchup: 'Sinner vs Rune',
    market: { es: 'Ganador del partido', en: 'Match winner' },
    runners: [
      { id: 'm5a', label: { es: 'Sinner', en: 'Sinner' }, price: 1.3 },
      { id: 'm5b', label: { es: 'Rune', en: 'Rune' }, price: 3.55 },
    ],
  },
  {
    id: 'm6', league: 'MLB', time: { es: 'LUN 01:10', en: 'MON 01:10' }, matchup: 'Dodgers @ Padres',
    market: { es: 'Línea de carreras -1.5', en: 'Run line -1.5' },
    runners: [
      { id: 'm6a', label: { es: 'Dodgers -1.5', en: 'Dodgers -1.5' }, price: 2.15 },
      { id: 'm6b', label: { es: 'Padres +1.5', en: 'Padres +1.5' }, price: 1.76 },
    ],
  },
];

export const METHODS: ReadonlyArray<{ key: VigMethod; short: string }> = [
  { key: 'shin', short: 'SHIN' },
  { key: 'multiplicative', short: 'MULT' },
  { key: 'additive', short: 'ADD' },
];

export const BOOK_COUNT = 14;
/** Baseline bankroll fed to simulateTicket; median return = medianBankroll - SIM_BANKROLL. */
export const SIM_BANKROLL = 100;
export const BANKROLL = 4820;
export const MIN_EDGE = 0.02;
export const KELLY_MULTIPLIER = 0.25;
