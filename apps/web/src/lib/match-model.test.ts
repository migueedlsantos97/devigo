import { describe, expect, it } from 'vitest';
import { selectionProbability } from '@devigo/core';
import type { NormalizedMarket } from '@/lib/markets';
import { fitMatchModel, groupMatches, houseTake, specialsFor } from '@/lib/match-model';

const market = (over: Partial<NormalizedMarket> & Pick<NormalizedMarket, 'id'>): NormalizedMarket => ({
  eventId: 'e1',
  league: 'EPL',
  startsAt: '2026-08-28T18:00:00Z',
  matchup: 'Arsenal vs Chelsea',
  homeTeam: 'Arsenal',
  awayTeam: 'Chelsea',
  totalsLine: null,
  marketName: { es: '1X2', en: '1X2' },
  runners: [],
  books: [],
  priceSets: [],
  commissions: [],
  ...over,
});

const runner = (en: string, price: number): NormalizedMarket['runners'][number] => ({
  id: en,
  label: { es: en, en },
  price,
  book: 'bet365',
  commission: 0,
});

const RESULT = market({
  id: 'e1:h2h',
  runners: [runner('Arsenal', 2.1), runner('Draw', 3.4), runner('Chelsea', 3.6)],
  books: ['bet365', 'pinnacle'],
  priceSets: [
    [2.1, 3.4, 3.6],
    [2.05, 3.5, 3.55],
  ],
  commissions: [0, 0],
});

const TOTALS = market({
  id: 'e1:totals:2.5',
  totalsLine: 2.5,
  marketName: { es: 'Más/Menos 2.5', en: 'Over/Under 2.5' },
  runners: [runner('Over 2.5', 1.85), runner('Under 2.5', 1.95)],
  books: ['bet365', 'pinnacle'],
  priceSets: [
    [1.85, 1.95],
    [1.87, 1.93],
  ],
  commissions: [0, 0],
});

describe('groupMatches', () => {
  it('folds every market quoted on a fixture into one match', () => {
    const groups = groupMatches([RESULT, TOTALS]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.result?.id).toBe('e1:h2h');
    expect(groups[0]?.totals?.id).toBe('e1:totals:2.5');
    expect(groups[0]?.bookCount).toBe(2);
  });

  it('keeps a match that only has a result market', () => {
    const groups = groupMatches([RESULT]);
    expect(groups[0]?.totals).toBeNull();
  });

  it('keeps a match that only has a totals market, and knows it cannot be modelled', () => {
    const groups = groupMatches([TOTALS]);
    expect(groups[0]?.result).toBeNull();
    expect(groups[0]?.bookCount).toBe(0);
    expect(fitMatchModel(groups[0]!)).toBeNull();
  });

  it('preserves feed order across fixtures', () => {
    const second = market({ id: 'e2:h2h', eventId: 'e2', matchup: 'Spurs vs Fulham' });
    expect(groupMatches([TOTALS, second, RESULT]).map((g) => g.eventId)).toEqual(['e1', 'e2']);
  });
});

describe('houseTake', () => {
  it('is the overround left after line shopping', () => {
    const take = houseTake(groupMatches([RESULT])[0]!);
    expect(take).toBeCloseTo(1 / 2.1 + 1 / 3.4 + 1 / 3.6 - 1, 10);
    expect(take).toBeGreaterThan(0);
  });

  it('is unknown without a result market', () => {
    expect(houseTake(groupMatches([TOTALS])[0]!)).toBeNull();
  });

  it('is unknown when a price is missing', () => {
    const broken = market({ id: 'e1:h2h', runners: [runner('Arsenal', 0), runner('Draw', 3.4)] });
    expect(houseTake(groupMatches([broken])[0]!)).toBeNull();
  });
});

