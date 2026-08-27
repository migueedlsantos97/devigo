import type { OddsAdapter, OddsFeedEvent } from './index.js';

/**
 * OddsPapi feed adapter.
 *
 * Three calls deep: tournaments name the competitions, fixtures list a
 * competition's matches, and odds are fetched one fixture at a time — the odds
 * endpoint takes a single fixtureId and nothing else, so there is no way to
 * pull a whole tournament in one request.
 */
export interface OddsPapiOptions {
  readonly apiKey: string;
  /** Football. Other sports exist but the scoreline model cannot price them. */
  readonly sportId?: number;
  /** Matches per competition, per refresh — the main lever on request count. */
  readonly fixturesPerTournament?: number;
  /**
   * Minimum spacing between calls made through this adapter. OddsPapi rate
   * limits per endpoint, and fetching several competitions at once trips it
   * long before any documented quota, so every call this instance makes shares
   * one lane rather than racing.
   */
  readonly minGapMs?: number;
  /** How long to wait before the single retry after a 429. */
  readonly retryAfterMs?: number;
  readonly fetchImpl?: typeof fetch;
}

export class OddsPapiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'OddsPapiError';
  }
}

/** Raised on 429 so callers can tell a rate limit from an outage. */
export class OddsPapiRateLimitError extends OddsPapiError {
  constructor(message: string) {
    super(message, 429);
    this.name = 'OddsPapiRateLimitError';
  }
}

const BASE = 'https://api.oddspapi.io';
const SOCCER = 10;

/**
 * Market and outcome ids for football, lifted once from /v4/markets and kept
 * here rather than fetched: the live catalogue is 32,815 entries and we need
 * exactly these. Ids repeat across sports — 1010 is also an ice-hockey market —
 * so every id below was taken from the sportId 10 slice.
 */
const RESULT_MARKET = 101;
const RESULT_OUTCOMES = { home: 101, draw: 102, away: 103 } as const;

/**
 * Half-goal lines only, so a totals bet can never push. The market id and its
 * Over outcome share a number in this feed; they are listed separately anyway,
 * because relying on that coincidence would break silently if it ever stopped
 * holding.
 */
interface TotalsMarket {
  readonly line: number;
  readonly marketId: number;
  readonly over: number;
  readonly under: number;
}

const TOTALS_MARKETS: ReadonlyArray<TotalsMarket> = [
  { line: 0.5, marketId: 106, over: 106, under: 107 },
  { line: 1.5, marketId: 108, over: 108, under: 109 },
  { line: 2.5, marketId: 1010, over: 1010, under: 1011 },
  { line: 3.5, marketId: 1012, over: 1012, under: 1013 },
  { line: 4.5, marketId: 1014, over: 1014, under: 1015 },
  { line: 5.5, marketId: 1016, over: 1016, under: 1017 },
  { line: 6.5, marketId: 1018, over: 1018, under: 1019 },
];

interface Tournament {
  readonly tournamentId: number;
  readonly tournamentName: string;
  readonly categoryName: string;
  readonly categorySlug: string;
  readonly futureFixtures: number;
  readonly upcomingFixtures: number;
  readonly liveFixtures: number;
}

interface Fixture {
  readonly fixtureId: string;
  readonly startTime: string;
  readonly hasOdds: boolean;
  readonly participant1Name: string;
  readonly participant2Name: string;
  readonly tournamentName: string;
  readonly categoryName: string;
}

interface Outcome {
  readonly players?: Record<string, { readonly active?: boolean; readonly price?: number } | undefined>;
}

interface BookmakerOdds {
  readonly suspended?: boolean;
  readonly markets?: Record<string, { readonly outcomes?: Record<string, Outcome | undefined> } | undefined>;
}

interface OddsResponse {
  readonly bookmakerOdds?: Record<string, BookmakerOdds | undefined>;
}

/** A price is only usable if the book has it active and above evens-to-nothing. */
const priceOf = (odds: BookmakerOdds, marketId: number, outcomeId: number): number | null => {
  const outcome = odds.markets?.[String(marketId)]?.outcomes?.[String(outcomeId)];
  const player = outcome?.players?.['0'];
  if (!player || player.active === false) return null;
  const price = player.price;
  return typeof price === 'number' && price > 1 ? price : null;
};

