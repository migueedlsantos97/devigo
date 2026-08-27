import type { Runner, VigMethod } from '@devigo/core';
import { devig } from '@devigo/core';

export interface OddsFeedEvent {
  readonly eventId: string;
  readonly league: string;
  readonly startsAt: string;
  readonly market: string;
  readonly runners: ReadonlyArray<Runner>;
  readonly book: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
}

export interface OddsAdapter {
  readonly name: string;
  fetchEvents(league: string): Promise<ReadonlyArray<OddsFeedEvent>>;
}

/** Normalises any adapter feed into de-vigged fair markets. */
export const toFairMarkets = (
  events: ReadonlyArray<OddsFeedEvent>,
  method: VigMethod = 'shin',
) => events.map((event) => ({ event, fair: devig(event.runners, method) }));

export { createTheOddsApiAdapter, OddsFeedQuotaError } from './the-odds-api.js';
