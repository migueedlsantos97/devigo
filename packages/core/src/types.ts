/** Branded decimal (European) odds, e.g. 2.50 */
export type DecimalOdds = number;
/** American / moneyline odds, e.g. -110, +150 */
export type AmericanOdds = number;
/** Probability in [0, 1] */
export type Probability = number;

export type VigMethod = 'multiplicative' | 'additive' | 'shin';

export interface Runner {
  readonly id: string;
  readonly label: string;
  readonly price: DecimalOdds;
}

export interface FairMarket {
  readonly method: VigMethod;
  /** Bookmaker overround, e.g. 0.045 === 4.5% */
  readonly margin: number;
  /** Shin's insider-trading proportion z; 0 for other methods */
  readonly z: number;
  readonly runners: ReadonlyArray<{
    readonly id: string;
    readonly label: string;
    readonly price: DecimalOdds;
    readonly impliedProbability: Probability;
    readonly fairProbability: Probability;
    readonly fairPrice: DecimalOdds;
  }>;
}

export interface Leg {
  readonly id: string;
  readonly label: string;
  /** Offered (vigged) price the bettor can actually take */
  readonly price: DecimalOdds;
  /** De-vigged, model-fair win probability */
  readonly fairProbability: Probability;
}

/** Symmetric matrix of pairwise correlation coefficients in [-1, 1]. */
export type CorrelationMatrix = ReadonlyArray<ReadonlyArray<number>>;

export interface TicketAnalysis {
  readonly legs: ReadonlyArray<Leg>;
  readonly combinedPrice: DecimalOdds;
  readonly independentProbability: Probability;
  readonly jointProbability: Probability;
  readonly correlationLift: number;
  readonly expectedValue: number;
  readonly edge: number;
  readonly kellyFraction: number;
}

export interface SimulationResult {
  readonly iterations: number;
  readonly hitRate: number;
  readonly meanReturn: number;
  readonly medianBankroll: number;
  readonly stdDev: number;
  readonly p05: number;
  readonly p95: number;
  readonly maxDrawdown: number;
  readonly riskOfRuin: number;
  /** Survival curve: probability the ticket is still live after leg i settles. */
  readonly decay: ReadonlyArray<number>;
}
