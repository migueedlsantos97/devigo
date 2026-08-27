import type { Locale } from '@devigo/i18n';
import {
  consensusProbabilities,
  correlationLift,
  decimalToImplied,
  fairPriceForSelections,
  fitScoreline,
  jointSelectionProbability,
  type ScorelineModel,
  type ScorelineSelection,
} from '@devigo/core';
import { SPECIAL_EDGE_FLOOR, type NormalizedMarket } from './markets';

/**
 * The feed hands out one row per market. A match is the unit the user thinks
 * in — and the unit the scoreline model needs, because a model is fitted to a
 * fixture's 1X2 and totals together, not to either alone.
 */
export interface MatchGroup {
  readonly eventId: string;
  readonly league: string;
  readonly startsAt: string;
  readonly matchup: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly result: NormalizedMarket | null;
  readonly totals: NormalizedMarket | null;
  /** Books quoting the result market — how thin the price is. */
  readonly bookCount: number;
}

export const groupMatches = (
  markets: ReadonlyArray<NormalizedMarket>,
): ReadonlyArray<MatchGroup> => {
  const order: string[] = [];
  const byEvent = new Map<string, { result: NormalizedMarket | null; totals: NormalizedMarket | null; any: NormalizedMarket }>();

  for (const market of markets) {
    const entry = byEvent.get(market.eventId);
    if (!entry) {
      order.push(market.eventId);
      byEvent.set(market.eventId, {
        result: market.totalsLine === null ? market : null,
        totals: market.totalsLine === null ? null : market,
        any: market,
      });
      continue;
    }
    byEvent.set(market.eventId, {
      result: market.totalsLine === null ? market : entry.result,
      totals: market.totalsLine === null ? entry.totals : market,
      any: entry.any,
    });
  }

  return order.map((eventId) => {
    const entry = byEvent.get(eventId) as { result: NormalizedMarket | null; totals: NormalizedMarket | null; any: NormalizedMarket };
    const { any } = entry;
    return {
      eventId,
      league: any.league,
      startsAt: any.startsAt,
      matchup: any.matchup,
      homeTeam: any.homeTeam,
      awayTeam: any.awayTeam,
      result: entry.result,
      totals: entry.totals,
      bookCount: entry.result?.books.length ?? 0,
    };
  });
};

/**
 * What playing this match costs at the best prices on offer — the overround
 * left after line shopping. Not a prediction, which is the point: it is the
 * one number on the board that is purely a fact about the market.
 */
export const houseTake = (match: MatchGroup): number | null => {
  const runners = match.result?.runners;
  if (!runners || runners.length < 2) return null;
  if (runners.some((r) => !(r.price > 1))) return null;
  return runners.reduce((sum, r) => sum + decimalToImplied(r.price), 0) - 1;
};

/** Below this, a totals line is one book's opinion rather than a market. */
const MIN_TOTALS_BOOKS = 3;

/** A totals probability this extreme is a broken quote, not a market. */
const USABLE = (p: number): boolean => p > 0.01 && p < 0.99;

/**
 * Fits the fixture's scoreline distribution to its own de-vigged prices.
 *
 * The gate is the shape of the market, not the name of the competition: a
 * three-way result market with a draw is a football market, whatever the league
 * is called. Naming leagues is the feed's business and it changes; needing a
 * third outcome is the model's business and it does not.
 */
