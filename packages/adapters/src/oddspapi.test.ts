import { describe, expect, it } from 'vitest';
import {
  createOddsPapiAdapter,
  OddsPapiError,
  OddsPapiRateLimitError,
  type OddsFeedEvent,
} from './index.js';

const AHEAD = new Date(Date.now() + 86_400_000).toISOString();
const BEHIND = new Date(Date.now() - 86_400_000).toISOString();

const fixture = (over: Partial<Record<string, unknown>> = {}) => ({
  fixtureId: 'fx1',
  startTime: AHEAD,
  hasOdds: true,
  participant1Name: 'CA Penarol Montevideo',
  participant2Name: 'Club Nacional de Football',
  tournamentName: 'Primera Division',
  categoryName: 'Uruguay',
  ...over,
});

/** One book quoting 1X2 (market 101) and over/under 2.5 (market 1010). */
const quote = (prices: {
  home?: number;
  draw?: number;
  away?: number;
  over?: number;
  under?: number;
  active?: boolean;
}) => {
  const cell = (price?: number) =>
    price === undefined ? undefined : { players: { '0': { active: prices.active ?? true, price } } };
  return {
    markets: {
      '101': { outcomes: { '101': cell(prices.home), '102': cell(prices.draw), '103': cell(prices.away) } },
      '1010': { outcomes: { '1010': cell(prices.over), '1011': cell(prices.under) } },
    },
  };
};

const stub = (routes: Record<string, unknown>, status = 200): typeof fetch =>
  (async (input: RequestInfo | URL) => {
    const url = String(input);
    const match = Object.keys(routes).find((key) => url.includes(key));
    if (match === undefined) return new Response('{}', { status: 404 });
    return new Response(JSON.stringify(routes[match]), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;

const FEED = {
  '/v4/fixtures': [fixture()],
  '/v4/odds': {
    bookmakerOdds: {
      pinnacle: quote({ home: 2.19, draw: 3.11, away: 3.54, over: 2.3, under: 1.65 }),
      bet365: quote({ home: 1.95, draw: 3.2, away: 3.5 }),
    },
  },
};

describe('oddspapi adapter', () => {
  it('turns one fixture into a row per book and market', async () => {
    const adapter = createOddsPapiAdapter({ apiKey: 'k', fetchImpl: stub(FEED) });
    expect(adapter.name).toBe('oddspapi');
    const events = await adapter.fetchEvents('278');

    // pinnacle quotes both markets, bet365 only the result.
    expect(events).toHaveLength(3);
    const result = events[0] as OddsFeedEvent;
    expect(result.market).toBe('h2h');
    expect(result.book).toBe('pinnacle');
    expect(result.league).toBe('Uruguay · Primera Division');
    expect(result.homeTeam).toBe('CA Penarol Montevideo');
    expect(result.runners.map((r) => r.label)).toEqual([
      'CA Penarol Montevideo',
      'Draw',
      'Club Nacional de Football',
    ]);
    expect(result.runners.map((r) => r.price)).toEqual([2.19, 3.11, 3.54]);
  });

  it('keeps the result runners in home, draw, away order the model expects', async () => {
    const adapter = createOddsPapiAdapter({ apiKey: 'k', fetchImpl: stub(FEED) });
    const events = await adapter.fetchEvents('278');
    const totals = events.find((event) => event.market === 'totals:2.5') as OddsFeedEvent;
    expect(totals.book).toBe('pinnacle');
    expect(totals.runners.map((r) => r.label)).toEqual(['Over', 'Under']);
    expect(totals.runners.map((r) => r.price)).toEqual([2.3, 1.65]);
  });

  it('drops a book missing a leg rather than letting it poison the consensus', async () => {
    const partial = {
      '/v4/fixtures': [fixture()],
      '/v4/odds': { bookmakerOdds: { thin: quote({ home: 2.1, away: 3.4 }) } },
    };
    const adapter = createOddsPapiAdapter({ apiKey: 'k', fetchImpl: stub(partial) });
    expect(await adapter.fetchEvents('278')).toHaveLength(0);
  });

  it('drops an inactive price', async () => {
    const suspended = {
      '/v4/fixtures': [fixture()],
      '/v4/odds': {
        bookmakerOdds: { off: quote({ home: 2.1, draw: 3.4, away: 3.6, active: false }) },
      },
    };
    const adapter = createOddsPapiAdapter({ apiKey: 'k', fetchImpl: stub(suspended) });
    expect(await adapter.fetchEvents('278')).toHaveLength(0);
  });

  it('skips a suspended book entirely', async () => {
    const off = {
      '/v4/fixtures': [fixture()],
      '/v4/odds': {
        bookmakerOdds: {
          paused: { suspended: true, ...quote({ home: 2.1, draw: 3.4, away: 3.6 }) },
        },
      },
    };
    const adapter = createOddsPapiAdapter({ apiKey: 'k', fetchImpl: stub(off) });
    expect(await adapter.fetchEvents('278')).toHaveLength(0);
  });

  it('ignores fixtures already kicked off and fixtures nobody prices', async () => {
    const mixed = {
      '/v4/fixtures': [
        fixture({ fixtureId: 'old', startTime: BEHIND }),
        fixture({ fixtureId: 'unpriced', hasOdds: false }),
      ],
      '/v4/odds': { bookmakerOdds: { pinnacle: quote({ home: 2, draw: 3, away: 4 }) } },
    };
    const adapter = createOddsPapiAdapter({ apiKey: 'k', fetchImpl: stub(mixed) });
    expect(await adapter.fetchEvents('278')).toHaveLength(0);
  });

  it('takes the soonest fixtures up to the per-tournament cap', async () => {
    const many = {
      '/v4/fixtures': [
        fixture({ fixtureId: 'c', startTime: new Date(Date.now() + 3 * 86_400_000).toISOString() }),
        fixture({ fixtureId: 'a', startTime: new Date(Date.now() + 1 * 86_400_000).toISOString() }),
        fixture({ fixtureId: 'b', startTime: new Date(Date.now() + 2 * 86_400_000).toISOString() }),
      ],
      '/v4/odds': { bookmakerOdds: { pinnacle: quote({ home: 2, draw: 3, away: 4 }) } },
    };
    const adapter = createOddsPapiAdapter({
      apiKey: 'k',
      fixturesPerTournament: 2,
      fetchImpl: stub(many),
    });
    const events = await adapter.fetchEvents('278');
    expect(events.map((event) => event.eventId)).toEqual(['a', 'b']);
  });

  it('tells a rate limit apart from an outage', async () => {
    const limited = createOddsPapiAdapter({
      apiKey: 'k',
      fetchImpl: stub({ '/v4/': { error: 'slow down' } }, 429),
    });
    await expect(limited.fetchEvents('278')).rejects.toBeInstanceOf(OddsPapiRateLimitError);

    const broken = createOddsPapiAdapter({
      apiKey: 'k',
      fetchImpl: stub({ '/v4/': { error: 'boom' } }, 503),
    });
    const failure = broken.fetchEvents('278');
    await expect(failure).rejects.toBeInstanceOf(OddsPapiError);
    await expect(failure).rejects.toThrow('503');
  });

  it('lists the tournament catalogue', async () => {
    const adapter = createOddsPapiAdapter({
      apiKey: 'k',
      fetchImpl: stub({
        '/v4/tournaments': [
          { tournamentId: 278, tournamentName: 'Primera Division', categoryName: 'Uruguay' },
        ],
      }),
    });
    const tournaments = await adapter.listTournaments();
    expect(tournaments[0]?.tournamentId).toBe(278);
  });
});
