import type { OddsAdapter, OddsFeedEvent } from './index.js';

/** The provider's monthly request quota is exhausted. */
export class OddsFeedQuotaError extends Error {
  constructor() {
    super('Odds feed quota exhausted');
    this.name = 'OddsFeedQuotaError';
  }
}

interface ApiOutcome { name: string; price: number; point?: number }
interface ApiMarket { key: string; outcomes: ApiOutcome[] }
interface ApiBookmaker { key: string; title: string; markets: ApiMarket[] }
interface ApiEvent {
  id: string; sport_key: string; commence_time: string;
  home_team?: string; away_team?: string;
  bookmakers: ApiBookmaker[];
}

export interface TheOddsApiConfig {
  readonly apiKey: string;
  readonly baseUrl?: string;
  readonly regions?: string;
  /** Comma-separated market keys, e.g. 'h2h,totals'. Defaults to 'h2h'. */
  readonly markets?: string;
  readonly fetchImpl?: typeof fetch;
}

export const createTheOddsApiAdapter = (config: TheOddsApiConfig): OddsAdapter => {
  const baseUrl = config.baseUrl ?? 'https://api.the-odds-api.com/v4';
  const regions = config.regions ?? 'eu';
  const markets = config.markets ?? 'h2h';
  const doFetch = config.fetchImpl ?? fetch;

  return {
    name: 'the-odds-api',
    async fetchEvents(league: string): Promise<ReadonlyArray<OddsFeedEvent>> {
      const url = `${baseUrl}/sports/${league}/odds?regions=${regions}&markets=${markets}&oddsFormat=decimal&apiKey=${config.apiKey}`;
      const response = await doFetch(url);
      if (!response.ok) {
        // 401 + OUT_OF_USAGE_CREDIT means the monthly plan is spent, which is
        // worth telling the user apart from an outage or an empty schedule.
        const body = await response.text().catch(() => '');
        if (body.includes('OUT_OF_USAGE_CREDIT')) throw new OddsFeedQuotaError();
        throw new Error(`Odds feed ${response.status}`);
      }
      const payload = (await response.json()) as ApiEvent[];
      return payload.flatMap((event) =>
        event.bookmakers.flatMap((book) =>
          book.markets.map((market) => ({
            eventId: event.id,
            league: event.sport_key,
            startsAt: event.commence_time,
            // Point-based markets (totals, spreads) are distinct per line:
            // encode the point into the market key so books only group when
            // they quote the same line.
            market:
              market.outcomes[0]?.point != null
                ? `${market.key}:${market.outcomes[0].point}`
                : market.key,
            book: book.key,
            homeTeam: event.home_team ?? '',
            awayTeam: event.away_team ?? '',
            runners: market.outcomes.map((outcome, i) => ({
              id: `${event.id}:${market.key}:${i}`,
              label: outcome.name,
              price: outcome.price,
            })),
          })),
        ),
      );
    },
  };
};