export const fitMatchModel = (match: MatchGroup): ScorelineModel | null => {
  const result = match.result;
  if (!result || result.runners.length !== 3 || result.priceSets.length === 0) return null;

  const consensus = consensusProbabilities(result.priceSets);
  const indexOf = (predicate: (label: string) => boolean): number =>
    result.runners.findIndex((r) => predicate(r.label.en));
  const home = indexOf((label) => label === match.homeTeam);
  const away = indexOf((label) => label === match.awayTeam);
  const draw = indexOf((label) => label === 'Draw');
  if (home < 0 || away < 0 || draw < 0) return null;

  const probabilities = {
    home: consensus[home] as number,
    draw: consensus[draw] as number,
    away: consensus[away] as number,
  };
  if (!Object.values(probabilities).every(USABLE)) return null;

  const totals = match.totals;
  const line = totals?.totalsLine ?? null;
  // One book's totals quote is not a market. Calibrating the goal expectation
  // on it while the result market carries twenty books imports that one book's
  // opinion as fact — and when it disagrees with the result market by more than
  // the model can bend, the fit fails outright.
  if (!totals || line === null || totals.priceSets.length < MIN_TOTALS_BOOKS) {
    return fitScoreline(probabilities);
  }

  const totalsConsensus = consensusProbabilities(totals.priceSets);
  const overIndex = totals.runners.findIndex((r) => r.label.en.startsWith('Over'));
  const over = overIndex < 0 ? null : (totalsConsensus[overIndex] as number);
  // A totals line the model cannot use is dropped, not fudged: the fit falls
  // back to 1X2 alone and says so through `usedTotals`.
  if (over === null || !USABLE(over)) return fitScoreline(probabilities);
  return fitScoreline(probabilities, { line, over });
};

/** One combination the bookmaker sells as a single pre-priced market. */
export interface SpecialQuote {
  readonly key: string;
  readonly label: Record<Locale, string>;
  readonly selections: ReadonlyArray<ScorelineSelection>;
  readonly fairProbability: number;
  readonly fairPrice: number;
  /** Take it only at this price or better. */
  readonly threshold: number;
  /**
   * How wrong it would be to multiply the legs. Positive: they land together
   * more often than multiplying implies, so a multiplied price pays too much.
   */
  readonly lift: number;
}

const RESULT_SIDES = [
  { side: 'home' as const, es: (h: string) => `Gana ${h}`, en: (h: string) => `${h} win` },
  { side: 'draw' as const, es: () => 'Empate', en: () => 'Draw' },
  { side: 'away' as const, es: (_h: string, a: string) => `Gana ${a}`, en: (_h: string, a: string) => `${a} win` },
];

/**
 * The combinations worth checking against a bookmaker's specials menu, priced
 * before ever seeing what it charges for them. Ordered by how badly multiplying
 * the legs would misprice them, because that is where the menu is worth reading.
 */
export const specialsFor = (
  model: ScorelineModel,
  match: Pick<MatchGroup, 'homeTeam' | 'awayTeam'>,
  line = 2.5,
): ReadonlyArray<SpecialQuote> => {
  const { homeTeam: h, awayTeam: a } = match;
  const combos: Array<{ key: string; es: string; en: string; selections: ScorelineSelection[] }> = [];

  for (const result of RESULT_SIDES) {
    for (const side of ['over', 'under'] as const) {
      const goals = side === 'over' ? `+${line}` : `−${line}`;
      combos.push({
        key: `${result.side}-${side}`,
        es: `${result.es(h, a)} y ${goals} goles`,
        en: `${result.en(h, a)} and ${side} ${line}`,
        selections: [
          { kind: 'result', side: result.side },
          { kind: 'totals', line, side },
        ],
      });
    }
  }
  for (const result of RESULT_SIDES.filter((r) => r.side !== 'draw')) {
    combos.push({
      key: `${result.side}-btts`,
      // Built this way round so the club's own name keeps its capitals:
      // lower-casing the phrase turned "Central Español FC" into a typo.
      es: `${result.es(h, a)} y ambos marcan`,
      en: `${result.en(h, a)} and both teams score`,
      selections: [
        { kind: 'result', side: result.side },
        { kind: 'bothScore', scores: true },
      ],
    });
  }

  return combos
    .map((combo) => {
      const fairPrice = fairPriceForSelections(model, combo.selections);
      return {
        key: combo.key,
        label: { es: combo.es, en: combo.en },
        selections: combo.selections,
        fairProbability: jointSelectionProbability(model, combo.selections),
        fairPrice,
        threshold: fairPrice * (1 + SPECIAL_EDGE_FLOOR),
        lift: correlationLift(model, combo.selections),
      };
    })
    .sort((x, y) => y.lift - x.lift);
};
