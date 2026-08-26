import type { OddsAdapter, OddsFeedEvent } from './index.js';

interface ApiOutcome { name: string; price: number }
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
  readonly fetchImpl?: typeof fetch;
}

export const createTheOddsApiAdapter = (config: TheOddsApiConfig): OddsAdapter => {
  const baseUrl = config.baseUrl ?? 'https://api.the-odds-api.com/v4';
  const regions = config.regions ?? 'uk,eu';
  const doFetch = config.fetchImpl ?? fetch;

  return {
    name: 'the-odds-api',
    async fetchEvents(league: string): Promise<ReadonlyArray<OddsFeedEvent>> {
      const url = `${baseUrl}/sports/${league}/odds?regions=${regions}&oddsFormat=decimal&apiKey=${config.apiKey}`;
      const response = await doFetch(url);
      if (!response.ok) throw new Error(`Odds feed ${response.status}`);
      const payload = (await response.json()) as ApiEvent[];
      return payload.flatMap((event) =>
        event.bookmakers.flatMap((book) =>
          book.markets.map((market) => ({
            eventId: event.id,
            league: event.sport_key,
            startsAt: event.commence_time,
            market: market.key,
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
