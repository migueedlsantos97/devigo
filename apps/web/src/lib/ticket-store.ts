'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  analyzeTicket,
  bookMargin,
  buildTicketForTarget,
  consensusProbabilities,
  devig,
  simulateTicket,
  survivalCurve,
  type BuildMode,
  type CorrelationMatrix,
  type Leg,
  type SimulationResult,
  type TicketAnalysis,
  type VigMethod,
} from '@devigo/core';
import { LOCALE_META, type Locale } from '@devigo/i18n';
import { localDateKey } from './date-groups';
import { recordFairProbabilities, sparklineFor, type Sparkline } from './price-history';
import {
  DEFAULT_BANKROLL,
  DEMO_MARKETS,
  METHODS,
  MIN_EDGE,
  SAME_MATCH_RHO,
  SIM_BANKROLL,
  sportOf,
  STYLE_CONFIG,
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
  readonly sport: string;
  readonly time: string;
  /** Raw kickoff timestamp — used to group/filter the board by calendar day. */
  readonly startsAt: string;
  readonly matchup: string;
  readonly marketName: string;
  readonly margin: number;
  readonly bookCount: number;
  readonly runners: ReadonlyArray<BoardRunner>;
  /** Observed movement of the favourite's fair probability; null until 3 samples exist. */
  readonly spark: (Sparkline & { label: string }) | null;
}

export interface HistogramBar {
  readonly heightPct: number;
  readonly profit: boolean;
}

/** All-pairs-equal correlation matrix — used only by the /scan page's what-if slider. */
export const uniformCorrelation = (n: number, rho: number): CorrelationMatrix =>
  Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : rho)));

/**
 * Correlation is inferred from the selections, not a user-tunable slider: legs
 * that share a matchup hang on the same result and get a fixed pairwise rho;
 * legs from different matchups are independent. Returns the shared matchup
 * name too, for the plain-language note explaining why (or why not) legs are linked.
 */
export const matchupCorrelation = (
  matchups: ReadonlyArray<string>,
): { matrix: CorrelationMatrix; sharedMatchup: string | null } => {
  const n = matchups.length;
  const counts = new Map<string, number>();
  for (const m of matchups) counts.set(m, (counts.get(m) ?? 0) + 1);
  const sharedMatchup = [...counts.entries()].find(([, count]) => count > 1)?.[0] ?? null;
  const matrix = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => {
      if (i === j) return 1;
      return sharedMatchup !== null && matchups[i] === matchups[j] ? SAME_MATCH_RHO : 0;
    }),
  );
  return { matrix, sharedMatchup };
};

