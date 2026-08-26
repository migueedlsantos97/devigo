import { describe, expect, it } from 'vitest';
import { createTheOddsApiAdapter, toFairMarkets, type OddsFeedEvent } from './index.js';

const apiPayload = [
  {
    id: 'evt1',
    sport_key: 'soccer_epl',
    commence_time: '2026-08-29T14:00:00Z',
    home_team: 'Arsenal',
    away_team: 'Brighton',
    bookmakers: [
      {
        key: 'bookx',
        title: 'Book X',
        markets: [
          {
            key: 'h2h',
            outcomes: [
              { name: 'Arsenal', price: 1.72 },
              { name: 'Draw', price: 4.1 },
              { name: 'Brighton', price: 4.8 },
            ],
          },
        ],
      },
    ],
  },
];

const fetchOk: typeof fetch = async () =>
  new Response(JSON.stringify(apiPayload), { status: 200, headers: { 'content-type': 'application/json' } });

const fetch500: typeof fetch = async () => new Response('nope', { status: 500 });

describe('the-odds-api adapter', () => {
  it('normalises the feed into OddsFeedEvents', async () => {
    const adapter = createTheOddsApiAdapter({ apiKey: 'k', fetchImpl: fetchOk });
    expect(adapter.name).toBe('the-odds-api');
    const events = await adapter.fetchEvents('soccer_epl');
    expect(events).toHaveLength(1);
    const event = events[0] as OddsFeedEvent;
    expect(event.eventId).toBe('evt1');
    expect(event.book).toBe('bookx');
    expect(event.homeTeam).toBe('Arsenal');
    expect(event.awayTeam).toBe('Brighton');
    expect(event.runners).toHaveLength(3);
    expect(event.runners[0]?.price).toBe(1.72);
    expect(event.runners[1]?.id).toBe('evt1:h2h:1');
  });

  it('throws on a non-ok response', async () => {
    const adapter = createTheOddsApiAdapter({ apiKey: 'k', fetchImpl: fetch500 });
    await expect(adapter.fetchEvents('soccer_epl')).rejects.toThrow('Odds feed 500');
  });

  it('de-vigs a feed into fair markets', async () => {
    const adapter = createTheOddsApiAdapter({ apiKey: 'k', fetchImpl: fetchOk });
    const events = await adapter.fetchEvents('soccer_epl');
    const fair = toFairMarkets(events);
    expect(fair).toHaveLength(1);
    const market = fair[0]?.fair;
    expect(market?.method).toBe('shin');
    expect(market?.margin).toBeGreaterThan(0);
    const total = market?.runners.reduce((sum, r) => sum + r.fairProbability, 0) ?? 0;
    expect(total).toBeCloseTo(1, 9);
  });
});
