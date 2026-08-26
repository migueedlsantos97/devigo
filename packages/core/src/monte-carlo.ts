import type { CorrelationMatrix, Leg, SimulationResult } from './types.js';
import { assertValidCorrelation, identityCorrelation } from './parlay.js';
import { OddsError } from './odds.js';
import { combinePrices } from './parlay.js';

/** Deterministic xorshift128 PRNG so simulations are reproducible and testable. */
export const createRng = (seed = 0x2f6e2b1): (() => number) => {
  let x = seed || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    return x / 0x100000000;
  };
};

export interface SimulationOptions {
  readonly iterations?: number;
  readonly stake?: number;
  readonly bankroll?: number;
  readonly correlation?: CorrelationMatrix;
  readonly seed?: number;
  readonly ruinThreshold?: number;
}

/**
 * Monte Carlo settlement of a ticket. Legs are drawn as correlated Bernoullis via a
 * shared latent factor whose weight is the mean pairwise correlation of each leg.
 */
export const simulateTicket = (
  legs: ReadonlyArray<Leg>,
  options: SimulationOptions = {},
): SimulationResult => {
  if (legs.length === 0) throw new OddsError('A ticket needs at least one leg');
  const iterations = options.iterations ?? 10_000;
  const stake = options.stake ?? 1;
  const bankroll = options.bankroll ?? 100;
  const ruinThreshold = options.ruinThreshold ?? 0;
  const correlation = options.correlation ?? identityCorrelation(legs.length);
  assertValidCorrelation(correlation, legs.length);
  const rng = createRng(options.seed ?? 0x2f6e2b1);
  const price = combinePrices(legs.map((leg) => leg.price));

  const weights = legs.map((_, i) => {
    const row = correlation[i] as ReadonlyArray<number>;
    if (legs.length === 1) return 0;
    const mean =
      row.reduce((sum, rho, j) => (i === j ? sum : sum + rho), 0) / (legs.length - 1);
    return Math.min(Math.max(mean, 0), 1);
  });

  const returns = new Float64Array(iterations);
  const stillLive = new Array<number>(legs.length).fill(0);
  let wins = 0;
  let equity = bankroll;
  let peak = bankroll;
  let maxDrawdown = 0;
  let ruined = false;

  for (let n = 0; n < iterations; n += 1) {
    const latent = rng();
    let alive = true;
    for (let i = 0; i < legs.length; i += 1) {
      const leg = legs[i] as Leg;
      const w = weights[i] as number;
      const draw = w * latent + (1 - w) * rng();
      if (draw > leg.fairProbability) alive = false;
      if (alive) stillLive[i] = (stillLive[i] as number) + 1;
    }
    const profit = alive ? stake * (price - 1) : -stake;
    if (alive) wins += 1;
    returns[n] = profit;
    equity += profit;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, peak - equity);
    if (equity <= ruinThreshold) ruined = true;
  }

  const sorted = Array.from(returns).sort((a, b) => a - b);
  const mean = sorted.reduce((sum, r) => sum + r, 0) / iterations;
  const variance = sorted.reduce((sum, r) => sum + (r - mean) ** 2, 0) / iterations;
  const at = (q: number): number => sorted[Math.min(iterations - 1, Math.floor(q * iterations))] as number;

  return {
    iterations,
    hitRate: wins / iterations,
    meanReturn: mean,
    medianBankroll: bankroll + at(0.5) * 1,
    stdDev: Math.sqrt(variance),
    p05: at(0.05),
    p95: at(0.95),
    maxDrawdown,
    riskOfRuin: ruined ? 1 : 0,
    decay: stillLive.map((count) => count / iterations),
  };
};
