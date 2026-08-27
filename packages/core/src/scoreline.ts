import { OddsError } from './odds.js';
import type { DecimalOdds, Probability } from './types.js';

/**
 * A scoreline model reconstructed from a bookmaker's own prices.
 *
 * The market prices single outcomes sharply and combinations badly, because a
 * combination is priced by multiplying its legs — which assumes they are
 * independent. Two legs of the same match almost never are. Rather than guess a
 * correlation coefficient, this module recovers the full scoreline distribution
 * that reproduces the quoted 1X2 and totals, and then reads any joint
 * probability straight off it. No correlation parameter is chosen by hand; the
 * dependence falls out of the distribution.
 *
 * The distribution is a bivariate Poisson (Karlis & Ntzoufras 2003): home and
 * away goals are Poisson with a shared component λ₃ that both teams draw from.
 * λ₃ is what makes the two scores dependent, and it is also the term that lifts
 * draws and total goals — which is why it, rather than a Dixon-Coles low-score
 * correction, is the third free parameter here: it has real leverage on the
 * totals line, and the correction does not.
 */
export interface MatchResultProbabilities {
  readonly home: Probability;
  readonly draw: Probability;
  readonly away: Probability;
}

/** A totals market to pin the goal expectation to. Half-goal lines only. */
export interface TotalsConstraint {
  readonly line: number;
  readonly over: Probability;
}

export interface ScorelineOptions {
  /** Goals per side the grid runs to; the tail beyond it is redistributed. */
  readonly maxGoals?: number;
  readonly maxPasses?: number;
  readonly tolerance?: number;
}

export interface ScorelineModel {
  /** Expected home goals, λ₁ + λ₃. */
  readonly homeGoals: number;
  /** Expected away goals, λ₂ + λ₃. */
  readonly awayGoals: number;
  /** The shared component λ₃ — the whole of the dependence between the scores. */
  readonly sharedGoals: number;
  readonly maxGoals: number;
  /** grid[homeGoals][awayGoals], summing to 1. */
  readonly grid: ReadonlyArray<ReadonlyArray<Probability>>;
  /** Largest absolute miss against the prices the model was fitted to. */
  readonly residual: number;
  readonly converged: boolean;
  readonly usedTotals: boolean;
}

export type ScorelineSelection =
  | { readonly kind: 'result'; readonly side: 'home' | 'draw' | 'away' }
  | { readonly kind: 'doubleChance'; readonly excludes: 'home' | 'draw' | 'away' }
  | { readonly kind: 'totals'; readonly line: number; readonly side: 'over' | 'under' }
  | { readonly kind: 'bothScore'; readonly scores: boolean }
  | { readonly kind: 'exactScore'; readonly home: number; readonly away: number }
  | { readonly kind: 'handicap'; readonly side: 'home' | 'away'; readonly line: number };

/** Scoring rates are searched inside this bracket; 0 is excluded to keep λ₃/(λ₁λ₂) finite. */
const RATE_FLOOR = 1e-4;
const RATE_CEILING = 12;
const SHARED_CEILING = 6;
const BISECTION_STEPS = 50;
const DEFAULT_MAX_GOALS = 10;
const DEFAULT_MAX_PASSES = 40;
/**
 * A residual is a probability, and no price can express a difference this
 * small — 1e-7 on a 50% chance moves a decimal price by about a billionth.
 * Demanding more was flagging lopsided but perfectly good fits as failures.
 */
const DEFAULT_TOLERANCE = 1e-7;
/** Below four goals a side the truncated tail is thick enough to distort the fit. */
const MIN_MAX_GOALS = 4;

const isHalfLine = (line: number): boolean =>
  Number.isFinite(line) && Number.isInteger(line * 2) && !Number.isInteger(line);

const assertProbability = (p: Probability, what: string): void => {
  if (!Number.isFinite(p) || p <= 0 || p >= 1) {
    throw new OddsError(`${what} must sit strictly between 0 and 1`);
  }
};

const assertMarket = (probabilities: MatchResultProbabilities): void => {
  assertProbability(probabilities.home, 'Home probability');
  assertProbability(probabilities.draw, 'Draw probability');
  assertProbability(probabilities.away, 'Away probability');
  const total = probabilities.home + probabilities.draw + probabilities.away;
  if (Math.abs(total - 1) > 1e-6) {
    throw new OddsError('Result probabilities must be de-vigged to sum to 1');
  }
};

const factorials = (upTo: number): ReadonlyArray<number> => {
  const table = [1];
  for (let k = 1; k <= upTo; k += 1) table.push((table[k - 1] as number) * k);
  return table;
};

