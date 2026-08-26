import { describe, expect, it } from 'vitest';
import { decimalToImplied, roundTo, OddsError } from './odds.js';
import { devig, removeVigAdditive, removeVigMultiplicative, removeVigShin, solveShinZ } from './vig.js';
import type { Runner } from './types.js';

const twoWay: Runner[] = [
  { id: 'h', label: 'Home', price: 1.5 },
  { id: 'a', label: 'Away', price: 2.5 },
];
const threeWay: Runner[] = [
  { id: 'h', label: 'Home', price: 2.1 },
  { id: 'd', label: 'Draw', price: 3.4 },
  { id: 'a', label: 'Away', price: 3.8 },
];

const sum = (xs: ReadonlyArray<number>): number => xs.reduce((a, b) => a + b, 0);

describe('vig removal', () => {
  it('multiplicative normalises to 1', () => {
    const fair = removeVigMultiplicative(twoWay.map((r) => decimalToImplied(r.price)));
    expect(roundTo(sum(fair), 9)).toBe(1);
  });

  it('additive normalises to 1 and shifts equally', () => {
    const implied = threeWay.map((r) => decimalToImplied(r.price));
    const fair = removeVigAdditive(implied);
    expect(roundTo(sum(fair), 9)).toBe(1);
    const shifts = fair.map((p, i) => roundTo((implied[i] as number) - p, 9));
    expect(new Set(shifts).size).toBe(1);
  });

  it('shin normalises to 1 and compresses the favourite less than multiplicative', () => {
    const implied = threeWay.map((r) => decimalToImplied(r.price));
    const shin = removeVigShin(implied);
    expect(roundTo(sum(shin), 9)).toBe(1);
    expect(shin[0] as number).toBeGreaterThan(0);
  });

  it('shin z is zero on a fair book and positive on a vigged one', () => {
    expect(solveShinZ([0.5, 0.5])).toBe(0);
    expect(solveShinZ(threeWay.map((r) => decimalToImplied(r.price)))).toBeGreaterThanOrEqual(0);
  });

  it('shin z converges inside the loop on a heavy-vig multi-runner market', () => {
    const implied = [1 / 1.8, 1 / 3.2, 1 / 4.5, 1 / 9];
    const z = solveShinZ(implied);
    expect(z).toBeGreaterThan(0);
    expect(z).toBeLessThanOrEqual(0.5);
    const fair = removeVigShin(implied);
    expect(roundTo(sum(fair), 9)).toBe(1);
  });

  it('falls back to multiplicative when z resolves to zero', () => {
    const fair = removeVigShin([0.5, 0.5]);
    expect(fair).toEqual([0.5, 0.5]);
  });

  it('devig returns fair prices and margin for every method', () => {
    for (const method of ['multiplicative', 'additive', 'shin'] as const) {
      const market = devig(threeWay, method);
      expect(market.method).toBe(method);
      expect(roundTo(sum(market.runners.map((r) => r.fairProbability)), 9)).toBe(1);
      expect(market.margin).toBeGreaterThan(0);
      expect(market.runners[0]?.fairPrice).toBeGreaterThan(market.runners[0]?.price as number);
      expect(market.z).toBeGreaterThanOrEqual(0);
    }
  });

  it('defaults to shin and rejects degenerate markets', () => {
    expect(devig(twoWay).method).toBe('shin');
    expect(() => devig([twoWay[0] as Runner])).toThrow(OddsError);
  });
});
