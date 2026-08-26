'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  analyzeTicket,
  bookMargin,
  consensusProbabilities,
  devig,
  simulateTicket,
  survivalCurve,
  type CorrelationMatrix,
  type Leg,
  type SimulationResult,
  type TicketAnalysis,
  type VigMethod,
} from '@devigo/core';
import { LOCALE_META, type Locale } from '@devigo/i18n';
import {
  DEFAULT_BANKROLL,
  DEMO_MARKETS,
  KELLY_MULTIPLIER,
  METHODS,
  MIN_EDGE,
  SIM_BANKROLL,
  type NormalizedMarket,
  type OddsFeedResponse,
} from './markets';

const BANKROLL_KEY = 'devigo:bankroll';

export interface BoardRunner {
  readonly id: string;
  readonly label: string;
  readonly matchup: string;
  readonly price: number;
  /** Bookmaker offering `price` when multiple books are quoted; '' otherwise. */
  readonly book: string;
  /** Exchange commission already discounted from `price` (0 for sportsbooks/demo). */
  readonly commission: number;
  readonly fairProbability: number;
  readonly fairPrice: number;
  readonly edge: number;
}

export interface BoardMarket {
  readonly id: string;
  readonly league: string;
  readonly time: string;
  readonly matchup: string;
  readonly marketName: string;
  readonly margin: number;
  readonly bookCount: number;
  readonly runners: ReadonlyArray<BoardRunner>;
}

export interface HistogramBar {
  readonly heightPct: number;
  readonly profit: boolean;
}

/** All-pairs-equal correlation matrix driven by the panel's single rho slider. */
export const uniformCorrelation = (n: number, rho: number): CorrelationMatrix =>
  Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : rho)));

/**
 * Bins the binary ticket-return distribution exactly as raw draws would land:
 * every simulated outcome is either -stake or stake*(price-1), so bin counts
 * follow directly from the hit rate.
 */
export const histogramBars = (
  sim: SimulationResult,
  stake: number,
  combinedPrice: number,
  bins = 26,
): ReadonlyArray<HistogramBar> => {
  const lo = -stake;
  const hi = stake * (combinedPrice - 1);
  const lossShare = 1 - sim.hitRate;
  const winShare = sim.hitRate;
  const peak = Math.max(lossShare, winShare, Number.MIN_VALUE);
  return Array.from({ length: bins }, (_, i) => {
    const share = i === 0 ? lossShare : i === bins - 1 ? winShare : 0;
    const center = lo + ((i + 0.5) / bins) * (hi - lo);
    return { heightPct: Math.max(2, (share / peak) * 100), profit: center >= 0 };
  });
};

export interface PanelState {
  readonly source: 'live' | 'demo';
  readonly board: ReadonlyArray<BoardMarket>;
  /** Distinct leagues on the full board with their market counts, in board order. */
  readonly leagues: ReadonlyArray<{ league: string; count: number }>;
  readonly leagueFilter: string | null;
  readonly setLeagueFilter: (league: string | null) => void;
  readonly method: VigMethod;
  readonly methodShort: string;
  readonly cycleMethod: () => void;
  readonly selected: ReadonlyArray<string>;
  readonly legs: ReadonlyArray<
    Leg & { matchup: string; book: string; commission: number; manual: boolean; feedPrice: number }
  >;
  /** Override a leg's price with the odds your own book offers (null clears it). */
  readonly setPriceOverride: (id: string, price: number | null) => void;
  readonly toggle: (id: string) => void;
  readonly remove: (id: string) => void;
  readonly clear: () => void;
  readonly autoBuild: () => void;
  readonly stake: number;
  readonly setStake: (v: number) => void;
  readonly corr: number;
  readonly setCorr: (v: number) => void;
  readonly bankroll: number;
  readonly setBankroll: (v: number) => void;
  readonly analysis: TicketAnalysis | null;
  readonly simulation: SimulationResult | null;
  readonly survival: ReadonlyArray<number>;
  readonly histogram: ReadonlyArray<HistogramBar>;
  readonly scannedLines: number;
  readonly valueCount: number;
  readonly avgMargin: number;
}

