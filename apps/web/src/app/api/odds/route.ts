import { adjustForCommission, bestOffers } from '@devigo/core';
import {
  createOddsPapiAdapter,
  OddsPapiRateLimitError,
  type OddsFeedEvent,
} from '@devigo/adapters';
import type { NormalizedMarket, OddsFeedResponse } from '@/lib/markets';

// The handler itself must run on every request: the API key is a runtime env
// var, and the board is assembled from whatever is warm right now.
export const dynamic = 'force-dynamic';

/**
 * Competitions by OddsPapi tournament id. South America first: it is the home
 * market and the only one where a Uruguayan bettor's fixtures actually live.
 *
 * Uruguay's own Primera is here, which is the point of the provider switch —
 * no other feed we found carries it.
 */
const TOURNAMENTS: ReadonlyArray<{ id: number; label: string }> = [
  { id: 278, label: 'Uruguay · Primera' },
  { id: 37127, label: 'Uruguay · Copa' },
  { id: 384, label: 'Libertadores' },
  { id: 480, label: 'Sudamericana' },
  { id: 155, label: 'Argentina · Liga Profesional' },
  { id: 325, label: 'Brasil · Série A' },
  { id: 390, label: 'Brasil · Série B' },
  { id: 27665, label: 'Chile · Primera' },
  { id: 406, label: 'Perú · Liga 1' },
  { id: 27070, label: 'Colombia · Primera A' },
  { id: 240, label: 'Ecuador · LigaPro' },
  { id: 33980, label: 'Bolivia · División Profesional' },
  { id: 231, label: 'Venezuela · Primera' },
  { id: 853, label: 'Amistosos de clubes' },
  { id: 17, label: 'Premier League' },
  { id: 8, label: 'LaLiga' },
];

/**
 * COST. One fixtures call per competition plus one odds call per fixture:
 * 16 competitions x (1 + 3) = 64 requests to fill the board from cold. At an
 * hour's cache that is ~46k requests a month under constant traffic, inside
 * OddsPapi's ~100k tier, and far less in practice because only a miss spends.
 */
const FIXTURES_PER_TOURNAMENT = 3;
const MAX_BOOKS_PER_EVENT = 24;
/**
 * OddsPapi rate limits per endpoint well before any documented quota, so every
 * call goes through one lane inside the adapter with this gap between them.
 */
const REQUEST_GAP_MS = 250;
const RETRY_AFTER_MS = 1200;
/**
 * How long this handler is allowed to spend filling a cold cache. Kept under a
 * serverless function's timeout: better to answer with part of the board and
 * warm the rest on the next load than to be killed holding all of it.
 */
const BUDGET_MS = 8000;
/** How long a competition stays warm before it is worth asking again. */
const CACHE_MS = 60 * 60 * 1000;

/**
 * Commission on net winnings charged by betting exchanges (classic sportsbooks
 * charge nothing here — their take is already inside the price as vig).
 */
const EXCHANGE_COMMISSION: Record<string, number> = {
  'betfair-ex': 0.05,
  smarkets: 0.02,
  matchbook: 0.02,
  betdaq: 0.02,
};

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

