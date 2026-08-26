'use client';

import { useMemo, useState } from 'react';
import {
  analyzeTicket,
  devig,
  simulateTicket,
  survivalCurve,
  type CorrelationMatrix,
  type Leg,
  type SimulationResult,
  type TicketAnalysis,
  type VigMethod,
} from '@devigo/core';
import type { Locale } from '@devigo/i18n';
import { KELLY_MULTIPLIER, MARKETS, METHODS, MIN_EDGE, SIM_BANKROLL } from './markets';

export interface BoardRunner {
  readonly id: string;
  readonly label: string;
  readonly matchup: string;
  readonly price: number;
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
 * Bins the binary ticket-return distribution exactly as the prototype binned
 * its raw draws: every simulated outcome is either -stake or stake*(price-1),
 * so bin counts follow directly from the hit rate.
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
  readonly board: ReadonlyArray<BoardMarket>;
  readonly method: VigMethod;
  readonly methodShort: string;
  readonly cycleMethod: () => void;
  readonly selected: ReadonlyArray<string>;
  readonly legs: ReadonlyArray<Leg & { matchup: string }>;
  readonly toggle: (id: string) => void;
  readonly remove: (id: string) => void;
  readonly clear: () => void;
  readonly autoBuild: () => void;
  readonly stake: number;
  readonly setStake: (v: number) => void;
  readonly corr: number;
  readonly setCorr: (v: number) => void;
  readonly analysis: TicketAnalysis | null;
  readonly simulation: SimulationResult | null;
  readonly survival: ReadonlyArray<number>;
  readonly histogram: ReadonlyArray<HistogramBar>;
  readonly scannedLines: number;
  readonly valueCount: number;
  readonly avgMargin: number;
}

export const usePanel = (locale: Locale): PanelState => {
  const [selected, setSelected] = useState<ReadonlyArray<string>>([]);
  const [stake, setStake] = useState(25);
  const [corr, setCorr] = useState(0);
  const [methodIndex, setMethodIndex] = useState(0);

  const method = METHODS[methodIndex % METHODS.length] ?? { key: 'shin' as VigMethod, short: 'SHIN' };

  const board = useMemo<ReadonlyArray<BoardMarket>>(
    () =>
      MARKETS.map((mk) => {
        const fair = devig(
          mk.runners.map((r) => ({ id: r.id, label: r.label[locale], price: r.price })),
          method.key,
        );
        return {
          id: mk.id,
          league: mk.league,
          time: mk.time[locale],
          matchup: mk.matchup,
          marketName: mk.market[locale],
          margin: fair.margin,
          runners: fair.runners.map((r) => ({
            id: r.id,
            label: r.label,
            matchup: mk.matchup,
            price: r.price,
            fairProbability: r.fairProbability,
            fairPrice: r.fairPrice,
            edge: r.fairProbability * r.price - 1,
          })),
        };
      }),
    [locale, method.key],
  );

  const allRunners = useMemo(() => board.flatMap((m) => m.runners), [board]);

  const legs = useMemo(
    () =>
      selected.flatMap((id) => {
        const runner = allRunners.find((r) => r.id === id);
        if (!runner) return [];
        return [{
          id: runner.id,
          label: runner.label,
          matchup: runner.matchup,
          price: runner.price,
          fairProbability: runner.fairProbability,
        }];
      }),
    [selected, allRunners],
  );

  const correlation = useMemo(() => uniformCorrelation(legs.length, corr / 100), [legs.length, corr]);

  const analysis = useMemo(
    () => (legs.length ? analyzeTicket(legs, correlation, KELLY_MULTIPLIER) : null),
    [legs, correlation],
  );

  const simulation = useMemo(
    () =>
      legs.length
        ? simulateTicket(legs, { iterations: 10_000, stake, seed: 1337, correlation, bankroll: SIM_BANKROLL })
        : null,
    [legs, stake, correlation],
  );

  const survival = useMemo(() => (legs.length ? survivalCurve(legs) : []), [legs]);

  const histogram = useMemo(
    () => (analysis && simulation ? histogramBars(simulation, stake, analysis.combinedPrice) : []),
    [analysis, simulation, stake],
  );

  return {
    board,
    method: method.key,
    methodShort: method.short,
    cycleMethod: () => setMethodIndex((i) => (i + 1) % METHODS.length),
    selected,
    legs,
    toggle: (id) =>
      setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])),
    remove: (id) => setSelected((prev) => prev.filter((x) => x !== id)),
    clear: () => setSelected([]),
    autoBuild: () =>
      setSelected(allRunners.filter((r) => r.edge >= MIN_EDGE).slice(0, 4).map((r) => r.id)),
    stake,
    setStake,
    corr,
    setCorr,
    analysis,
    simulation,
    survival,
    histogram,
    scannedLines: allRunners.length * 14,
    valueCount: allRunners.filter((r) => r.edge >= MIN_EDGE).length,
    avgMargin: board.reduce((sum, m) => sum + m.margin, 0) / board.length,
  };
};
