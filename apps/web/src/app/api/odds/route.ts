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

const toMarket = (event: OddsFeedEvent, leagueLabel: string, soccer: boolean): NormalizedMarket => {
  const threeWay = event.runners.length === 3;
  const matchup = soccer
    ? `${event.homeTeam} vs ${event.awayTeam}`
    : `${event.awayTeam} @ ${event.homeTeam}`;
  return {
    id: event.eventId,
    league: leagueLabel,
    startsAt: event.startsAt,
    matchup,
    marketName: threeWay ? { es: '1X2', en: '1X2' } : { es: 'Ganador', en: 'Moneyline' },
    runners: event.runners.map((r) => ({ id: r.id, label: { es: r.label, en: r.label }, price: r.price })),
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
      const seen = new Set<string>();
      const markets: NormalizedMarket[] = [];
      for (const event of events) {
        if (event.market !== 'h2h' || seen.has(event.eventId)) continue;
        if (event.runners.some((r) => r.price <= 1)) continue;
        seen.add(event.eventId);
        markets.push(toMarket(event, league.label, league.soccer));
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
