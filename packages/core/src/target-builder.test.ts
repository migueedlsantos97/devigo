import { describe, expect, it } from 'vitest';
import { OddsError } from './odds.js';
import { buildTicketForTarget, type TargetCandidate } from './target-builder.js';

const c = (id: string, marketKey: string, price: number, fairProbability: number): TargetCandidate => ({
  id, marketKey, price, fairProbability,
});

describe('buildTicketForTarget', () => {
  it('reaches the target using the best-edge fitting candidates', () => {
    const pool = [
      c('a', 'm1', 1.5, 0.75), // edge +0.125
      c('b', 'm2', 1.4, 0.65), // edge -0.09
      c('c', 'm3', 1.3, 0.7),  // edge -0.09
    ];
    const result = buildTicketForTarget(pool, 2.5);
    expect(result.reached).toBe(true);
    expect(result.legIds[0]).toBe('a'); // best edge picked first
    expect(result.combinedPrice).toBeGreaterThanOrEqual(2.5);
  });

  it('breaks a zero-edge tie among fitting candidates by price (higher first)', () => {
    // Both candidates have edge exactly 0; pool has only these two markets.
    const pool = [c('cheap', 'm1', 1.2, 1 / 1.2), c('rich', 'm2', 4, 1 / 4)];
    const result = buildTicketForTarget(pool, 5, 1);
    expect(result.legIds).toEqual(['rich']);
  });

  it('breaks a fully-tied fitting pair (same price and edge) by id', () => {
    const pool = [c('zzz', 'm1', 1.5, 0.7), c('aaa', 'm2', 1.5, 0.7)];
    const result = buildTicketForTarget(pool, 1.6, 1);
    expect(result.legIds).toEqual(['aaa']);
  });

  it('falls back to the cheapest candidate to minimise overshoot when none fit', () => {
    const pool = [c('big', 'm1', 5, 0.3), c('bigger', 'm2', 8, 0.2)];
    const result = buildTicketForTarget(pool, 1.5); // target barely above 1, nothing fits without overshoot
    expect(result.legIds).toEqual(['big']);
    expect(result.reached).toBe(true);
    expect(result.combinedPrice).toBe(5);
  });

  it('breaks an overshoot tie (same price, different edge) by edge', () => {
    const pool = [c('lowEdge', 'm1', 3, 0.2), c('highEdge', 'm2', 3, 0.4)];
    const result = buildTicketForTarget(pool, 1.5, 1);
    expect(result.legIds).toEqual(['highEdge']);
  });

  it('breaks a fully-tied overshoot pair by id', () => {
    const pool = [c('zzz', 'm1', 3, 0.4), c('aaa', 'm2', 3, 0.4)];
    const result = buildTicketForTarget(pool, 1.5, 1);
    expect(result.legIds).toEqual(['aaa']);
  });

  it('stops at maxLegs even if the target is not reached', () => {
    const pool = [c('a', 'm1', 1.1, 0.9), c('b', 'm2', 1.1, 0.9), c('c', 'm3', 1.1, 0.9)];
    const result = buildTicketForTarget(pool, 10, 2);
    expect(result.legIds).toHaveLength(2);
    expect(result.reached).toBe(false);
  });

  it('stops when the candidate pool is exhausted before reaching the target', () => {
    const pool = [c('a', 'm1', 1.2, 0.8)];
    const result = buildTicketForTarget(pool, 100);
    expect(result.legIds).toEqual(['a']);
    expect(result.reached).toBe(false);
  });

  it('picks at most one leg per market even across many candidates', () => {
    const pool = [c('a1', 'm1', 1.5, 0.6), c('a2', 'm1', 3, 0.3), c('b1', 'm2', 1.4, 0.7)];
    const result = buildTicketForTarget(pool, 1.9, 5);
    const marketsUsed = new Set(result.legIds.map((id) => (id.startsWith('a') ? 'm1' : 'm2')));
    expect(marketsUsed.size).toBe(result.legIds.length);
  });

  it('returns an unreached empty result for an empty candidate pool', () => {
    const result = buildTicketForTarget([], 3);
    expect(result).toEqual({ legIds: [], combinedPrice: 1, reached: false });
  });

  it('rejects an invalid target price or maxLegs', () => {
    const pool = [c('a', 'm1', 1.5, 0.7)];
    expect(() => buildTicketForTarget(pool, Number.NaN)).toThrow(OddsError);
    expect(() => buildTicketForTarget(pool, 1)).toThrow(/Target price/);
    expect(() => buildTicketForTarget(pool, 2, 0)).toThrow(/maxLegs/);
  });
});
