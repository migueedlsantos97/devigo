import { OddsError } from './odds.js';
import type { CorrelationMatrix, DecimalOdds, Leg, Probability } from './types.js';

export const combinePrices = (prices: ReadonlyArray<DecimalOdds>): DecimalOdds => {
  if (prices.length === 0) throw new OddsError('A ticket needs at least one leg');
  return prices.reduce((product, price) => product * price, 1);
};

export const independentProbability = (
  probabilities: ReadonlyArray<Probability>,
): Probability => probabilities.reduce((product, p) => product * p, 1);

export const identityCorrelation = (n: number): CorrelationMatrix =>
  Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));

export const assertValidCorrelation = (matrix: CorrelationMatrix, n: number): void => {
  if (matrix.length !== n) throw new OddsError('Correlation matrix must be square in leg count');
  for (let i = 0; i < n; i += 1) {
    const row = matrix[i] as ReadonlyArray<number>;
    if (row.length !== n) throw new OddsError('Correlation matrix must be square');
    if ((row[i] as number) !== 1) throw new OddsError('Correlation diagonal must be 1');
    for (let j = 0; j < n; j += 1) {
      const rho = row[j] as number;
      if (rho < -1 || rho > 1) throw new OddsError('Correlation coefficients must be in [-1, 1]');
      if (rho !== ((matrix[j] as ReadonlyArray<number>)[i] as number)) {
        throw new OddsError('Correlation matrix must be symmetric');
      }
    }
  }
};

/**
 * Joint probability of all legs landing, adjusted pairwise via a Gaussian-style
 * covariance lift: P(A∩B) = P(A)P(B) + rho * sqrt(P(A)(1-P(A))P(B)(1-P(B))).
 * Pair lifts are applied multiplicatively as ratios to the independent product,
 * which keeps the estimator stable for n > 2 without a full copula solve.
 */
export const jointProbability = (
  probabilities: ReadonlyArray<Probability>,
  correlation: CorrelationMatrix = identityCorrelation(probabilities.length),
): Probability => {
  const n = probabilities.length;
  if (n === 0) throw new OddsError('A ticket needs at least one leg');
  assertValidCorrelation(correlation, n);
  const base = independentProbability(probabilities);
  if (n === 1) return base;

  let ratio = 1;
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const rho = (correlation[i] as ReadonlyArray<number>)[j] as number;
      if (rho === 0) continue;
      const pi = probabilities[i] as number;
      const pj = probabilities[j] as number;
      const cov = rho * Math.sqrt(pi * (1 - pi) * pj * (1 - pj));
      ratio *= (pi * pj + cov) / (pi * pj);
    }
  }
  return Math.min(Math.max(base * ratio, 0), 1);
};

/** Probability the ticket is still live after each leg settles, in listed order. */
export const survivalCurve = (legs: ReadonlyArray<Leg>): ReadonlyArray<number> => {
  const curve: number[] = [];
  let running = 1;
  for (const leg of legs) {
    running *= leg.fairProbability;
    curve.push(running);
  }
  return curve;
};
