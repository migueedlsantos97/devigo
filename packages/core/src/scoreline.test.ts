import { describe, expect, it } from 'vitest';
import { OddsError } from './odds.js';
import {
  correlationLift,
  fairPriceForSelections,
  fitScoreline,
  jointSelectionProbability,
  scorelineProbability,
  selectionProbability,
  type ScorelineSelection,
} from './scoreline.js';

/** A home favourite in a high-scoring league. */
const FAVOURITE = { home: 0.52, draw: 0.26, away: 0.22 };
const OVER_25 = { line: 2.5, over: 0.54 };

const gridTotal = (grid: ReadonlyArray<ReadonlyArray<number>>): number =>
  grid.reduce((sum, row) => sum + row.reduce((rowSum, p) => rowSum + p, 0), 0);

describe('fitScoreline', () => {
  it('reproduces the 1X2 probabilities it was fitted to', () => {
    const model = fitScoreline(FAVOURITE, OVER_25);
    const home = selectionProbability(model, { kind: 'result', side: 'home' });
    const draw = selectionProbability(model, { kind: 'result', side: 'draw' });
    const away = selectionProbability(model, { kind: 'result', side: 'away' });
    expect(home).toBeCloseTo(FAVOURITE.home, 4);
    expect(draw).toBeCloseTo(FAVOURITE.draw, 4);
    expect(away).toBeCloseTo(FAVOURITE.away, 4);
  });

  it('reproduces the totals line it was fitted to', () => {
    const model = fitScoreline(FAVOURITE, OVER_25);
    const over = selectionProbability(model, { kind: 'totals', line: 2.5, side: 'over' });
    expect(over).toBeCloseTo(OVER_25.over, 4);
  });

  it('reports convergence and a residual small enough to quote', () => {
    const model = fitScoreline(FAVOURITE, OVER_25);
    expect(model.converged).toBe(true);
    expect(model.residual).toBeLessThan(1e-4);
  });

  it('normalises the truncated grid to exactly one', () => {
    const model = fitScoreline(FAVOURITE, OVER_25);
    expect(gridTotal(model.grid)).toBeCloseTo(1, 12);
  });

  it('gives the favourite the larger scoring rate', () => {
    const model = fitScoreline(FAVOURITE, OVER_25);
    expect(model.homeGoals).toBeGreaterThan(model.awayGoals);
  });

  it('fits without a totals line by dropping the shared-goal term', () => {
    const model = fitScoreline(FAVOURITE);
    expect(model.sharedGoals).toBe(0);
    expect(model.usedTotals).toBe(false);
    expect(selectionProbability(model, { kind: 'result', side: 'home' })).toBeCloseTo(0.52, 4);
    expect(selectionProbability(model, { kind: 'result', side: 'away' })).toBeCloseTo(0.22, 4);
  });

  it('raises the shared-goal term when the market wants more goals than 1X2 implies', () => {
    const tight = fitScoreline(FAVOURITE, { line: 2.5, over: 0.45 });
    const loose = fitScoreline(FAVOURITE, { line: 2.5, over: 0.62 });
    expect(loose.sharedGoals).toBeGreaterThan(tight.sharedGoals);
  });

  it('honours a custom goal ceiling', () => {
    const model = fitScoreline(FAVOURITE, OVER_25, { maxGoals: 6 });
    expect(model.maxGoals).toBe(6);
    expect(model.grid).toHaveLength(7);
    expect(gridTotal(model.grid)).toBeCloseTo(1, 12);
  });

  it('stops at the pass limit and says so rather than pretending to converge', () => {
    const model = fitScoreline(FAVOURITE, OVER_25, { maxPasses: 1, tolerance: 1e-12 });
    expect(model.converged).toBe(false);
  });

  it('rejects probabilities that do not form a market', () => {
    expect(() => fitScoreline({ home: 0.5, draw: 0.3, away: 0.4 })).toThrow(OddsError);
  });

  it('rejects a zero-probability outcome, which no scoring rate can produce', () => {
    expect(() => fitScoreline({ home: 0.6, draw: 0.4, away: 0 })).toThrow(OddsError);
  });

  it('rejects a totals line that is not a half goal', () => {
    expect(() => fitScoreline(FAVOURITE, { line: 3, over: 0.5 })).toThrow(OddsError);
  });

  it('rejects a totals probability outside the open unit interval', () => {
    expect(() => fitScoreline(FAVOURITE, { line: 2.5, over: 1 })).toThrow(OddsError);
  });

  it('rejects a goal ceiling too low to hold a realistic scoreline', () => {
    expect(() => fitScoreline(FAVOURITE, OVER_25, { maxGoals: 2 })).toThrow(OddsError);
  });
});

