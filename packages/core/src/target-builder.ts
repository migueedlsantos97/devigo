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

/**
 * Risk profile driving which selections `buildTicketForTarget` reaches for:
 * - `conservative` — favours the safest (highest-probability) legs, even if
 *   more of them are needed to reach the target.
 * - `balanced` — favours the best edge (expected value); the default.
 * - `fantasy` — ignores value entirely and chases the highest odds
 *   available, so a handful of longshots pay a huge band and hit rarely.
 */
export type BuildMode = 'conservative' | 'balanced' | 'fantasy';

const edgeOf = (c: TargetCandidate): number => c.fairProbability * c.price - 1;
const safetyOf = (c: TargetCandidate): number => c.fairProbability;

const rankFor = (mode: BuildMode): ((c: TargetCandidate) => number) =>
  mode === 'conservative' ? safetyOf : edgeOf;

const byMarketDedupe = (pool: ReadonlyArray<TargetCandidate>, pickedMarketKey: string) =>
  pool.filter((c) => c.marketKey !== pickedMarketKey);

/** Chases the single highest-odds candidate each round — the `fantasy` engine. */
const buildFantasy = (
  candidates: ReadonlyArray<TargetCandidate>,
  targetPrice: DecimalOdds,
  maxLegs: number,
): TargetBuildResult => {
  let pool = [...candidates];
  const chosen: TargetCandidate[] = [];
  let combined = 1;

  while (chosen.length < maxLegs && combined < targetPrice && pool.length > 0) {
    const sorted = [...pool].sort((a, b) => {
      const priceDiff = b.price - a.price;
      return priceDiff !== 0 ? priceDiff : a.id.localeCompare(b.id);
    });
    const pick = sorted[0] as TargetCandidate;
    chosen.push(pick);
    combined *= pick.price;
    pool = byMarketDedupe(pool, pick.marketKey);
  }

  return {
    legIds: chosen.map((c) => c.id),
    combinedPrice: combined,
    reached: combined >= targetPrice - 1e-9,
  };
};

/**
 * Greedily assembles a parlay whose combined price approaches `targetPrice`.
 * In `conservative`/`balanced` mode, at each step it picks the best-ranked
 * candidate (by mode) among those that still fit under the remaining target
 * (price <= what's still needed); once none fit without overshooting, it
 * falls back to the cheapest remaining candidate to minimise the overshoot.
 * `fantasy` mode bypasses all of that and always chases the single highest
 * price available (see `buildFantasy`). At most one leg per `marketKey`
 * (mutually exclusive outcomes of the same market) in every mode.
 */
export const buildTicketForTarget = (
  candidates: ReadonlyArray<TargetCandidate>,
  targetPrice: DecimalOdds,
  maxLegs = 15,
  mode: BuildMode = 'balanced',
): TargetBuildResult => {
  if (!Number.isFinite(targetPrice) || targetPrice <= 1) {
    throw new OddsError(`Target price must be a finite number > 1, received ${targetPrice}`);
  }
  if (maxLegs < 1) throw new OddsError('maxLegs must be at least 1');

  if (mode === 'fantasy') return buildFantasy(candidates, targetPrice, maxLegs);

  const rank = rankFor(mode);
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
        const rankDiff = rank(b) - rank(a);
        if (rankDiff !== 0) return rankDiff;
        const priceDiff = b.price - a.price;
        if (priceDiff !== 0) return priceDiff;
        return a.id.localeCompare(b.id);
      }
      const priceDiff = a.price - b.price;
      if (priceDiff !== 0) return priceDiff;
      const rankDiff = rank(b) - rank(a);
      if (rankDiff !== 0) return rankDiff;
      return a.id.localeCompare(b.id);
    });

    const pick = sorted[0] as TargetCandidate;
    chosen.push(pick);
    combined *= pick.price;
    pool = byMarketDedupe(pool, pick.marketKey);
  }

  return {
    legIds: chosen.map((c) => c.id),
    combinedPrice: combined,
    reached: combined >= targetPrice - 1e-9,
  };
};