export const usePanel = (locale: Locale): PanelState => {
  const [markets, setMarkets] = useState<ReadonlyArray<NormalizedMarket>>(DEMO_MARKETS);
  const [source, setSource] = useState<'live' | 'demo'>('demo');
  const [selected, setSelected] = useState<ReadonlyArray<string>>([]);
  const [overrides, setOverrides] = useState<Readonly<Record<string, number>>>({});
  const [stake, setStake] = useState(25);
  const [corr, setCorr] = useState(0);
  const [methodIndex, setMethodIndex] = useState(0);
  const [bankroll, setBankrollState] = useState(DEFAULT_BANKROLL);
  const [leagueFilter, setLeagueFilter] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = Number(window.localStorage.getItem(BANKROLL_KEY));
      if (Number.isFinite(saved) && saved > 0) setBankrollState(saved);
    } catch {
      // storage unavailable
    }
  }, []);

  const setBankroll = (v: number): void => {
    const clean = Number.isFinite(v) && v > 0 ? Math.min(v, 10_000_000) : DEFAULT_BANKROLL;
    setBankrollState(clean);
    try {
      window.localStorage.setItem(BANKROLL_KEY, String(clean));
    } catch {
      // noop
    }
  };

  useEffect(() => {
    let cancelled = false;
    fetch('/api/odds')
      .then((res) => (res.ok ? (res.json() as Promise<OddsFeedResponse>) : null))
      .then((data) => {
        if (cancelled || !data || data.source !== 'live' || data.markets.length === 0) return;
        setMarkets(data.markets);
        setSource('live');
        setSelected([]);
        setOverrides({});
      })
      .catch(() => {
        // feed unreachable — stay on demo fixture
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const method = METHODS[methodIndex % METHODS.length] ?? { key: 'shin' as VigMethod, short: 'SHIN' };

  const board = useMemo<ReadonlyArray<BoardMarket>>(() => {
    const timeFmt = new Intl.DateTimeFormat(LOCALE_META[locale].bcp47, {
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
    return markets.map((mk) => {
      const base = {
        id: mk.id,
        league: mk.league,
        time: timeFmt.format(new Date(mk.startsAt)).toUpperCase(),
        matchup: mk.matchup,
        marketName: mk.marketName[locale],
      };

      if (mk.priceSets.length > 0) {
        // Multi-book market: consensus fair line + line-shopped best price.
        const fair = consensusProbabilities(mk.priceSets, method.key);
        const margin =
          mk.priceSets.reduce((sum, set) => sum + bookMargin(set), 0) / mk.priceSets.length;
        return {
          ...base,
          margin,
          bookCount: mk.books.length,
          runners: mk.runners.map((r, i) => {
            const p = fair[i] ?? 0;
            return {
              id: r.id,
              label: r.label[locale],
              matchup: mk.matchup,
              price: r.price,
              book: r.book,
              commission: r.commission,
              fairProbability: p,
              fairPrice: p > 0 ? 1 / p : 0,
              edge: p * r.price - 1,
            };
          }),
        };
      }

      const fair = devig(
        mk.runners.map((r) => ({ id: r.id, label: r.label[locale], price: r.price })),
        method.key,
      );
      return {
        ...base,
        margin: fair.margin,
        bookCount: 1,
        runners: fair.runners.map((r) => ({
          id: r.id,
          label: r.label,
          matchup: mk.matchup,
          price: r.price,
          book: '',
          commission: 0,
          fairProbability: r.fairProbability,
          fairPrice: r.fairPrice,
          edge: r.fairProbability * r.price - 1,
        })),
      };
    });
  }, [markets, locale, method.key]);

  const allRunners = useMemo(() => board.flatMap((m) => m.runners), [board]);

  const legs = useMemo(
    () =>
      selected.flatMap((id) => {
        const runner = allRunners.find((r) => r.id === id);
        if (!runner) return [];
        const override = overrides[id];
        const manual = typeof override === 'number' && override > 1;
        return [{
          id: runner.id,
          label: runner.label,
          matchup: runner.matchup,
          book: manual ? '' : runner.book,
          commission: manual ? 0 : runner.commission,
          manual,
          price: manual ? override : runner.price,
          feedPrice: runner.price,
          fairProbability: runner.fairProbability,
        }];
      }),
    [selected, allRunners, overrides],
  );

  const correlation = useMemo(() => uniformCorrelation(legs.length, corr / 100), [legs.length, corr]);

  const analysis = useMemo(
    () => (legs.length ? analyzeTicket(legs, correlation, KELLY_MULTIPLIER) : null),
    [legs, correlation],
  );

  // Deferred inputs keep slider dragging fluid: the 10k-run simulation lags a
  // frame behind the analytic numbers instead of blocking every input event.
  // Only scalars are deferred — the matrix is rebuilt from the CURRENT leg
  // count, otherwise a stale smaller matrix crashes the simulation when a
  // leg is added.
  const deferredStake = useDeferredValue(stake);
  const deferredCorr = useDeferredValue(corr);
  const simulation = useMemo(
    () =>
      legs.length
        ? simulateTicket(legs, {
            iterations: 10_000,
            stake: deferredStake,
            seed: 1337,
            correlation: uniformCorrelation(legs.length, deferredCorr / 100),
            bankroll: SIM_BANKROLL,
          })
        : null,
    [legs, deferredStake, deferredCorr],
  );

  const survival = useMemo(() => (legs.length ? survivalCurve(legs) : []), [legs]);

  const histogram = useMemo(
    () => (analysis && simulation ? histogramBars(simulation, stake, analysis.combinedPrice) : []),
    [analysis, simulation, stake],
  );

  const leagues = useMemo(() => {
    const counts = new Map<string, number>();
    for (const market of board) counts.set(market.league, (counts.get(market.league) ?? 0) + 1);
    return [...counts.entries()].map(([league, count]) => ({ league, count }));
  }, [board]);

  return {
    source,
    board: leagueFilter === null ? board : board.filter((m) => m.league === leagueFilter),
    leagues,
    leagueFilter,
    setLeagueFilter,
    method: method.key,
    methodShort: method.short,
    cycleMethod: () => setMethodIndex((i) => (i + 1) % METHODS.length),
    selected,
    legs,
    toggle: (id) =>
      setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])),
    remove: (id) => setSelected((prev) => prev.filter((x) => x !== id)),
    clear: () => {
      setSelected([]);
      setOverrides({});
    },
    setPriceOverride: (id, price) =>
      setOverrides((prev) => {
        const next = { ...prev };
        if (price === null || !Number.isFinite(price) || price <= 1) delete next[id];
        else next[id] = Math.min(price, 1000);
        return next;
      }),
    autoBuild: () =>
      setSelected(allRunners.filter((r) => r.edge >= MIN_EDGE).slice(0, 4).map((r) => r.id)),
    stake,
    setStake,
    corr,
    setCorr,
    bankroll,
    setBankroll,
    analysis,
    simulation,
    survival,
    histogram,
    scannedLines: board.reduce((sum, m) => sum + m.runners.length * m.bookCount, 0),
    valueCount: allRunners.filter((r) => r.edge >= MIN_EDGE).length,
    avgMargin: board.length ? board.reduce((sum, m) => sum + m.margin, 0) / board.length : 0,
  };
};
