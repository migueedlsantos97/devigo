import { OddsError } from './odds.js';
import type { CorrelationMatrix, Leg, Probability, TicketAnalysis } from './types.js';
import { combinePrices, identityCorrelation, independentProbability, jointProbability } from './parlay.js';

/** Expected profit per 1 unit staked. */
export const expectedValue = (probability: Probability, price: number): number =>
  probability * (price - 1) - (1 - probability);

/** Edge as a fraction of fair value: (p * price) - 1. */
export const edge = (probability: Probability, price: number): number => probability * price - 1;

/** Full Kelly stake as a fraction of bankroll. Never returns a negative stake. */
export const kellyFraction = (
  probability: Probability,
  price: number,
  multiplier = 1,
): number => {
  if (multiplier <= 0 || multiplier > 1) {
    throw new OddsError('Kelly multiplier must be in (0, 1]');
  }
  const b = price - 1;
  const raw = (probability * b - (1 - probability)) / b;
  return Math.max(0, raw) * multiplier;
};

export const analyzeTicket = (
  legs: ReadonlyArray<Leg>,
  correlation: CorrelationMatrix = identityCorrelation(legs.length),
  kellyMultiplier = 0.25,
): TicketAnalysis => {
  if (legs.length === 0) throw new OddsError('A ticket needs at least one leg');
  const probabilities = legs.map((leg) => leg.fairProbability);
  const combinedPrice = combinePrices(legs.map((leg) => leg.price));
  const independent = independentProbability(probabilities);
  const joint = jointProbability(probabilities, correlation);

  return {
    legs,
    combinedPrice,
    independentProbability: independent,
    jointProbability: joint,
    correlationLift: joint / independent - 1,
    expectedValue: expectedValue(joint, combinedPrice),
    edge: edge(joint, combinedPrice),
    kellyFraction: kellyFraction(joint, combinedPrice, kellyMultiplier),
  };
};

/** Filters a candidate book to only +EV selections at a minimum edge threshold. */
export const scanValueBets = <T extends { price: number; fairProbability: Probability }>(
  candidates: ReadonlyArray<T>,
  minEdge = 0.02,
): ReadonlyArray<T & { edge: number; kelly: number }> =>
  candidates
    .map((c) => ({ ...c, edge: edge(c.fairProbability, c.price), kelly: kellyFraction(c.fairProbability, c.price, 0.25) }))
    .filter((c) => c.edge >= minEdge)
    .sort((a, b) => b.edge - a.edge);