describe('selectionProbability', () => {
  const model = fitScoreline(FAVOURITE, OVER_25);

  it('prices a double chance as the sum of its two results', () => {
    const home = selectionProbability(model, { kind: 'result', side: 'home' });
    const draw = selectionProbability(model, { kind: 'result', side: 'draw' });
    const cover = selectionProbability(model, { kind: 'doubleChance', excludes: 'away' });
    expect(cover).toBeCloseTo(home + draw, 10);
  });

  it('prices the other two double chances off the same grid', () => {
    const home = selectionProbability(model, { kind: 'result', side: 'home' });
    const draw = selectionProbability(model, { kind: 'result', side: 'draw' });
    const away = selectionProbability(model, { kind: 'result', side: 'away' });
    expect(selectionProbability(model, { kind: 'doubleChance', excludes: 'home' })).toBeCloseTo(
      away + draw,
      10,
    );
    expect(selectionProbability(model, { kind: 'doubleChance', excludes: 'draw' })).toBeCloseTo(
      home + away,
      10,
    );
  });

  it('prices under as the complement of over on the same line', () => {
    const over = selectionProbability(model, { kind: 'totals', line: 1.5, side: 'over' });
    const under = selectionProbability(model, { kind: 'totals', line: 1.5, side: 'under' });
    expect(over + under).toBeCloseTo(1, 10);
  });

  it('prices both-teams-to-score and its complement', () => {
    const yes = selectionProbability(model, { kind: 'bothScore', scores: true });
    const no = selectionProbability(model, { kind: 'bothScore', scores: false });
    expect(yes + no).toBeCloseTo(1, 10);
    expect(yes).toBeGreaterThan(0.4);
  });

  it('prices an exact score straight off the grid', () => {
    const exact = selectionProbability(model, { kind: 'exactScore', home: 2, away: 1 });
    expect(exact).toBeCloseTo(scorelineProbability(model, 2, 1), 12);
    expect(exact).toBeGreaterThan(0);
  });

  it('prices an exact score beyond the ceiling as impossible', () => {
    expect(scorelineProbability(model, 99, 0)).toBe(0);
    expect(scorelineProbability(model, 0, 99)).toBe(0);
  });

  it('prices a handicap: giving the favourite a goal costs probability', () => {
    const straight = selectionProbability(model, { kind: 'result', side: 'home' });
    const giving = selectionProbability(model, { kind: 'handicap', side: 'home', line: -1.5 });
    const getting = selectionProbability(model, { kind: 'handicap', side: 'home', line: 1.5 });
    expect(giving).toBeLessThan(straight);
    expect(getting).toBeGreaterThan(straight);
  });

  it('prices an away handicap from the away side of the scoreline', () => {
    const away = selectionProbability(model, { kind: 'result', side: 'away' });
    const getting = selectionProbability(model, { kind: 'handicap', side: 'away', line: 1.5 });
    expect(getting).toBeGreaterThan(away);
  });

  it('rejects a handicap that could end in a push', () => {
    expect(() =>
      selectionProbability(model, { kind: 'handicap', side: 'home', line: -1 }),
    ).toThrow(OddsError);
  });

  it('rejects a totals line that could end in a push', () => {
    expect(() => selectionProbability(model, { kind: 'totals', line: 2, side: 'over' })).toThrow(
      OddsError,
    );
  });

  it('rejects a negative exact score', () => {
    expect(() => selectionProbability(model, { kind: 'exactScore', home: -1, away: 0 })).toThrow(
      OddsError,
    );
  });
});

