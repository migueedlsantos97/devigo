import { OddsError, decimalToImplied } from './odds.js';
import { removeVig } from './vig.js';
import type { DecimalOdds, Probability, VigMethod } from './types.js';

/**
 * Cross-book price matrix for one market: each row is one bookmaker's
 * decimal prices, columns aligned to the same runner across rows.
 */
export type PriceMatrix = ReadonlyArray<ReadonlyArray<DecimalOdds>>;

const assertMatrix = (priceSets: PriceMatrix): number => {
  if (priceSets.length === 0) throw new OddsError('Consensus needs at least one book');
  const n = (priceSets[0] as ReadonlyArray<DecimalOdds>).length;
  if (n < 2) throw new OddsError('Consensus needs at least two runners');
  for (const set of priceSets) {
    if (set.length !== n) throw new OddsError('Every book must quote every runner');
  }
  return n;
};

/**
 * Consensus fair probabilities across books: de-vig each book independently,
 * average per runner, renormalise. The consensus line is a stronger estimate
 * of the true probability than any single book's de-vigged line.
 */
export const consensusProbabilities = (
  priceSets: PriceMatrix,
  method: VigMethod = 'shin',
): ReadonlyArray<Probability> => {
  const n = assertMatrix(priceSets);
  const fairSets = priceSets.map((set) => removeVig(set.map(decimalToImplied), method));
  const mean = Array.from({ length: n }, (_, i) =>
    fairSets.reduce((sum, fair) => sum + (fair[i] as number), 0) / fairSets.length,
  );
  const total = mean.reduce((sum, p) => sum + p, 0);
  return mean.map((p) => p / total);
};

export interface BestOffer {
  /** Best (highest) decimal price offered for this runner. */
  readonly price: DecimalOdds;
  /** Row index into the price matrix of the book offering it. */
  readonly book: number;
}

/** Line shopping: the best price per runner across all books. */
export const bestOffers = (priceSets: PriceMatrix): ReadonlyArray<BestOffer> => {
  const n = assertMatrix(priceSets);
  return Array.from({ length: n }, (_, i) => {
    let best: BestOffer = { price: (priceSets[0] as ReadonlyArray<DecimalOdds>)[i] as number, book: 0 };
    for (let b = 1; b < priceSets.length; b += 1) {
      const price = (priceSets[b] as ReadonlyArray<DecimalOdds>)[i] as number;
      if (price > best.price) best = { price, book: b };
    }
    return best;
  });
};
