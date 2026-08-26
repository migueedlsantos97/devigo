import type { AmericanOdds, DecimalOdds, Probability } from './types.js';

export class OddsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OddsError';
  }
}

const assertDecimal = (price: DecimalOdds): void => {
  if (!Number.isFinite(price) || price <= 1) {
    throw new OddsError(`Decimal odds must be a finite number > 1, received ${price}`);
  }
};

const assertProbability = (p: Probability): void => {
  if (!Number.isFinite(p) || p <= 0 || p > 1) {
    throw new OddsError(`Probability must be in (0, 1], received ${p}`);
  }
};

export const decimalToImplied = (price: DecimalOdds): Probability => {
  assertDecimal(price);
  return 1 / price;
};

export const impliedToDecimal = (p: Probability): DecimalOdds => {
  assertProbability(p);
  return 1 / p;
};

export const americanToDecimal = (odds: AmericanOdds): DecimalOdds => {
  if (!Number.isFinite(odds) || Math.abs(odds) < 100) {
    throw new OddsError(`American odds must satisfy |odds| >= 100, received ${odds}`);
  }
  return odds > 0 ? odds / 100 + 1 : 100 / Math.abs(odds) + 1;
};

export const decimalToAmerican = (price: DecimalOdds): AmericanOdds => {
  assertDecimal(price);
  return price >= 2 ? (price - 1) * 100 : -100 / (price - 1);
};

/** Parses "7/2" style fractional odds into decimal. */
export const fractionalToDecimal = (fraction: string): DecimalOdds => {
  const match = /^\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*$/.exec(fraction);
  if (!match) throw new OddsError(`Unparseable fractional odds: "${fraction}"`);
  const numerator = Number(match[1]);
  const denominator = Number(match[2]);
  if (denominator === 0) throw new OddsError('Fractional odds denominator cannot be zero');
  return numerator / denominator + 1;
};

/** Bookmaker overround across a complete market: sum(1/price) - 1. */
export const bookMargin = (prices: ReadonlyArray<DecimalOdds>): number => {
  if (prices.length === 0) throw new OddsError('Market must contain at least one runner');
  return prices.reduce((sum, price) => sum + decimalToImplied(price), 0) - 1;
};

export const roundTo = (value: number, dp = 4): number => {
  const factor = 10 ** dp;
  return Math.round(value * factor) / factor;
};