/**
 * P(x, y) for the bivariate Poisson, normalised over the truncated grid.
 * The inner sum is the shared-goals convolution; with λ₃ = 0 only its k = 0
 * term survives and the two scores collapse to independent Poissons.
 */
const buildGrid = (
  l1: number,
  l2: number,
  l3: number,
  maxGoals: number,
): ReadonlyArray<ReadonlyArray<number>> => {
  const fact = factorials(maxGoals);
  const base = Math.exp(-(l1 + l2 + l3));
  const ratio = l3 / (l1 * l2);
  const raw: number[][] = [];
  let total = 0;

  for (let x = 0; x <= maxGoals; x += 1) {
    const row: number[] = [];
    for (let y = 0; y <= maxGoals; y += 1) {
      let shared = 0;
      const limit = Math.min(x, y);
      for (let k = 0; k <= limit; k += 1) {
        const chooseX = (fact[x] as number) / ((fact[k] as number) * (fact[x - k] as number));
        const chooseY = (fact[y] as number) / ((fact[k] as number) * (fact[y - k] as number));
        shared += chooseX * chooseY * (fact[k] as number) * Math.pow(ratio, k);
      }
      const p =
        base * (Math.pow(l1, x) / (fact[x] as number)) * (Math.pow(l2, y) / (fact[y] as number)) * shared;
      row.push(p);
      total += p;
    }
    raw.push(row);
  }

  return raw.map((row) => row.map((p) => p / total));
};

const sumWhere = (
  grid: ReadonlyArray<ReadonlyArray<number>>,
  keep: (x: number, y: number) => boolean,
): number => {
  let total = 0;
  for (let x = 0; x < grid.length; x += 1) {
    const row = grid[x] as ReadonlyArray<number>;
    for (let y = 0; y < row.length; y += 1) {
      if (keep(x, y)) total += row[y] as number;
    }
  }
  return total;
};

const homeWins = (grid: ReadonlyArray<ReadonlyArray<number>>): number =>
  sumWhere(grid, (x, y) => x > y);
const awayWins = (grid: ReadonlyArray<ReadonlyArray<number>>): number =>
  sumWhere(grid, (x, y) => y > x);
const goesOver = (grid: ReadonlyArray<ReadonlyArray<number>>, line: number): number =>
  sumWhere(grid, (x, y) => x + y > line);

/**
 * Monotone bisection with no early exits: an unreachable target converges to
 * the nearest end of the bracket, and the fit's residual reports the miss
 * rather than the search pretending to have hit it.
 */
const bisect = (
  evaluate: (value: number) => number,
  low: number,
  high: number,
  target: number,
): number => {
  let a = low;
  let b = high;
  for (let step = 0; step < BISECTION_STEPS; step += 1) {
    const mid = (a + b) / 2;
    if (evaluate(mid) < target) a = mid;
    else b = mid;
  }
  return (a + b) / 2;
};

/**
 * Coordinate descent: each target moves monotonically with exactly one
 * parameter — home wins with λ₁, away wins with λ₂, total goals with λ₃ — so
 * solving them in rotation converges without a Jacobian or a line search.
 */
export const fitScoreline = (
  probabilities: MatchResultProbabilities,
  totals?: TotalsConstraint,
  options: ScorelineOptions = {},
): ScorelineModel => {
  assertMarket(probabilities);

  const maxGoals = options.maxGoals ?? DEFAULT_MAX_GOALS;
  if (!Number.isInteger(maxGoals) || maxGoals < MIN_MAX_GOALS) {
    throw new OddsError(`Goal ceiling must be a whole number of at least ${MIN_MAX_GOALS}`);
  }
  const maxPasses = options.maxPasses ?? DEFAULT_MAX_PASSES;
  const tolerance = options.tolerance ?? DEFAULT_TOLERANCE;

  if (totals !== undefined) {
    if (!isHalfLine(totals.line)) {
      throw new OddsError('Totals line must fall on a half goal so the bet cannot push');
    }
    assertProbability(totals.over, 'Over probability');
  }

  let l1 = 1.2;
  let l2 = 1.1;
  let l3 = totals === undefined ? 0 : 0.1;
  let residual = Number.POSITIVE_INFINITY;
  let converged = false;

  for (let pass = 0; pass < maxPasses; pass += 1) {
    l1 = bisect(
      (value) => homeWins(buildGrid(value, l2, l3, maxGoals)),
      RATE_FLOOR,
      RATE_CEILING,
      probabilities.home,
    );
    l2 = bisect(
      (value) => awayWins(buildGrid(l1, value, l3, maxGoals)),
      RATE_FLOOR,
      RATE_CEILING,
      probabilities.away,
    );
    if (totals !== undefined) {
      l3 = bisect(
        (value) => goesOver(buildGrid(l1, l2, value, maxGoals), totals.line),
        0,
        SHARED_CEILING,
        totals.over,
      );
    }

    const grid = buildGrid(l1, l2, l3, maxGoals);
    const misses = [
      Math.abs(homeWins(grid) - probabilities.home),
      Math.abs(awayWins(grid) - probabilities.away),
    ];
    if (totals !== undefined) misses.push(Math.abs(goesOver(grid, totals.line) - totals.over));
    residual = Math.max(...misses);

    if (residual < tolerance) {
      converged = true;
      break;
    }
  }

  return {
    homeGoals: l1 + l3,
    awayGoals: l2 + l3,
    sharedGoals: l3,
    maxGoals,
    grid: buildGrid(l1, l2, l3, maxGoals),
    residual,
    converged,
    usedTotals: totals !== undefined,
  };
};