export const createOddsPapiAdapter = (options: OddsPapiOptions): OddsAdapter & {
  listTournaments: () => Promise<ReadonlyArray<Tournament>>;
} => {
  const doFetch = options.fetchImpl ?? fetch;
  const sportId = options.sportId ?? SOCCER;
  const perTournament = options.fixturesPerTournament ?? 4;

  const minGapMs = options.minGapMs ?? 0;
  const retryAfterMs = options.retryAfterMs ?? 0;
  const sleep = (ms: number): Promise<void> =>
    ms <= 0 ? Promise.resolve() : new Promise((resolve) => setTimeout(resolve, ms));

  // One lane for every call this adapter makes: each waits its turn, then the
  // configured gap. Concurrency above this instance is what trips the limiter,
  // so the queue lives here rather than at the call site.
  let lane: Promise<unknown> = Promise.resolve();
  const queued = <T>(work: () => Promise<T>): Promise<T> => {
    const next = lane.then(work);
    lane = next.then(() => sleep(minGapMs), () => sleep(minGapMs));
    return next;
  };

  const send = async <T>(url: string): Promise<T> => {
    const response = await doFetch(url);
    if (response.status === 429) throw new OddsPapiRateLimitError('OddsPapi rate limit reached');
    if (!response.ok) {
      throw new OddsPapiError(`OddsPapi responded ${response.status}`, response.status);
    }
    return (await response.json()) as T;
  };

  const get = <T>(path: string): Promise<T> => {
    const separator = path.includes('?') ? '&' : '?';
    const url = `${BASE}${path}${separator}apiKey=${options.apiKey}`;
    return queued(async () => {
      try {
        return await send<T>(url);
      } catch (error) {
        // A rate limit is the one failure worth a second attempt: it says the
        // request was fine and the timing was not.
        if (!(error instanceof OddsPapiRateLimitError) || retryAfterMs <= 0) throw error;
        await sleep(retryAfterMs);
        return send<T>(url);
      }
    });
  };

  const listTournaments = (): Promise<ReadonlyArray<Tournament>> =>
    get<ReadonlyArray<Tournament>>(`/v4/tournaments?sportId=${sportId}`);

  return {
    name: 'oddspapi',
    listTournaments,

    /** `league` is a tournamentId, as listed by listTournaments. */
    async fetchEvents(league: string): Promise<ReadonlyArray<OddsFeedEvent>> {
      const fixtures = await get<ReadonlyArray<Fixture>>(
        `/v4/fixtures?tournamentId=${encodeURIComponent(league)}`,
      );

      // Only fixtures that are still ahead of us and that someone is pricing.
      const now = Date.now();
      const upcoming = fixtures
        .filter((fixture) => fixture.hasOdds && Date.parse(fixture.startTime) > now)
        .sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime))
        .slice(0, perTournament);

      const events: OddsFeedEvent[] = [];
      for (const fixture of upcoming) {
        const odds = await get<OddsResponse>(`/v4/odds?fixtureId=${fixture.fixtureId}`);
        const home = fixture.participant1Name;
        const away = fixture.participant2Name;
        const shared = {
          eventId: fixture.fixtureId,
          league: `${fixture.categoryName} · ${fixture.tournamentName}`,
          startsAt: fixture.startTime,
          homeTeam: home,
          awayTeam: away,
        };

        for (const [book, quote] of Object.entries(odds.bookmakerOdds ?? {})) {
          if (!quote || quote.suspended === true) continue;

          const result = [
            { id: home, label: home, price: priceOf(quote, RESULT_MARKET, RESULT_OUTCOMES.home) },
            { id: 'Draw', label: 'Draw', price: priceOf(quote, RESULT_MARKET, RESULT_OUTCOMES.draw) },
            { id: away, label: away, price: priceOf(quote, RESULT_MARKET, RESULT_OUTCOMES.away) },
          ];
          // A book that is missing any leg of the market cannot be de-vigged,
          // and a partial row would poison the consensus.
          if (result.every((runner) => runner.price !== null)) {
            events.push({
              ...shared,
              market: 'h2h',
              book,
              runners: result.map((runner) => ({ ...runner, price: runner.price as number })),
            });
          }

          for (const totals of TOTALS_MARKETS) {
            const over = priceOf(quote, totals.marketId, totals.over);
            const under = priceOf(quote, totals.marketId, totals.under);
            if (over === null || under === null) continue;
            events.push({
              ...shared,
              market: `totals:${totals.line}`,
              book,
              runners: [
                { id: 'Over', label: 'Over', price: over },
                { id: 'Under', label: 'Under', price: under },
              ],
            });
          }
        }
      }

      return events;
    },
  };
};