/** Folds one fixture's per-book quotes for a single market into a price matrix. */
const toMarket = (
  group: ReadonlyArray<OddsFeedEvent>,
  leagueLabel: string,
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

  const marketName =
    point !== null
      ? { es: `Más/Menos ${point}`, en: `Over/Under ${point}` }
      : { es: '1X2', en: '1X2' };

  return {
    id: `${first.eventId}:${first.market}`,
    eventId: first.eventId,
    league: leagueLabel,
    startsAt: first.startsAt,
    matchup: `${first.homeTeam} vs ${first.awayTeam}`,
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

/** The line the market concentrates on; everything else is a side quote. */
const CENTRAL_LINE = 2.5;

/**
 * The totals line to calibrate a fixture on.
 *
 * Not simply the most-quoted line: a 0.5 line is often quoted by everyone and
 * says almost nothing about how many goals a match will have, and anchoring the
 * fit there can ask for fewer goals than the 1X2 shape can produce — which the
 * model cannot deliver, because its shared-goals term only ever adds goals. So
 * among lines with real book coverage, take the one nearest the centre.
 */
const pickTotals = (
  byMarket: Map<string, OddsFeedEvent[]>,
): ReadonlyArray<OddsFeedEvent> | null => {
  const lines = [...byMarket.entries()]
    .map(([key, group]) => ({ line: Number(totalsPoint(key)), group }))
    .filter((entry) => Number.isFinite(entry.line));
  if (lines.length === 0) return null;

  const deepest = Math.max(...lines.map((entry) => entry.group.length));
  const wellQuoted = lines.filter((entry) => entry.group.length >= deepest / 2);
  wellQuoted.sort(
    (a, b) => Math.abs(a.line - CENTRAL_LINE) - Math.abs(b.line - CENTRAL_LINE),
  );
  return wellQuoted[0]?.group ?? null;
};

const toMarkets = (
  events: ReadonlyArray<OddsFeedEvent>,
  leagueLabel: string,
): ReadonlyArray<NormalizedMarket> => {
  const byFixture = new Map<string, Map<string, OddsFeedEvent[]>>();
  for (const event of events) {
    const perMarket = byFixture.get(event.eventId) ?? new Map<string, OddsFeedEvent[]>();
    byFixture.set(event.eventId, perMarket);
    const group = perMarket.get(event.market);
    if (group) group.push(event);
    else perMarket.set(event.market, [event]);
  }

  const markets: NormalizedMarket[] = [];
  for (const perMarket of byFixture.values()) {
    const result = perMarket.get('h2h');
    const resultMarket = result ? toMarket(result, leagueLabel) : null;
    // Without a result market there is nothing to fit and nothing to shop:
    // a lone totals line is not a fixture the board can price.
    if (!resultMarket) continue;
    markets.push(resultMarket);

    const totals = pickTotals(perMarket);
    const totalsMarket = totals ? toMarket(totals, leagueLabel) : null;
    if (totalsMarket) markets.push(totalsMarket);
  }
  return markets;
};

/**
 * Competition → the markets last built for it. Next's Data Cache is bypassed
 * by `force-dynamic` here, which would make every load re-fetch the whole
 * board, so the cache is kept explicitly instead of relying on framework
 * semantics that are easy to get wrong and silent when they are.
 *
 * A serverless instance holds its own copy, so a cold instance pays again.
 * That is a smaller cost than refetching sixteen competitions per request.
 */
const cache = new Map<number, { readonly at: number; readonly markets: ReadonlyArray<NormalizedMarket> }>();

/**
 * A frozen capture of a real feed response, for building against without
 * spending the request allowance. The prices in it are genuine but stale, so it
 * is refused outside development however the flag is set: a stale price shown
 * as a live one is the single most misleading thing this product could do.
 */
const snapshot = async (): Promise<Response | null> => {
  if (process.env['ODDS_SNAPSHOT'] !== '1' || process.env.NODE_ENV === 'production') return null;
  const { readFile } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const raw = await readFile(join(process.cwd(), 'fixtures', 'feed-snapshot.json'), 'utf8');
  const body = JSON.parse(raw) as OddsFeedResponse;
  return Response.json(body);
};

export async function GET(): Promise<Response> {
  const frozen = await snapshot();
  if (frozen) return frozen;

  const apiKey = process.env['ODDSPAPI_API_KEY'];
  if (!apiKey) {
    const body: OddsFeedResponse = { source: 'unavailable', markets: [] };
    return Response.json(body);
  }

  const adapter = createOddsPapiAdapter({
    apiKey,
    fixturesPerTournament: FIXTURES_PER_TOURNAMENT,
    minGapMs: REQUEST_GAP_MS,
    retryAfterMs: RETRY_AFTER_MS,
  });

  /**
   * Cached competitions are served free and instantly; the rest are fetched in
   * order until the budget runs out, and whatever is left waits for the next
   * load. The board therefore fills in over the first few loads rather than one
   * request hanging long enough for the platform to kill it.
   */
  const now = Date.now();
  const deadline = now + BUDGET_MS;
  const markets: NormalizedMarket[] = [];
  let throttled = false;
  let reached = false;

  for (const tournament of TOURNAMENTS) {
    const hit = cache.get(tournament.id);
    if (hit && now - hit.at < CACHE_MS) {
      markets.push(...hit.markets);
      reached = true;
      continue;
    }
    if (Date.now() > deadline) continue;
    try {
      const fresh = toMarkets(await adapter.fetchEvents(String(tournament.id)), tournament.label);
      cache.set(tournament.id, { at: Date.now(), markets: fresh });
      markets.push(...fresh);
      reached = true;
    } catch (error) {
      if (error instanceof OddsPapiRateLimitError) throttled = true;
      // Stale beats empty: a competition we already have is worth showing
      // while the provider is unhappy, rather than dropping it off the board.
      if (hit) markets.push(...hit.markets);
    }
  }

  if (markets.length) return Response.json({ source: 'live', markets } satisfies OddsFeedResponse);

  // A rate limit is temporary and a plan limit is not, but the user's next move
  // is the same either way: wait. 'quota' says that; 'unavailable' says the feed
  // is broken, which would send them looking for a fault that is not there.
  const body: OddsFeedResponse = {
    source: throttled || !reached ? 'quota' : 'unavailable',
    markets: [],
  };
  return Response.json(body);
}