const assertSelection = (selection: ScorelineSelection): void => {
  if (selection.kind === 'totals' && !isHalfLine(selection.line)) {
    throw new OddsError('Totals line must fall on a half goal so the bet cannot push');
  }
  if (selection.kind === 'handicap' && !isHalfLine(selection.line)) {
    throw new OddsError('Handicap line must fall on a half goal so the bet cannot push');
  }
  if (
    selection.kind === 'exactScore' &&
    (!Number.isInteger(selection.home) ||
      !Number.isInteger(selection.away) ||
      selection.home < 0 ||
      selection.away < 0)
  ) {
    throw new OddsError('An exact score needs two whole, non-negative goal counts');
  }
};

const holds = (selection: ScorelineSelection, x: number, y: number): boolean => {
  switch (selection.kind) {
    case 'result':
      if (selection.side === 'home') return x > y;
      if (selection.side === 'away') return y > x;
      return x === y;
    case 'doubleChance':
      if (selection.excludes === 'away') return x >= y;
      if (selection.excludes === 'home') return y >= x;
      return x !== y;
    case 'totals':
      return selection.side === 'over' ? x + y > selection.line : x + y < selection.line;
    case 'bothScore':
      return (x > 0 && y > 0) === selection.scores;
    case 'exactScore':
      return x === selection.home && y === selection.away;
    default:
      return selection.side === 'home' ? x + selection.line > y : y + selection.line > x;
  }
};

/** Probability of an exact scoreline; anything off the grid is impossible. */
export const scorelineProbability = (
  model: ScorelineModel,
  home: number,
  away: number,
): Probability => (model.grid[home]?.[away] as number | undefined) ?? 0;

/**
 * Probability that every selection lands, summed over the scorelines where all
 * of them hold at once. For legs of the same match this is exact — there is no
 * independence assumption to correct for, and no correlation input.
 */
export const jointSelectionProbability = (
  model: ScorelineModel,
  selections: ReadonlyArray<ScorelineSelection>,
): Probability => {
  if (selections.length === 0) throw new OddsError('A price needs at least one selection');
  selections.forEach(assertSelection);
  return sumWhere(model.grid, (x, y) => selections.every((s) => holds(s, x, y)));
};

export const selectionProbability = (
  model: ScorelineModel,
  selection: ScorelineSelection,
): Probability => jointSelectionProbability(model, [selection]);

export const fairPriceForSelections = (
  model: ScorelineModel,
  selections: ReadonlyArray<ScorelineSelection>,
): DecimalOdds => {
  const p = jointSelectionProbability(model, selections);
  if (p <= 0) throw new OddsError('These selections cannot all land, so there is no fair price');
  return 1 / p;
};

/**
 * How much the true joint probability beats the product of the marginals — the
 * error a bookmaker makes by multiplying legs. Positive means the legs land
 * together more often than multiplying suggests, so the multiplied price is too
 * generous; negative means the opposite.
 */
export const correlationLift = (
  model: ScorelineModel,
  selections: ReadonlyArray<ScorelineSelection>,
): number => {
  const joint = jointSelectionProbability(model, selections);
  const naive = selections.reduce((product, s) => product * selectionProbability(model, s), 1);
  if (naive <= 0) {
    throw new OddsError('A selection that can never land has no multiplied price to compare');
  }
  return joint / naive - 1;
};
