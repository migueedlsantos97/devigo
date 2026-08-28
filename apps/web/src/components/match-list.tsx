'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronDown, Info, Search } from 'lucide-react';
import type { BoardCopy, Locale } from '@devigo/i18n';
import { formatPercent } from '@devigo/i18n';
import { TeamCrest } from '@/components/team-crest';
import type { MatchWindow } from '@/lib/date-groups';
import type { MatchRow } from '@/lib/match-store';

/**
 * A book's cut is the one number on the board that is a fact about the market
 * rather than a claim about the result, so it is the number the eye lands on.
 * Green is cheap to play, red is expensive; the thresholds are the ordinary
 * span of football margins, not a judgement about who wins.
 */
const takeColour = (take: number): string =>
  take <= 0.05 ? 'var(--ev)' : take <= 0.08 ? 'var(--risk)' : 'var(--danger)';

const kickoff = (iso: string, locale: Locale): string =>
  new Date(iso).toLocaleTimeString(locale === 'es' ? 'es-UY' : 'en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

const WINDOWS: ReadonlyArray<MatchWindow> = ['today', 'tomorrow', 'threeDays', 'all'];

export function MatchList({
  matches,
  selected,
  focused,
  locale,
  copy,
  query,
  onQuery,
  window,
  onWindow,
  windowCounts,
  onToggle,
  onFocus,
}: {
  matches: ReadonlyArray<MatchRow>;
  selected: ReadonlyArray<string>;
  focused: string | null;
  locale: Locale;
  copy: BoardCopy;
  query: string;
  onQuery: (value: string) => void;
  window: MatchWindow;
  onWindow: (next: MatchWindow) => void;
  windowCounts: Readonly<Record<MatchWindow, number>>;
  onToggle: (eventId: string) => void;
  onFocus: (eventId: string) => void;
}) {
  /**
   * Only the leagues the user has folded away are tracked, so a league that
   * appears later — a new competition in the feed, or one revealed by widening
   * the window — arrives open rather than silently hidden.
   */
  const [folded, setFolded] = useState<ReadonlyArray<string>>([]);

  const byLeague = useMemo(() => {
    const groups = new Map<string, MatchRow[]>();
    for (const match of matches) {
      const group = groups.get(match.league) ?? [];
      group.push(match);
      groups.set(match.league, group);
    }
    return [...groups.entries()];
  }, [matches]);

  const allFolded = folded.length > 0 && folded.length >= byLeague.length;
  const toggleFold = (league: string): void =>
    setFolded((current) =>
      current.includes(league) ? current.filter((name) => name !== league) : [...current, league],
    );

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-semibold">{copy.pick}</span>
        <span className="text-[11px] text-ink-5">{copy.pickedCount(selected.length)}</span>
      </div>

      <div className="scrollbar-none -mx-1 flex gap-1.5 overflow-x-auto px-1">
        {WINDOWS.map((key) => {
          const count = windowCounts[key];
          const active = window === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onWindow(key)}
              aria-pressed={active}
              // An empty window is worth showing as empty rather than hiding:
              // "no matches today" is information, and a chip that vanishes
              // looks like a bug.
              disabled={count === 0 && !active}
              className={`flex min-h-[40px] shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-[12px] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                active
                  ? 'border-ev bg-ev-brand text-ev-text'
                  : 'border-edge text-ink-2 hover:border-ctrl-strong'
              }`}
            >
              {copy.windows[key]}
              <span className="font-mono text-[10.5px] text-ink-5">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <label className="flex min-h-[46px] flex-1 items-center gap-2 rounded-[9px] border border-edge bg-sunken px-2.5 focus-within:border-ink-5 panel:min-h-[40px]">
          <Search size={14} className="shrink-0 text-ink-5" aria-hidden />
          <input
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder={copy.search}
            className="min-w-0 flex-1 self-stretch bg-transparent text-[12.5px] outline-none placeholder:text-ink-5"
          />
        </label>
        {byLeague.length > 1 && (
          <button
            type="button"
            onClick={() => setFolded(allFolded ? [] : byLeague.map(([league]) => league))}
            className="min-h-[46px] shrink-0 cursor-pointer rounded-[9px] border border-edge px-3 text-[11.5px] text-ink-2 hover:border-ctrl-strong panel:min-h-[40px]"
          >
            {allFolded ? copy.expandAll : copy.foldAll}
          </button>
        )}
      </div>

      {byLeague.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-edge px-4 py-8 text-center">
          <p className="m-0 text-[12.5px] text-ink-3">{copy.noMatches}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[14px] border border-edge bg-raised">
          {byLeague.map(([league, group]) => {
            const open = !folded.includes(league);
            const picked = group.filter((match) => selected.includes(match.eventId)).length;
            return (
              <div key={league}>
                <button
                  type="button"
                  onClick={() => toggleFold(league)}
                  aria-expanded={open}
                  className="flex min-h-[44px] w-full cursor-pointer items-center gap-2 border-b border-hairline bg-sunken px-3.5 text-left hover:bg-btn"
                >
                  <ChevronDown
                    size={13}
                    aria-hidden
                    className={`shrink-0 text-ink-5 transition-transform ${open ? '' : '-rotate-90'}`}
                  />
                  <span className="flex-1 truncate text-[10.5px] uppercase tracking-[0.08em] text-ink-5">
                    {league}
                  </span>
                  {/* Folded leagues still say how many picks are inside, so a
                      collapsed section never hides a leg of the ticket. */}
                  {picked > 0 && (
                    <span className="shrink-0 rounded-full bg-ev-brand px-2 py-0.5 font-mono text-[10px] text-ev-text">
                      {picked}
                    </span>
                  )}
                  <span className="shrink-0 font-mono text-[10.5px] text-ink-5">{group.length}</span>
                </button>

                {open &&
                  group.map((match) => {
                    const isPicked = selected.includes(match.eventId);
                    return (
                      <button
                        key={match.eventId}
                        type="button"
                        onClick={() => onToggle(match.eventId)}
                        onFocus={() => onFocus(match.eventId)}
                        aria-pressed={isPicked}
                        className={`flex min-h-[56px] w-full items-center gap-3 border-b border-hairline px-3.5 py-3 text-left transition-colors ${
                          isPicked
                            ? 'bg-ev-brand'
                            : match.eventId === focused
                              ? 'bg-btn'
                              : 'hover:bg-btn'
                        }`}
                      >
                        <span
                          className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border ${
                            isPicked ? 'border-ev bg-ev text-ev-on' : 'border-ctrl-strong'
                          }`}
                        >
                          {isPicked && <Check size={12} strokeWidth={3} aria-hidden />}
                        </span>

                        <span className="flex shrink-0 items-center gap-1">
                          <TeamCrest team={match.homeTeam} size={18} />
                          <TeamCrest team={match.awayTeam} size={18} />
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12.5px] font-medium">
                            {match.matchup}
                          </span>
                          <span className="mt-0.5 flex gap-2.5 text-[11px] text-ink-3">
                            <span className="font-mono">{kickoff(match.startsAt, locale)}</span>
                            <span>{copy.books(match.bookCount)}</span>
                          </span>
                        </span>

                        {match.take !== null && (
                          <span className="shrink-0 text-right">
                            <span
                              className="block font-mono text-[14px] font-semibold"
                              style={{ color: takeColour(match.take) }}
                            >
                              {formatPercent(locale, match.take, 1)}
                            </span>
                            <span className="block text-[10px] text-ink-5">{copy.take}</span>
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>
            );
          })}
        </div>
      )}

      <p className="m-0 flex items-start gap-2 rounded-[9px] border border-edge px-3 py-2.5 text-[11px] leading-[1.55] text-ink-3">
        <Info size={13} className="mt-px shrink-0 text-ink-5" aria-hidden />
        {copy.takeHelp}
      </p>
    </div>
  );
}
