import { describe, expect, it } from 'vitest';
import { OddsError, roundTo } from './odds.js';
import {
  assertValidCorrelation, combinePrices, identityCorrelation, independentProbability,
  jointProbability, survivalCurve,
} from './parlay.js';
import type { Leg } from './types.js';

const legs: Leg[] = [
  { id: '1', label: 'A', price: 1.8, fairProbability: 0.58 },
  { id: '2', label: 'B', price: 2.1, fairProbability: 0.5 },
  { id: '3', label: 'C', price: 1.65, fairProbability: 0.63 },
];

describe('parlay maths', () => {
  it('multiplies leg prices', () => {
    expect(roundTo(combinePrices([2, 3]), 6)).toBe(6);
    expect(() => combinePrices([])).toThrow(OddsError);
  });

  it('computes independent joint probability', () => {
    expect(roundTo(independentProbability([0.5, 0.5]), 6)).toBe(0.25);
  });

  it('identity correlation leaves the product unchanged', () => {
    const p = legs.map((l) => l.fairProbability);
    expect(jointProbability(p)).toBeCloseTo(independentProbability(p), 12);
  });

  it('positive correlation lifts and negative correlation cuts the joint', () => {
    const p = [0.5, 0.5];
    const pos = jointProbability(p, [[1, 0.4], [0.4, 1]]);
    const neg = jointProbability(p, [[1, -0.4], [-0.4, 1]]);
    expect(pos).toBeGreaterThan(0.25);
    expect(neg).toBeLessThan(0.25);
  });

  it('clamps to [0, 1] and short-circuits single legs', () => {
    expect(jointProbability([0.9])).toBe(0.9);
    expect(jointProbability([0.95, 0.95], [[1, 1], [1, 1]])).toBeLessThanOrEqual(1);
    expect(() => jointProbability([])).toThrow(OddsError);
  });

  it('validates the correlation matrix', () => {
    expect(() => assertValidCorrelation([[1]], 2)).toThrow(/square in leg count/);
    expect(() => assertValidCorrelation([[1, 0], [0]], 2)).toThrow(/square/);
    expect(() => assertValidCorrelation([[0.5, 0], [0, 1]], 2)).toThrow(/diagonal/);
    expect(() => assertValidCorrelation([[1, 2], [2, 1]], 2)).toThrow(/\[-1, 1\]/);
    expect(() => assertValidCorrelation([[1, 0.2], [0.3, 1]], 2)).toThrow(/symmetric/);
    expect(identityCorrelation(2)).toEqual([[1, 0], [0, 1]]);
  });

  it('builds a decaying survival curve', () => {
    const curve = survivalCurve(legs);
    expect(curve).toHaveLength(3);
    expect(curve[0] as number).toBeGreaterThan(curve[2] as number);
  });
});