describe('fitMatchModel', () => {
  it('fits the fixture to its own de-vigged prices', () => {
    const model = fitMatchModel(groupMatches([RESULT, TOTALS])[0]!);
    expect(model).not.toBeNull();
    expect(model?.usedTotals).toBe(true);
    expect(model?.converged).toBe(true);
    expect(model!.homeGoals).toBeGreaterThan(model!.awayGoals);
  });

  it('falls back to 1X2 alone when there is no totals market', () => {
    const model = fitMatchModel(groupMatches([RESULT])[0]!);
    expect(model?.usedTotals).toBe(false);
  });

  it('drops a totals market whose over price is unusable rather than fudging it', () => {
    const broken = market({
      id: 'e1:totals:2.5',
      totalsLine: 2.5,
      runners: [runner('Over 2.5', 1.85), runner('Under 2.5', 1.95)],
      books: ['bet365'],
      priceSets: [[500, 1.001]],
      commissions: [0],
    });
    expect(fitMatchModel(groupMatches([RESULT, broken])[0]!)?.usedTotals).toBe(false);
  });

  it('drops a totals market with no over runner', () => {
    const odd = market({
      id: 'e1:totals:2.5',
      totalsLine: 2.5,
      runners: [runner('Yes', 1.85), runner('No', 1.95)],
      books: ['bet365'],
      priceSets: [[1.85, 1.95]],
      commissions: [0],
    });
    expect(fitMatchModel(groupMatches([RESULT, odd])[0]!)?.usedTotals).toBe(false);
  });

  it('refuses a two-way moneyline, which has no draw to model', () => {
    const nba = market({
      id: 'e9:h2h',
      eventId: 'e9',
      league: 'NBA',
      matchup: 'Heat @ Celtics',
      homeTeam: 'Celtics',
      awayTeam: 'Heat',
      runners: [runner('Celtics', 1.5), runner('Heat', 2.6)],
      books: ['bet365'],
      priceSets: [[1.5, 2.6]],
      commissions: [0],
    });
    expect(fitMatchModel(groupMatches([nba])[0]!)).toBeNull();
  });

  it('refuses a football market whose runners do not name the two sides', () => {
    const mismatched = market({
      id: 'e1:h2h',
      runners: [runner('Gunners', 2.1), runner('Draw', 3.4), runner('Blues', 3.6)],
      books: ['bet365'],
      priceSets: [[2.1, 3.4, 3.6]],
      commissions: [0],
    });
    expect(fitMatchModel(groupMatches([mismatched])[0]!)).toBeNull();
  });

  it('refuses a result market with no per-book prices to de-vig', () => {
    const empty = market({
      id: 'e1:h2h',
      runners: [runner('Arsenal', 2.1), runner('Draw', 3.4), runner('Chelsea', 3.6)],
    });
    expect(fitMatchModel(groupMatches([empty])[0]!)).toBeNull();
  });

  it('refuses a result market quoting a near-certain outcome', () => {
    const lopsided = market({
      id: 'e1:h2h',
      runners: [runner('Arsenal', 1.001), runner('Draw', 400), runner('Chelsea', 400)],
      books: ['bet365'],
      priceSets: [[1.001, 400, 400]],
      commissions: [0],
    });
    expect(fitMatchModel(groupMatches([lopsided])[0]!)).toBeNull();
  });
});

describe('specialsFor', () => {
  const model = fitMatchModel(groupMatches([RESULT, TOTALS])[0]!)!;
  const specials = specialsFor(model, { homeTeam: 'Arsenal', awayTeam: 'Chelsea' });

  it('quotes the eight combinations a specials menu actually sells', () => {
    expect(specials).toHaveLength(8);
    expect(specials.map((s) => s.key)).toContain('home-over');
    expect(specials.map((s) => s.key)).toContain('away-btts');
  });

  it('names each one after the real teams', () => {
    const homeOver = specials.find((s) => s.key === 'home-over');
    expect(homeOver?.label.es).toBe('Gana Arsenal y +2.5 goles');
    expect(homeOver?.label.en).toBe('Arsenal win and over 2.5');
  });

  it('leads with the combination multiplying gets most wrong', () => {
    const lifts = specials.map((s) => s.lift);
    expect(lifts).toEqual([...lifts].sort((x, y) => y - x));
    expect(lifts[0]).toBeGreaterThan(0);
  });

  it('sets every threshold above its own fair price', () => {
    for (const special of specials) {
      expect(special.threshold).toBeGreaterThan(special.fairPrice);
      expect(special.fairPrice).toBeCloseTo(1 / special.fairProbability, 8);
    }
  });

  it('prices a favourite winning with goals above the naive product', () => {
    const homeOver = specials.find((s) => s.key === 'home-over')!;
    const naive = homeOver.selections.reduce(
      (product, s) => product * selectionProbability(model, s),
      1,
    );
    expect(homeOver.fairProbability).toBeGreaterThan(naive);
  });

  it('accepts a totals line other than 2.5', () => {
    const threeFive = specialsFor(model, { homeTeam: 'Arsenal', awayTeam: 'Chelsea' }, 3.5);
    expect(threeFive.find((s) => s.key === 'home-over')?.label.es).toBe(
      'Gana Arsenal y +3.5 goles',
    );
  });
});
