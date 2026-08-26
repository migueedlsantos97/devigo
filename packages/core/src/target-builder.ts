import { OddsError } from './odds.js';
import type { DecimalOdds, Probability } from './types.js';

export interface TargetCandidate {
  readonly id: string;
  /** Selections sharing a market key are mutually exclusive — at most one is picked. */
  readonly marketKey: string;
  readonly price: DecimalOdds;
  readonly fairProbability: Probability;
}

export interface TargetBuildResult {
  readonly legIds: ReadonlyArray<string>;
  readonly combinedPrice: DecimalOdds;
  /** Whether the built ticket's combined price meets or exceeds the target. */
  readonly reached: boolean;
}

const edgeOf = (c: TargetCandidate): number => c.fairProbability * c.price - 1;

/**
 * Greedily assembles a parlay whose combined price approaches `targetPrice`,
 * favouring +EV selections. At each step, among candidates that still fit
 * under the remaining target (price <= what's still needed), it picks the
 * best edge; once none fit without overshooting, it picks the cheapest
 * remaining candidate to minimise the overshoot. At most one leg per
 * `marketKey` (mutually exclusive outcomes of the same market).
 */
export const buildTicketForTarget = (
  candidates: ReadonlyArray<TargetCandidate>,
  targetPrice: DecimalOdds,
  maxLegs = 15,
): TargetBuildResult => {
  if (!Number.isFinite(targetPrice) || targetPrice <= 1) {
    throw new OddsError(`Target price must be a finite number > 1, received ${targetPrice}`);
  }
  if (maxLegs < 1) throw new OddsError('maxLegs must be at least 1');

  let pool = [...candidates];
  const chosen: TargetCandidate[] = [];
  let combined = 1;

  while (chosen.length < maxLegs && combined < targetPrice && pool.length > 0) {
    const needed = targetPrice / combined;
    const fitting = pool.filter((c) => c.price <= needed);
    const preferFit = fitting.length > 0;
    const source = preferFit ? fitting : pool;

    const sorted = [...source].sort((a, b) => {
      if (preferFit) {
        const edgeDiff = edgeOf(b) - edgeOf(a);
        if (edgeDiff !== 0) return edgeDiff;
        const priceDiff = b.price - a.price;
        if (priceDiff !== 0) return priceDiff;
        return a.id.localeCompare(b.id);
      }
      const priceDiff = a.price - b.price;
      if (priceDiff !== 0) return priceDiff;
      const edgeDiff = edgeOf(b) - edgeOf(a);
      if (edgeDiff !== 0) return edgeDiff;
      return a.id.localeCompare(b.id);
    });

    const pick = sorted[0] as TargetCandidate;
    chosen.push(pick);
    combined *= pick.price;
    pool = pool.filter((c) => c.marketKey !== pick.marketKey);
  }

  return {
    legIds: chosen.map((c) => c.id),
    combinedPrice: combined,
    reached: combined >= targetPrice - 1e-9,
  };
};
