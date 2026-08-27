import { adjustForCommission, bestOffers } from '@devigo/core';
import { createTheOddsApiAdapter, OddsFeedQuotaError, type OddsFeedEvent } from '@devigo/adapters';
import type { NormalizedMarket, OddsFeedResponse } from '@/lib/markets';

// Always evaluated at request time (the API key is a runtime env var); the
// upstream feed itself is cached for 5 minutes via the fetch Data Cache below.
export const dynamic = 'force-dynamic';

const LEAGUES: ReadonlyArray<{ key: string; label: string; soccer: boolean }> = [
  { key: 'soccer_epl', label: 'EPL', soccer: true },
  { key: 'basketball_nba', label: 'NBA', soccer: false },
  { key: 'soccer_spain_la_liga', label: 'LALIGA', soccer: true },
  { key: 'americanfootball_nfl', label: 'NFL', soccer: false },
];

const MAX_EVENTS_PER_LEAGUE = 3;
const MAX_BOOKS_PER_EVENT = 10;

/**
 * Commission on net winnings charged by betting exchanges (classic sportsbooks
 * charge nothing here — their take is already inside the price as vig).
 * Standard published base rates; adjust if your account tier differs.
 */
const EXCHANGE_COMMISSION: Record<string, number> = {
  betfair_ex_uk: 0.05,
  betfair_ex_eu: 0.05,
  betfair_ex_au: 0.05,
  smarkets: 0.02,
  matchbook: 0.02,
  betdaq: 0.02,
};

/** Groups one event's per-book h2h quotes into a single market with an aligned price matrix. */
const totalsPoint = (market: string): string | null => {
  const m = /^totals:(.+)$/.exec(market);
  return m ? (m[1] as string) : null;
};

const runnerLabel = (raw: string, point: string | null): { es: string; en: string } => {
  if (point !== null && raw === 'Over') return { es: `Más de ${point}`, en: `Over ${point}` };
  if (point !== null && raw === 'Under') return { es: `Menos de ${point}`, en: `Under ${point}` };
  if (raw === 'Draw') return { es: 'Empate', en: 'Draw' };
  return { es: raw, en: raw };
};

const toMarket = (
  group: ReadonlyArray<OddsFeedEvent>,
  leagueLabel: string,
  soccer: boolean,
): NormalizedMarket | null => {
  const first = group[0];
  if (!first || first.runners.length < 2) return null;
  const labels = first.runners.map((r) => r.label);
  const point = totalsPoint(first.market);

  const books: string[] = [];
  const priceSets: number[][] = [];
  for (const quote of group) {
    if (books.length >= MAX_BOOKS_PER_EVENT) break;
    if (books.includes(quote.book)) continue;
    const byLabel = new Map(quote.runners.map((r) => [r.label, r.price]));
    const set = labels.map((label) => byLabel.get(label) ?? 0);
    if (set.some((price) => !(price > 1))) continue;
    books.push(quote.book);
    priceSets.push(set);
  }
  if (priceSets.length === 0) return null;

  // Line-shop on commission-adjusted (net) prices; consensus stays on gross ones.
  const commissions = books.map((book) => EXCHANGE_COMMISSION[book] ?? 0);
  const netSets = priceSets.map((set, b) =>
    set.map((price) => adjustForCommission(price, commissions[b] ?? 0)),
  );
  const offers = bestOffers(netSets);
  const matchup = soccer
    ? `${first.homeTeam} vs ${first.awayTeam}`
    : `${first.awayTeam} @ ${first.homeTeam}`;

  const marketName =
    point !== null
      ? { es: `Más/Menos ${point}`, en: `Over/Under ${point}` }
      : labels.length === 3
        ? { es: '1X2', en: '1X2' }
        : { es: 'Ganador', en: 'Moneyline' };

  return {
    id: `${first.eventId}:${first.market}`,
    eventId: first.eventId,
    league: leagueLabel,
    startsAt: first.startsAt,
    matchup,
    homeTeam: first.homeTeam,
    awayTeam: first.awayTeam,
    totalsLine: point === null ? null : Number(point),
    marketName,
    runners: labels.map((label, i) => {
      const offer = offers[i] ?? { price: 0, book: 0 };
      return {
        id: `${first.eventId}:${first.market}:${i}`,
        label: runnerLabel(label, point),
        price: offer.price,
        book: books[offer.book] ?? '',
        commission: commissions[offer.book] ?? 0,
      };
    }),
    books,
    priceSets,
    commissions,
  };
};

export async function GET(): Promise<Response> {
  const apiKey = process.env['ODDS_API_KEY'];
  if (!apiKey) {
    const body: OddsFeedResponse = { source: 'unavailable', markets: [] };
    return Response.json(body);
  }

  const adapter = createTheOddsApiAdapter({
    apiKey,
    markets: 'h2h,totals',
    fetchImpl: (input, init) => fetch(input, { ...init, next: { revalidate: 900 } }),
  });

  const settled = await Promise.allSettled(
    LEAGUES.map(async (league) => {
      const events = await adapter.fetchEvents(league.key);
      // Group quotes by (event, market-line); keep event order of first appearance.
      const byEvent = new Map<string, Map<string, OddsFeedEvent[]>>();
      for (const event of events) {
        if (event.market !== 'h2h' && totalsPoint(event.market) === null) continue;
        const perMarket = byEvent.get(event.eventId) ?? new Map<string, OddsFeedEvent[]>();
        if (!byEvent.has(event.eventId)) byEvent.set(event.eventId, perMarket);
        const group = perMarket.get(event.market);
        if (group) group.push(event);
        else perMarket.set(event.market, [event]);
      }
      const markets: NormalizedMarket[] = [];
      let eventCount = 0;
      for (const perMarket of byEvent.values()) {
        if (eventCount >= MAX_EVENTS_PER_LEAGUE) break;
        eventCount += 1;
        const h2h = perMarket.get('h2h');
        const h2hMarket = h2h ? toMarket(h2h, league.label, league.soccer) : null;
        if (h2hMarket) markets.push(h2hMarket);
        // Of the totals lines quoted, keep the one with the deepest book coverage.
        const totalsGroups = [...perMarket.entries()]
          .filter(([key]) => totalsPoint(key) !== null)
          .map(([, group]) => group)
          .sort((a, b) => b.length - a.length);
        const bestTotals = totalsGroups[0];
        const totalsMarket = bestTotals ? toMarket(bestTotals, league.label, league.soccer) : null;
        if (totalsMarket) markets.push(totalsMarket);
      }
      return markets;
    }),
  );

  const markets = settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
  if (markets.length) return Response.json({ source: 'live', markets } satisfies OddsFeedResponse);

  const quotaSpent = settled.some(
    (r) => r.status === 'rejected' && r.reason instanceof OddsFeedQuotaError,
  );
  const body: OddsFeedResponse = { source: quotaSpent ? 'quota' : 'unavailable', markets: [] };
  return Response.json(body);
}
