import { OddsError, bookMargin, decimalToImplied } from './odds.js';
import type { DecimalOdds, FairMarket, Probability, Runner, VigMethod } from './types.js';

const SHIN_TOLERANCE = 1e-12;
const SHIN_MAX_ITERATIONS = 200;

/** Proportional (multiplicative) de-vig: p_i = q_i / sum(q). Favourite-longshot biased. */
export const removeVigMultiplicative = (
  implied: ReadonlyArray<Probability>,
): ReadonlyArray<Probability> => {
  const total = implied.reduce((sum, p) => sum + p, 0);
  return implied.map((p) => p / total);
};

/** Additive de-vig: subtracts the margin equally across runners. */
export const removeVigAdditive = (
  implied: ReadonlyArray<Probability>,
): ReadonlyArray<Probability> => {
  const total = implied.reduce((sum, p) => sum + p, 0);
  const perRunner = (total - 1) / implied.length;
  return implied.map((p) => p - perRunner);
};

/**
 * Shin (1993) de-vig. Solves for the insider-trading proportion z that makes
 * the fair probabilities sum to one, then inverts the Shin price function.
 */
export const solveShinZ = (implied: ReadonlyArray<Probability>): number => {
  const total = implied.reduce((sum, p) => sum + p, 0);
  if (total <= 1) return 0;
  let z = 0;
  for (let i = 0; i < SHIN_MAX_ITERATIONS; i += 1) {
    const next =
      implied.reduce(
        (sum, q) => sum + Math.sqrt(z * z + 4 * (1 - z) * ((q * q) / total)),
        0,
      ) - 2;
    const candidate = next / (implied.length - 2 === 0 ? 1 : implied.length - 2);
    const clamped = Math.min(Math.max(candidate, 0), 0.5);
    if (Math.abs(clamped - z) < SHIN_TOLERANCE) return clamped;
    z = clamped;
  }
  return z;
};

export const removeVigShin = (
  implied: ReadonlyArray<Probability>,
): ReadonlyArray<Probability> => {
  const total = implied.reduce((sum, p) => sum + p, 0);
  const z = solveShinZ(implied);
  if (z <= 0) return removeVigMultiplicative(implied);
  const raw = implied.map(
    (q) => (Math.sqrt(z * z + 4 * (1 - z) * ((q * q) / total)) - z) / (2 * (1 - z)),
  );
  const rawTotal = raw.reduce((sum, p) => sum + p, 0);
  return raw.map((p) => p / rawTotal);
};

/** Dispatches to the de-vig model selected by `method`. */
export const removeVig = (
  implied: ReadonlyArray<Probability>,
  method: VigMethod,
): ReadonlyArray<Probability> => {
  switch (method) {
    case 'multiplicative':
      return removeVigMultiplicative(implied);
    case 'additive':
      return removeVigAdditive(implied);
    case 'shin':
      return removeVigShin(implied);
  }
};

export const devig = (runners: ReadonlyArray<Runner>, method: VigMethod = 'shin'): FairMarket => {
  if (runners.length < 2) throw new OddsError('De-vigging requires at least two runners');
  const prices: DecimalOdds[] = runners.map((r) => r.price);
  const implied = prices.map(decimalToImplied);
  const fair = removeVig(implied, method);

  return {
    method,
    margin: bookMargin(prices),
    z: method === 'shin' ? solveShinZ(implied) : 0,
    runners: runners.map((runner, i) => {
      const fairProbability = fair[i] as number;
      return {
        id: runner.id,
        label: runner.label,
        price: runner.price,
        impliedProbability: implied[i] as number,
        fairProbability,
        fairPrice: 1 / fairProbability,
      };
    }),
  };
};
