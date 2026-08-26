import { bestOffers } from '@devigo/core';
import { createTheOddsApiAdapter, type OddsFeedEvent } from '@devigo/adapters';
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

/** Groups one event's per-book h2h quotes into a single market with an aligned price matrix. */
const toMarket = (
  group: ReadonlyArray<OddsFeedEvent>,
  leagueLabel: string,
  soccer: boolean,
): NormalizedMarket | null => {
  const first = group[0];
  if (!first || first.runners.length < 2) return null;
  const labels = first.runners.map((r) => r.label);

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

  const offers = bestOffers(priceSets);
  const matchup = soccer
    ? `${first.homeTeam} vs ${first.awayTeam}`
    : `${first.awayTeam} @ ${first.homeTeam}`;

  return {
    id: first.eventId,
    league: leagueLabel,
    startsAt: first.startsAt,
    matchup,
    marketName: labels.length === 3 ? { es: '1X2', en: '1X2' } : { es: 'Ganador', en: 'Moneyline' },
    runners: labels.map((label, i) => {
      const offer = offers[i] ?? { price: 0, book: 0 };
      return {
        id: `${first.eventId}:${i}`,
        label: { es: label, en: label },
        price: offer.price,
        book: books[offer.book] ?? '',
      };
    }),
    books,
    priceSets,
  };
};

export async function GET(): Promise<Response> {
  const apiKey = process.env['ODDS_API_KEY'];
  if (!apiKey) {
    const body: OddsFeedResponse = { source: 'demo', markets: [] };
    return Response.json(body);
  }

  const adapter = createTheOddsApiAdapter({
    apiKey,
    fetchImpl: (input, init) => fetch(input, { ...init, next: { revalidate: 300 } }),
  });

  const settled = await Promise.allSettled(
    LEAGUES.map(async (league) => {
      const events = await adapter.fetchEvents(league.key);
      const byEvent = new Map<string, OddsFeedEvent[]>();
      for (const event of events) {
        if (event.market !== 'h2h') continue;
        const group = byEvent.get(event.eventId);
        if (group) group.push(event);
        else byEvent.set(event.eventId, [event]);
      }
      const markets: NormalizedMarket[] = [];
      for (const group of byEvent.values()) {
        const market = toMarket(group, league.label, league.soccer);
        if (market) markets.push(market);
        if (markets.length >= MAX_EVENTS_PER_LEAGUE) break;
      }
      return markets;
    }),
  );

  const markets = settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
  const body: OddsFeedResponse = markets.length
    ? { source: 'live', markets }
    : { source: 'demo', markets: [] };
  return Response.json(body);
}
