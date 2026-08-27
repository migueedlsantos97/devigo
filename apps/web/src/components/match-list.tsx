'use client';

import { Check, Info, Search } from 'lucide-react';
import type { BoardCopy, Locale } from '@devigo/i18n';
import { formatPercent } from '@devigo/i18n';
import { TeamCrest } from '@/components/team-crest';
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

export function MatchList({
  matches,
  selected,
  focused,
  locale,
  copy,
  query,
  onQuery,
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
  onToggle: (eventId: string) => void;
  onFocus: (eventId: string) => void;
}) {
  const byLeague = matches.reduce<Map<string, MatchRow[]>>((groups, match) => {
    const group = groups.get(match.league) ?? [];
    group.push(match);
    groups.set(match.league, group);
    return groups;
  }, new Map());

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] font-semibold">{copy.pick}</span>
        <span className="text-[11px] text-ink-5">{copy.pickedCount(selected.length)}</span>
      </div>

      <label className="flex min-h-[46px] panel:min-h-[40px] items-center gap-2 rounded-[9px] border border-edge bg-sunken px-2.5 focus-within:border-ink-5">
        <Search size={14} className="shrink-0 text-ink-5" aria-hidden />
        <input
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder={copy.search}
          className="min-w-0 flex-1 self-stretch bg-transparent text-[12.5px] outline-none placeholder:text-ink-5"
        />
      </label>

      <div className="overflow-hidden rounded-[14px] border border-edge bg-raised">
        {[...byLeague.entries()].map(([league, group]) => (
          <div key={league}>
            <div className="border-b border-hairline bg-sunken px-3.5 py-2">
              <span className="text-[10.5px] uppercase tracking-[0.08em] text-ink-5">{league}</span>
            </div>
            {group.map((match) => {
              const picked = selected.includes(match.eventId);
              return (
                <button
                  key={match.eventId}
                  type="button"
                  onClick={() => onToggle(match.eventId)}
                  onFocus={() => onFocus(match.eventId)}
                  aria-pressed={picked}
                  className={`flex w-full min-h-[56px] items-center gap-3 border-b border-hairline px-3.5 py-3 text-left transition-colors last:border-b-0 ${
                    picked ? 'bg-ev-brand' : match.eventId === focused ? 'bg-btn' : 'hover:bg-btn'
                  }`}
                >
                  <span
                    className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border ${
                      picked ? 'border-ev bg-ev text-ev-on' : 'border-ctrl-strong'
                    }`}
                  >
                    {picked && <Check size={12} strokeWidth={3} aria-hidden />}
                  </span>

                  <span className="flex shrink-0 items-center gap-1">
                    <TeamCrest team={match.homeTeam} size={18} />
                    <TeamCrest team={match.awayTeam} size={18} />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-medium">{match.matchup}</span>
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
        ))}
      </div>

      <p className="m-0 flex items-start gap-2 rounded-[9px] border border-edge px-3 py-2.5 text-[11px] leading-[1.55] text-ink-3">
        <Info size={13} className="mt-px shrink-0 text-ink-5" aria-hidden />
        {copy.takeHelp}
      </p>
    </div>
  );
}
