import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { NormalizedMarket, OddsFeedResponse } from '@/lib/markets';
import { fitMatchModel, groupMatches, type MatchGroup } from '@/lib/match-model';
import { buildTicket, candidatesFor, type CandidateLeg } from '@/lib/builder';

/** Real prices, captured from the live feed. Frozen, not invented. */
const snapshot = JSON.parse(
  readFileSync(join(process.cwd(), 'fixtures', 'feed-snapshot.json'), 'utf8'),
) as OddsFeedResponse & { markets: NormalizedMarket[] };

const matches = groupMatches(snapshot.markets);
const modelled = matches
  .map((match) => ({ match, model: fitMatchModel(match) }))
  .filter((entry): entry is { match: MatchGroup; model: NonNullable<typeof entry.model> } =>
    entry.model !== null,
  );

const groupsFor = (count: number): ReadonlyArray<ReadonlyArray<CandidateLeg>> =>
  modelled.slice(0, count).map((entry) => candidatesFor(entry.match, entry.model));

describe('candidatesFor', () => {
  it('offers the three results and both sides of the totals line', () => {
    const entry = modelled.find((e) => e.match.totals !== null)!;
    const legs = candidatesFor(entry.match, entry.model);
    expect(legs).toHaveLength(5);
    expect(legs.map((l) => l.key.split(':').pop())).toEqual(
      expect.arrayContaining(['home', 'draw', 'away', 'over', 'under']),
    );
  });

  it('offers only the results when the fixture has no totals market', () => {
    const entry = modelled.find((e) => e.match.totals === null);
    if (!entry) return;
    expect(candidatesFor(entry.match, entry.model)).toHaveLength(3);
  });

  it('carries a real book behind every price', () => {
    for (const leg of candidatesFor(modelled[0]!.match, modelled[0]!.model)) {
      expect(leg.price).toBeGreaterThan(1);
      expect(leg.book.length).toBeGreaterThan(0);
      expect(leg.edge).toBeCloseTo(leg.fairProbability * leg.price - 1, 12);
    }
  });
});

describe('buildTicket', () => {
  it('builds nothing from nothing', () => {
    expect(buildTicket([], 'valor')).toBeNull();
    expect(buildTicket([[]], 'valor')).toBeNull();
  });

  it('takes one leg per match', () => {
    const groups = groupsFor(4);
    for (const objective of ['cobrar', 'valor', 'pagar'] as const) {
      const ticket = buildTicket(groups, objective)!;
      expect(ticket.legs).toHaveLength(4);
      expect(new Set(ticket.legs.map((l) => l.matchId)).size).toBe(4);
    }
  });

  it('gives each objective the ticket it asks for', () => {
    const groups = groupsFor(4);
    const cobrar = buildTicket(groups, 'cobrar')!;
    const valor = buildTicket(groups, 'valor')!;
    const pagar = buildTicket(groups, 'pagar')!;

    expect(pagar.price).toBeGreaterThanOrEqual(valor.price);
    expect(pagar.price).toBeGreaterThanOrEqual(cobrar.price);
    expect(valor.edge).toBeGreaterThanOrEqual(cobrar.edge);
    expect(valor.edge).toBeGreaterThanOrEqual(pagar.edge);
    expect(cobrar.probability).toBeGreaterThan(pagar.probability);
  });

  it('keeps `cobrar` above the floor by trading the cheapest leg', () => {
    const groups = groupsFor(2);
    const ticket = buildTicket(groups, 'cobrar', 3)!;
    expect(ticket.price).toBeGreaterThanOrEqual(3);
  });

  it('settles the arithmetic consistently', () => {
    const ticket = buildTicket(groupsFor(3), 'valor')!;
    expect(ticket.price).toBeCloseTo(
      ticket.legs.reduce((p, l) => p * l.price, 1),
      10,
    );
    expect(ticket.probability).toBeCloseTo(
      ticket.legs.reduce((p, l) => p * l.fairProbability, 1),
      10,
    );
    expect(ticket.fairPrice).toBeCloseTo(1 / ticket.probability, 10);
    expect(ticket.edge).toBeCloseTo(ticket.probability * ticket.price - 1, 10);
  });

  it('stakes nothing when the ticket has no edge', () => {
    const ticket = buildTicket(groupsFor(6), 'pagar')!;
    expect(ticket.edge).toBeLessThan(0);
    expect(ticket.kelly).toBe(0);
  });

  it('gives up rather than loop when no trade can reach the floor', () => {
    const groups = groupsFor(1);
    const ticket = buildTicket(groups, 'cobrar', 1000)!;
    expect(ticket.legs).toHaveLength(1);
    expect(ticket.price).toBeLessThan(1000);
  });
});

describe('the captured board', () => {
  it('is real data with matches the model can price', () => {
    expect(snapshot.source).toBe('live');
    expect(matches.length).toBeGreaterThan(40);
    expect(modelled.length).toBe(matches.length);
    expect(matches.some((m) => /Uruguay/.test(m.league))).toBe(true);
  });
});

describe('the longshot floor', () => {
  it('keeps every `valor` leg above the floor', () => {
    // Across the whole captured board, so this is the rule holding rather than
    // four fixtures happening not to test it.
    const groups = modelled.map((entry) => candidatesFor(entry.match, entry.model));
    const valor = buildTicket(groups, 'valor')!;
    expect(valor.legs).toHaveLength(groups.length);
    expect(valor.legs.every((l) => l.fairProbability >= 0.2)).toBe(true);
  });

  it('lets `pagar` take the longshots `valor` refuses', () => {
    const groups = modelled.map((entry) => candidatesFor(entry.match, entry.model));
    const pagar = buildTicket(groups, 'pagar')!;
    expect(pagar.legs.some((l) => l.fairProbability < 0.2)).toBe(true);
    expect(pagar.price).toBeGreaterThan(buildTicket(groups, 'valor')!.price);
  });

  it('still uses a match whose every leg is a longshot', () => {
    const lopsided = groupsFor(3).map((group) =>
      group.filter((leg) => leg.fairProbability < 0.2),
    );
    const usable = lopsided.filter((g) => g.length > 0);
    if (usable.length === 0) return;
    expect(buildTicket(usable, 'valor')!.legs).toHaveLength(usable.length);
  });
});
