import { describe, expect, it } from 'vitest';
import { OddsError, roundTo } from './odds.js';
import { devig } from './vig.js';
import { bestOffers, consensusProbabilities } from './consensus.js';

const bookA = [2.1, 3.4, 3.8];
const bookB = [2.05, 3.5, 3.9];

const sum = (xs: ReadonlyArray<number>): number => xs.reduce((a, b) => a + b, 0);

describe('cross-book consensus', () => {
  it('single-book consensus equals that book de-vigged', () => {
    const consensus = consensusProbabilities([bookA], 'shin');
    const market = devig(
      bookA.map((price, i) => ({ id: String(i), label: String(i), price })),
      'shin',
    );
    consensus.forEach((p, i) => expect(p).toBeCloseTo(market.runners[i]?.fairProbability as number, 12));
  });

  it('identical books collapse to the single-book line and sum to one', () => {
    for (const method of ['multiplicative', 'additive', 'shin'] as const) {
      const single = consensusProbabilities([bookA], method);
      const tripled = consensusProbabilities([bookA, bookA, bookA], method);
      tripled.forEach((p, i) => expect(p).toBeCloseTo(single[i] as number, 12));
      expect(roundTo(sum(tripled), 9)).toBe(1);
    }
  });

  it('averages diverging books into a line between them', () => {
    const a = consensusProbabilities([bookA], 'multiplicative');
    const b = consensusProbabilities([bookB], 'multiplicative');
    const mixed = consensusProbabilities([bookA, bookB], 'multiplicative');
    mixed.forEach((p, i) => {
      const lo = Math.min(a[i] as number, b[i] as number);
      const hi = Math.max(a[i] as number, b[i] as number);
      expect(p).toBeGreaterThanOrEqual(lo - 1e-12);
      expect(p).toBeLessThanOrEqual(hi + 1e-12);
    });
    expect(roundTo(sum(mixed), 9)).toBe(1);
  });

  it('finds the best price and its book per runner', () => {
    const offers = bestOffers([bookA, bookB]);
    expect(offers).toEqual([
      { price: 2.1, book: 0 },
      { price: 3.5, book: 1 },
      { price: 3.9, book: 1 },
    ]);
  });

  it('surfaces positive edge when an outlier book beats the consensus', () => {
    const outlier = [2.6, 3.3, 3.6];
    const fair = consensusProbabilities([bookA, bookB, outlier]);
    const offers = bestOffers([bookA, bookB, outlier]);
    const edges = offers.map((o, i) => (fair[i] as number) * o.price - 1);
    expect(offers[0]).toEqual({ price: 2.6, book: 2 });
    expect(Math.max(...edges)).toBeGreaterThan(0);
  });

  it('rejects malformed price matrices in both functions', () => {
    expect(() => consensusProbabilities([])).toThrow(OddsError);
    expect(() => consensusProbabilities([[2.0]])).toThrow(/two runners/);
    expect(() => consensusProbabilities([bookA, [2.1, 3.4]])).toThrow(/every runner/);
    expect(() => bestOffers([])).toThrow(OddsError);
  });
});