describe('jointSelectionProbability', () => {
  const model = fitScoreline(FAVOURITE, OVER_25);

  it('is the marginal when there is a single selection', () => {
    const one: ScorelineSelection = { kind: 'result', side: 'home' };
    expect(jointSelectionProbability(model, [one])).toBeCloseTo(
      selectionProbability(model, one),
      12,
    );
  });

  it('exceeds the naive product when a favourite winning drags goals up with it', () => {
    const home: ScorelineSelection = { kind: 'result', side: 'home' };
    const over: ScorelineSelection = { kind: 'totals', line: 2.5, side: 'over' };
    const joint = jointSelectionProbability(model, [home, over]);
    const naive = selectionProbability(model, home) * selectionProbability(model, over);
    expect(joint).toBeGreaterThan(naive);
  });

  it('falls below the naive product when the two selections fight each other', () => {
    const home: ScorelineSelection = { kind: 'result', side: 'home' };
    const under: ScorelineSelection = { kind: 'totals', line: 2.5, side: 'under' };
    const joint = jointSelectionProbability(model, [home, under]);
    const naive = selectionProbability(model, home) * selectionProbability(model, under);
    expect(joint).toBeLessThan(naive);
  });

  it('is zero for selections that cannot both happen', () => {
    const joint = jointSelectionProbability(model, [
      { kind: 'result', side: 'home' },
      { kind: 'result', side: 'away' },
    ]);
    expect(joint).toBe(0);
  });

  it('rejects an empty selection list', () => {
    expect(() => jointSelectionProbability(model, [])).toThrow(OddsError);
  });
});

describe('fairPriceForSelections', () => {
  const model = fitScoreline(FAVOURITE, OVER_25);

  it('is the reciprocal of the joint probability', () => {
    const selections: ReadonlyArray<ScorelineSelection> = [
      { kind: 'result', side: 'home' },
      { kind: 'totals', line: 2.5, side: 'over' },
    ];
    const price = fairPriceForSelections(model, selections);
    expect(price).toBeCloseTo(1 / jointSelectionProbability(model, selections), 8);
  });

  it('refuses to quote a price for an impossible combination', () => {
    expect(() =>
      fairPriceForSelections(model, [
        { kind: 'result', side: 'home' },
        { kind: 'result', side: 'draw' },
      ]),
    ).toThrow(OddsError);
  });
});

describe('correlationLift', () => {
  const model = fitScoreline(FAVOURITE, OVER_25);

  it('is positive when the legs move together', () => {
    expect(
      correlationLift(model, [
        { kind: 'result', side: 'home' },
        { kind: 'totals', line: 2.5, side: 'over' },
      ]),
    ).toBeGreaterThan(0);
  });

  it('is negative when the legs get in one another\'s way', () => {
    expect(
      correlationLift(model, [
        { kind: 'result', side: 'home' },
        { kind: 'totals', line: 2.5, side: 'under' },
      ]),
    ).toBeLessThan(0);
  });

  it('refuses to compare when a selection can never land', () => {
    expect(() =>
      correlationLift(model, [
        { kind: 'totals', line: 30.5, side: 'over' },
        { kind: 'result', side: 'home' },
      ]),
    ).toThrow(OddsError);
  });

  it('is minus one when the legs are mutually exclusive', () => {
    expect(
      correlationLift(model, [
        { kind: 'result', side: 'home' },
        { kind: 'result', side: 'away' },
      ]),
    ).toBe(-1);
  });
});
