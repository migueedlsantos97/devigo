'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ScorelineModel } from '@devigo/core';
import type { FeedStatus, NormalizedMarket, OddsFeedResponse } from './markets';
import {
  fitMatchModel,
  groupMatches,
  houseTake,
  specialsFor,
  type MatchGroup,
  type SpecialQuote,
} from './match-model';
import { buildTicket, candidatesFor, type BuiltTicket, type Objective } from './builder';

export type FeedState = 'loading' | FeedStatus;

export interface MatchRow extends MatchGroup {
  /** Overround left after line shopping, or null when it cannot be known. */
  readonly take: number | null;
  /** Whether a scoreline model can be fitted at all (football with a 1X2). */
  readonly modellable: boolean;
}

const toRow = (match: MatchGroup): MatchRow => ({
  ...match,
  take: houseTake(match),
  modellable: match.result !== null && match.result.runners.length === 3,
});

/**
 * Fitting a match costs tens of milliseconds, so it happens once per fixture
 * and only for the match actually being looked at. Feed reloads clear the
 * cache: a refitted model must come from the prices now on screen.
 */
const useModelCache = (): ((match: MatchGroup | null) => ScorelineModel | null) => {
  const cache = useRef(new Map<string, ScorelineModel | null>());
  return useCallback((match: MatchGroup | null) => {
    if (match === null) return null;
    const hit = cache.current.get(match.eventId);
    if (hit !== undefined) return hit;
    const model = fitMatchModel(match);
    cache.current.set(match.eventId, model);
    return model;
  }, []);
};

export interface MatchBoard {
  readonly feed: FeedState;
  readonly matches: ReadonlyArray<MatchRow>;
  readonly leagues: ReadonlyArray<string>;
  /** Fixtures the user has picked to build from. */
  readonly selected: ReadonlyArray<string>;
  /** The fixture whose specials are on screen. */
  readonly focused: string | null;
  readonly focusedMatch: MatchRow | null;
  readonly focusedModel: ScorelineModel | null;
  readonly specials: ReadonlyArray<SpecialQuote>;
  readonly objective: Objective;
  readonly ticket: BuiltTicket | null;
  readonly toggle: (eventId: string) => void;
  readonly focus: (eventId: string) => void;
  readonly setObjective: (objective: Objective) => void;
  readonly clear: () => void;
}

export const useMatchBoard = (): MatchBoard => {
  const [feed, setFeed] = useState<FeedState>('loading');
  const [markets, setMarkets] = useState<ReadonlyArray<NormalizedMarket>>([]);
  const [selected, setSelected] = useState<ReadonlyArray<string>>([]);
  const [focused, setFocused] = useState<string | null>(null);
  const [objective, setObjective] = useState<Objective>('valor');
  const modelFor = useModelCache();

  useEffect(() => {
    let live = true;
    void fetch('/api/odds')
      .then((response) => (response.ok ? (response.json() as Promise<OddsFeedResponse>) : null))
      .catch(() => null)
      .then((data) => {
        if (!live) return;
        if (!data || data.source !== 'live' || data.markets.length === 0) {
          // Keep the server's reason — 'quota' and 'unavailable' tell the user
          // to do different things, and collapsing them hides which it is.
          setFeed(data?.source === 'quota' ? 'quota' : 'unavailable');
          return;
        }
        setMarkets(data.markets);
        setFeed('live');
      });
    return () => {
      live = false;
    };
  }, []);

  const matches = useMemo(() => groupMatches(markets).map(toRow), [markets]);
  const leagues = useMemo(
    () => [...new Set(matches.map((match) => match.league))],
    [matches],
  );

  const focusedMatch = useMemo(
    () => matches.find((match) => match.eventId === focused) ?? null,
    [matches, focused],
  );
  const focusedModel = modelFor(focusedMatch);
  const specials = useMemo(
    () =>
      focusedModel === null || focusedMatch === null
        ? []
        : specialsFor(focusedModel, focusedMatch, focusedMatch.totals?.totalsLine ?? 2.5),
    [focusedModel, focusedMatch],
  );

  const ticket = useMemo(() => {
    const groups = selected
      .map((id) => matches.find((match) => match.eventId === id))
      .filter((match): match is MatchRow => match !== undefined)
      .map((match) => {
        const model = modelFor(match);
        return model === null ? [] : candidatesFor(match, model);
      });
    return buildTicket(groups, objective);
  }, [selected, matches, objective, modelFor]);

  const toggle = useCallback((eventId: string) => {
    setSelected((current) =>
      current.includes(eventId)
        ? current.filter((id) => id !== eventId)
        : [...current, eventId],
    );
    setFocused(eventId);
  }, []);

  const focus = useCallback((eventId: string) => setFocused(eventId), []);
  const clear = useCallback(() => setSelected([]), []);

  return {
    feed,
    matches,
    leagues,
    selected,
    focused,
    focusedMatch,
    focusedModel,
    specials,
    objective,
    ticket,
    toggle,
    focus,
    setObjective,
    clear,
  };
};
