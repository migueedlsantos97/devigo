import { describe, expect, it } from 'vitest';
import { OddsError, roundTo } from './odds.js';
import { analyzeTicket, edge, expectedValue, kellyFraction, scanValueBets } from './value.js';
import type { Leg } from './types.js';

const legs: Leg[] = [
  { id: '1', label: 'A', price: 1.9, fairProbability: 0.56 },
  { id: '2', label: 'B', price: 2.05, fairProbability: 0.52 },
];

describe('value and staking', () => {
  it('computes EV per unit staked', () => {
    expect(roundTo(expectedValue(0.5, 2.2))).toBe(0.1);
    expect(roundTo(expectedValue(0.5, 1.8))).toBe(-0.1);
  });

  it('computes edge', () => {
    expect(roundTo(edge(0.56, 1.9))).toBe(0.064);
  });

  it('computes fractional Kelly and floors negatives at zero', () => {
    expect(roundTo(kellyFraction(0.56, 1.9))).toBe(0.0711);
    expect(kellyFraction(0.4, 1.9)).toBe(0);
    expect(roundTo(kellyFraction(0.56, 1.9, 0.25))).toBe(0.0178);
    expect(() => kellyFraction(0.5, 2, 0)).toThrow(OddsError);
    expect(() => kellyFraction(0.5, 2, 1.5)).toThrow(OddsError);
  });

  it('analyzes a ticket end to end', () => {
    const a = analyzeTicket(legs);
    expect(roundTo(a.combinedPrice)).toBe(3.895);
    expect(a.correlationLift).toBeCloseTo(0, 12);
    expect(a.jointProbability).toBeCloseTo(0.2912, 6);
    expect(a.expectedValue).toBeGreaterThan(0);
    expect(a.kellyFraction).toBeGreaterThan(0);
    expect(() => analyzeTicket([])).toThrow(OddsError);
  });

  it('reflects correlation in the ticket analysis', () => {
    const a = analyzeTicket(legs, [[1, 0.3], [0.3, 1]]);
    expect(a.correlationLift).toBeGreaterThan(0);
  });

  it('scans and ranks value bets above a threshold', () => {
    const found = scanValueBets([
      { price: 1.9, fairProbability: 0.56 },
      { price: 2.0, fairProbability: 0.45 },
      { price: 3.2, fairProbability: 0.36 },
    ]);
    expect(found).toHaveLength(2);
    expect(found[0]?.edge).toBeGreaterThan(found[1]?.edge as number);
    expect(scanValueBets([{ price: 2, fairProbability: 0.5 }])).toHaveLength(0);
  });
});