/**
 * Bins the binary ticket-return distribution exactly as raw draws would land:
 * every simulated outcome is either -stake or stake*(price-1), so bin counts
 * follow directly from the hit rate. Used by /scan; the panel shows a plain
 * win/lose split instead of a histogram.
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

export type BuildStatus = 'idle' | 'built' | 'short' | 'none';

export interface PanelState {
  readonly source: 'live' | 'demo';
  readonly board: ReadonlyArray<BoardMarket>;
  /** Distinct sports on the board (day-filtered) with counts, in first-seen order. */
  readonly sports: ReadonlyArray<{ sport: string; count: number }>;
  readonly sportFilter: string | null;
  readonly setSportFilter: (sport: string | null) => void;
  /** Competitions within the selected sport (day-filtered); empty unless the sport has more than one. */
  readonly leagues: ReadonlyArray<{ league: string; count: number }>;
  readonly leagueFilter: string | null;
  readonly setLeagueFilter: (league: string | null) => void;
  /** Distinct local calendar days (sport+competition-filtered) with counts, sorted ascending. */
  readonly dates: ReadonlyArray<{ date: string; count: number }>;
  readonly dateFilter: string | null;
  readonly setDateFilter: (date: string | null) => void;
  readonly method: VigMethod;
  readonly cycleMethod: () => void;
  readonly style: BuildMode;
  readonly setStyle: (mode: BuildMode) => void;
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
  /** Builds a parlay from the visible board aiming for a target profit, in the current style. */
  readonly buildForGoal: (targetProfit: number) => void;
  readonly buildStatus: BuildStatus;
  readonly stake: number;
  readonly setStake: (v: number) => void;
  /** Matchup shared by two or more selected legs, if any — drives the correlation note. */
  readonly sharedMatchup: string | null;
  readonly bankroll: number;
  readonly setBankroll: (v: number) => void;
  readonly analysis: TicketAnalysis | null;
  readonly simulation: SimulationResult | null;
  readonly survival: ReadonlyArray<number>;
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
  const [methodIndex, setMethodIndex] = useState(0);
  const [style, setStyle] = useState<BuildMode>('balanced');
  const [bankroll, setBankrollState] = useState(DEFAULT_BANKROLL);
  const [sportFilter, setSportFilterState] = useState<string | null>(null);
  const [leagueFilter, setLeagueFilterState] = useState<string | null>(null);
  const [dateFilter, setDateFilterState] = useState<string | null>(null);
  const [buildStatus, setBuildStatus] = useState<BuildStatus>('idle');

  const setSportFilter = (sport: string | null): void => {
    setSportFilterState(sport);
    setLeagueFilterState(null);
  };
  const setLeagueFilter = (league: string | null): void => setLeagueFilterState(league);
  const setDateFilter = (date: string | null): void => {
    setDateFilterState(date);
    setSportFilterState(null);
    setLeagueFilterState(null);
  };

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

  const method: VigMethod = METHODS[methodIndex % METHODS.length] ?? 'shin';

  const rawBoard = useMemo<ReadonlyArray<BoardMarket>>(() => {
    const timeFmt = new Intl.DateTimeFormat(LOCALE_META[locale].bcp47, {
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
    const priced = markets.map((mk) => {
      const base = {
        id: mk.id,
        league: mk.league,
        sport: sportOf(mk.league),
        time: timeFmt.format(new Date(mk.startsAt)).toUpperCase(),
        startsAt: mk.startsAt,
        matchup: mk.matchup,
        marketName: mk.marketName[locale],
      };

      if (mk.priceSets.length > 0) {
        // Multi-book market: consensus fair line + line-shopped best price.
        const fair = consensusProbabilities(mk.priceSets, method);
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
        method,
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

    // Record this reading, then draw each market's favourite from the history
    // THIS device has observed. No history yet means no line — never a fake one.
    const store = recordFairProbabilities(
      priced.flatMap((mk) => mk.runners.map((r) => ({ runnerId: r.id, fairProbability: r.fairProbability }))),
    );
    return priced.map((mk) => {
      const favourite = mk.runners.reduce((a, b) => (a.fairProbability > b.fairProbability ? a : b));
      const line = sparklineFor(store, favourite.id);
      return { ...mk, spark: line === null ? null : { ...line, label: favourite.label } };
    });
  }, [markets, locale, method]);

  // Legs already on the ticket must keep resolving even after the board filters
  // change, so lookups for the ticket itself always go through the FULL board.
  const rawRunners = useMemo(() => rawBoard.flatMap((m) => m.runners), [rawBoard]);

  const legs = useMemo(
    () =>
      selected.flatMap((id) => {
        const runner = rawRunners.find((r) => r.id === id);
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
    [selected, rawRunners, overrides],
  );

  const { matrix: correlation, sharedMatchup } = useMemo(
    () => matchupCorrelation(legs.map((l) => l.matchup)),
    [legs],
  );

  const kellyMultiplier = STYLE_CONFIG[style].kellyMultiplier;

  const analysis = useMemo(
    () => (legs.length ? analyzeTicket(legs, correlation, kellyMultiplier) : null),
    [legs, correlation, kellyMultiplier],
  );

  // Deferred stake keeps the amount field fluid: the 10k-run simulation lags a
  // frame behind the analytic numbers instead of blocking every keystroke.
  const deferredStake = useDeferredValue(stake);
  const simulation = useMemo(
    () =>
      legs.length
        ? simulateTicket(legs, {
            iterations: 10_000,
            stake: deferredStake,
            seed: 1337,
            correlation,
            bankroll: SIM_BANKROLL,
          })
        : null,
    [legs, deferredStake, correlation],
  );

  const survival = useMemo(() => (legs.length ? survivalCurve(legs) : []), [legs]);

  // Sport/competition/date are faceted filters: each list's counts reflect the
  // OTHER active filters, so a chip never advertises games the board can't show.
  const byDate = (list: ReadonlyArray<BoardMarket>): ReadonlyArray<BoardMarket> =>
    dateFilter === null ? list : list.filter((m) => localDateKey(m.startsAt) === dateFilter);
  const bySport = (list: ReadonlyArray<BoardMarket>): ReadonlyArray<BoardMarket> =>
    sportFilter === null ? list : list.filter((m) => m.sport === sportFilter);

  const sports = useMemo(() => {
    const counts = new Map<string, number>();
    for (const market of byDate(rawBoard)) counts.set(market.sport, (counts.get(market.sport) ?? 0) + 1);
    return [...counts.entries()].map(([sport, count]) => ({ sport, count }));
  }, [rawBoard, dateFilter]);

  const leagues = useMemo(() => {
    if (sportFilter === null) return [];
    const counts = new Map<string, number>();
    for (const market of byDate(bySport(rawBoard))) counts.set(market.league, (counts.get(market.league) ?? 0) + 1);
    const list = [...counts.entries()].map(([league, count]) => ({ league, count }));
    return list.length > 1 ? list : [];
  }, [rawBoard, sportFilter, dateFilter]);

  const dates = useMemo(() => {
    const scoped = leagueFilter === null ? bySport(rawBoard) : bySport(rawBoard).filter((m) => m.league === leagueFilter);
    const counts = new Map<string, number>();
    for (const market of scoped) {
      const key = localDateKey(market.startsAt);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, count]) => ({ date, count }));
  }, [rawBoard, sportFilter, leagueFilter]);

  const visibleBoard = useMemo(() => {
    let list = rawBoard;
    if (sportFilter !== null) list = list.filter((m) => m.sport === sportFilter);
    if (leagueFilter !== null) list = list.filter((m) => m.league === leagueFilter);
    if (dateFilter !== null) list = list.filter((m) => localDateKey(m.startsAt) === dateFilter);
    return list;
  }, [rawBoard, sportFilter, leagueFilter, dateFilter]);

  const visibleRunners = useMemo(() => visibleBoard.flatMap((m) => m.runners), [visibleBoard]);

  return {
    source,
    board: visibleBoard,
    sports,
    sportFilter,
    setSportFilter,
    leagues,
    leagueFilter,
    setLeagueFilter,
    dates,
    dateFilter,
    setDateFilter,
    method,
    cycleMethod: () => setMethodIndex((i) => (i + 1) % METHODS.length),
    style,
    setStyle: (mode) => setStyle(mode),
    selected,
    legs,
    toggle: (id) => {
      setBuildStatus('idle');
      setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    },
    remove: (id) => {
      setBuildStatus('idle');
      setSelected((prev) => prev.filter((x) => x !== id));
    },
    clear: () => {
      setSelected([]);
      setOverrides({});
      setBuildStatus('idle');
    },
    setPriceOverride: (id, price) =>
      setOverrides((prev) => {
        const next = { ...prev };
        if (price === null || !Number.isFinite(price) || price <= 1) delete next[id];
        else next[id] = Math.min(price, 1000);
        return next;
      }),
    autoBuild: () =>
      setSelected(visibleRunners.filter((r) => r.edge >= MIN_EDGE).slice(0, 4).map((r) => r.id)),
    buildForGoal: (targetProfit) => {
      const cfg = STYLE_CONFIG[style];
      const candidates = visibleBoard.flatMap((market) =>
        market.runners
          .filter((r) => r.fairProbability >= cfg.minLegProb && r.edge >= cfg.minEdge)
          .map((r) => ({ id: r.id, marketKey: market.id, price: r.price, fairProbability: r.fairProbability })),
      );
      if (candidates.length === 0) {
        setSelected([]);
        setBuildStatus('none');
        return;
      }
      const targetPrice = Number.isFinite(targetProfit) && targetProfit > 0 ? 1 + targetProfit / stake : 1.01;
      const result = buildTicketForTarget(candidates, targetPrice, cfg.maxLegs, style);
      setSelected(result.legIds);
      setBuildStatus(result.legIds.length === 0 ? 'none' : result.reached ? 'built' : 'short');
    },
    buildStatus,
    stake,
    setStake,
    sharedMatchup,
    bankroll,
    setBankroll,
    analysis,
    simulation,
    survival,
    scannedLines: visibleBoard.reduce((sum, m) => sum + m.runners.length * m.bookCount, 0),
    valueCount: visibleRunners.filter((r) => r.edge >= MIN_EDGE).length,
    avgMargin: visibleBoard.length ? visibleBoard.reduce((sum, m) => sum + m.margin, 0) / visibleBoard.length : 0,
  };
};
