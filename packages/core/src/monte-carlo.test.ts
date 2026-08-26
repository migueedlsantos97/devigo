import { describe, expect, it } from 'vitest';
import { OddsError } from './odds.js';
import { createRng, simulateTicket } from './monte-carlo.js';
import type { Leg } from './types.js';

const legs: Leg[] = [
  { id: '1', label: 'A', price: 1.9, fairProbability: 0.56 },
  { id: '2', label: 'B', price: 2.05, fairProbability: 0.52 },
  { id: '3', label: 'C', price: 1.7, fairProbability: 0.61 },
];

describe('monte carlo', () => {
  it('produces a deterministic stream for a given seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(createRng(0)()).toBeGreaterThanOrEqual(0);
  });

  it('hit rate approximates the analytic joint probability', () => {
    const result = simulateTicket(legs, { iterations: 10_000, seed: 7 });
    expect(result.iterations).toBe(10_000);
    expect(result.hitRate).toBeGreaterThan(0.13);
    expect(result.hitRate).toBeLessThan(0.23);
    expect(result.decay).toHaveLength(3);
    expect(result.decay[0] as number).toBeGreaterThan(result.decay[2] as number);
    expect(result.stdDev).toBeGreaterThan(0);
    expect(result.p95).toBeGreaterThan(result.p05);
    expect(result.maxDrawdown).toBeGreaterThan(0);
    expect(result.medianBankroll).toBeGreaterThan(0);
    expect(result.meanReturn).toBeLessThan(5);
  });

  it('correlated legs hit more often than independent ones', () => {
    const rho = [[1, 0.6, 0.6], [0.6, 1, 0.6], [0.6, 0.6, 1]];
    const correlated = simulateTicket(legs, { iterations: 5000, seed: 11, correlation: rho });
    const independent = simulateTicket(legs, { iterations: 5000, seed: 11 });
    expect(correlated.hitRate).toBeGreaterThan(independent.hitRate);
  });

  it('flags risk of ruin on an oversized stake', () => {
    const result = simulateTicket(legs, { iterations: 500, seed: 3, stake: 40, bankroll: 100 });
    expect(result.riskOfRuin).toBe(1);
  });

  it('handles a single leg and rejects empty tickets', () => {
    const single = simulateTicket([legs[0] as Leg], { iterations: 200, seed: 5 });
    expect(single.decay).toHaveLength(1);
    expect(() => simulateTicket([])).toThrow(OddsError);
  });

  it('rejects a correlation matrix that does not match the leg count', () => {
    expect(() => simulateTicket(legs, { iterations: 100, correlation: [[1]] })).toThrow(
      /square in leg count/,
    );
  });

  it('applies default options: 10k iterations, seeded rng, unit stake', () => {
    const a = simulateTicket([legs[0] as Leg]);
    const b = simulateTicket([legs[0] as Leg]);
    expect(a.iterations).toBe(10_000);
    expect(a.hitRate).toBe(b.hitRate);
    expect(a.riskOfRuin).toBe(0);
  });
});
