import type { Locale } from '@devigo/i18n';
import {
  edge as edgeOf,
  kellyFraction,
  selectionProbability,
  type ScorelineModel,
  type ScorelineSelection,
} from '@devigo/core';
import type { MatchGroup } from './match-model';

/** What the engine is asked to maximise. Each is a different bet, not a mood. */
export type Objective = 'cobrar' | 'valor' | 'pagar';

export interface CandidateLeg {
  readonly matchId: string;
  readonly matchup: string;
  readonly key: string;
  readonly label: Record<Locale, string>;
  readonly selection: ScorelineSelection;
  /** Best price on offer across the books quoting it. */
  readonly price: number;
  readonly book: string;
  readonly fairProbability: number;
  /** fair probability x price - 1: positive means the price pays too much. */
  readonly edge: number;
}

export interface BuiltTicket {
  readonly legs: ReadonlyArray<CandidateLeg>;
  /** What the books pay, multiplied. */
  readonly price: number;
  /** What it is worth. Legs are from different matches, so they are independent. */
  readonly fairPrice: number;
  readonly probability: number;
  readonly edge: number;
  /** Quarter Kelly as a fraction of bankroll; zero when there is no edge. */
  readonly kelly: number;
}

/** Below this the ticket is barely a parlay, so `cobrar` keeps climbing. */
export const MIN_TICKET_PRICE = 2;
const KELLY_MULTIPLIER = 0.25;

/**
 * The floor `valor` will not pick below.
 *
 * Edge is largest on longshots, and on longshots it is also least real: the
 * favourite-longshot bias puts most of a book's margin there, so de-vigging is
 * at its least certain exactly where the measured edge looks best. Without this
 * floor, "most value" reliably builds a ticket of 25.0 shots — the one bet the
 * number is least able to justify. `pagar` is exempt on purpose: chasing the
 * longshot is what it is for, and it says so.
 */
export const MIN_LEG_PROBABILITY = 0.2;

/**
 * Every leg of a match the board can both price and buy: the three results and
 * the two sides of its totals line. Double chance and the rest are derivable
 * from the model but not quoted by the feed, and a leg with no price is a leg
 * nobody can take.
 */
export const candidatesFor = (
  match: MatchGroup,
  model: ScorelineModel,
): ReadonlyArray<CandidateLeg> => {
  const legs: CandidateLeg[] = [];
  const add = (
    key: string,
    label: Record<Locale, string>,
    selection: ScorelineSelection,
    price: number,
    book: string,
  ): void => {
    if (!(price > 1)) return;
    const fairProbability = selectionProbability(model, selection);
    legs.push({
      matchId: match.eventId,
      matchup: match.matchup,
      key: `${match.eventId}:${key}`,
      label,
      selection,
      price,
      book,
      fairProbability,
      edge: edgeOf(fairProbability, price),
    });
  };

  for (const runner of match.result?.runners ?? []) {
    const side =
      runner.label.en === match.homeTeam
        ? ('home' as const)
        : runner.label.en === match.awayTeam
          ? ('away' as const)
          : runner.label.en === 'Draw'
            ? ('draw' as const)
            : null;
    if (side === null) continue;
    add(side, runner.label, { kind: 'result', side }, runner.price, runner.book);
  }

  const line = match.totals?.totalsLine ?? null;
  if (line !== null) {
    for (const runner of match.totals?.runners ?? []) {
      const side = runner.label.en.startsWith('Over') ? ('over' as const) : ('under' as const);
      add(side, runner.label, { kind: 'totals', line, side }, runner.price, runner.book);
    }
  }

  return legs;
};

const settle = (legs: ReadonlyArray<CandidateLeg>): BuiltTicket => {
  const price = legs.reduce((product, leg) => product * leg.price, 1);
  // One leg per match, so nothing here shares a scoreline: the joint
  // probability really is the product. Correlation lives inside a match, and
  // that is what the specials list is for.
  const probability = legs.reduce((product, leg) => product * leg.fairProbability, 1);
  return {
    legs,
    price,
    fairPrice: 1 / probability,
    probability,
    edge: edgeOf(probability, price),
    kelly: kellyFraction(probability, price, KELLY_MULTIPLIER),
  };
};

const bestBy = (
  legs: ReadonlyArray<CandidateLeg>,
  score: (leg: CandidateLeg) => number,
): CandidateLeg => legs.reduce((best, leg) => (score(leg) > score(best) ? leg : best));

/**
 * Builds the ticket for an objective.
 *
 * All three objectives separate across matches, because every quantity here is
 * a product: the best ticket is the best leg of each match under that
 * objective, with no search needed.
 *
 * - `valor` maximises the product of (1 + edge), so take each match's best edge.
 * - `pagar` maximises the product of prices, so take each match's longest.
 * - `cobrar` maximises the product of probabilities, so take each match's
 *   likeliest — and then, only if the ticket pays less than it is worth
 *   entering at all, trades probability for price where that trade is cheapest.
 */
export const buildTicket = (
  groups: ReadonlyArray<ReadonlyArray<CandidateLeg>>,
  objective: Objective,
  minPrice = MIN_TICKET_PRICE,
): BuiltTicket | null => {
  const usable = groups.filter((group) => group.length > 0);
  if (usable.length === 0) return null;

  if (objective === 'valor') {
    return settle(
      usable.map((group) => {
        // A match whose every leg is a longshot still contributes its best one:
        // dropping the match would silently change what the user picked.
        const solid = group.filter((leg) => leg.fairProbability >= MIN_LEG_PROBABILITY);
        return bestBy(solid.length > 0 ? solid : group, (l) => l.edge);
      }),
    );
  }
  if (objective === 'pagar') return settle(usable.map((group) => bestBy(group, (l) => l.price)));

  const picks = usable.map((group) => bestBy(group, (l) => l.fairProbability));
  let ticket = settle(picks);

  // Cheapest trade first: the swap that buys the most price per unit of
  // probability given up. Each match can be traded once, so this terminates.
  const traded = new Set<number>();
  while (ticket.price < minPrice) {
    let bestSwap: { at: number; leg: CandidateLeg; ratio: number } | null = null;
    for (const [index, group] of usable.entries()) {
      if (traded.has(index)) continue;
      const current = picks[index] as CandidateLeg;
      for (const leg of group) {
        if (leg.price <= current.price) continue;
        const ratio =
          (leg.price / current.price) / (current.fairProbability / leg.fairProbability);
        if (!bestSwap || ratio > bestSwap.ratio) bestSwap = { at: index, leg, ratio };
      }
    }
    if (!bestSwap) break;
    picks[bestSwap.at] = bestSwap.leg;
    traded.add(bestSwap.at);
    ticket = settle(picks);
  }

  return ticket;
};
