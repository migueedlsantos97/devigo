'use client';

import { TrendingUp } from 'lucide-react';
import type { BoardCopy, Locale } from '@devigo/i18n';
import { formatOdds, formatPercent } from '@devigo/i18n';
import { TeamCrest } from '@/components/team-crest';
import type { SpecialQuote } from '@/lib/match-model';
import type { MatchRow } from '@/lib/match-store';

/**
 * What each of a book's pre-packaged specials is worth, priced before ever
 * seeing what the book charges. Two numbers a row: what it is worth, and the
 * price at which it becomes worth taking. Anything more and the row stops
 * being readable at a glance, which is the only way this list gets used.
 */
export function SpecialsList({
  match,
  specials,
  locale,
  copy,
}: {
  match: MatchRow;
  specials: ReadonlyArray<SpecialQuote>;
  locale: Locale;
  copy: BoardCopy;
}) {
  return (
    <section className="overflow-hidden rounded-[14px] border border-edge bg-raised">
      <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-3.5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <TeamCrest team={match.homeTeam} size={18} />
            <TeamCrest team={match.awayTeam} size={18} />
            <span className="truncate text-[13.5px] font-semibold">{match.matchup}</span>
          </div>
          <p className="m-0 mt-1 text-[11.5px] leading-[1.5] text-ink-3">{copy.specialsSubtitle}</p>
        </div>
        <span className="shrink-0 text-[11px] text-ink-5">{copy.books(match.bookCount)}</span>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_84px_104px] border-b border-hairline px-4 pb-1.5">
        <span className="text-[10.5px] tracking-[0.06em] text-ink-5">{copy.colSpecial}</span>
        <span className="text-right text-[10.5px] tracking-[0.06em] text-ink-5">{copy.colWorth}</span>
        <span className="text-right text-[10.5px] tracking-[0.06em] text-ink-5">{copy.colTakeIf}</span>
      </div>

      {specials.map((special) => (
        <div
          key={special.key}
          className="grid grid-cols-[minmax(0,1fr)_84px_104px] items-center border-b border-hairline px-4 py-2.5 last:border-b-0"
        >
          <div className="min-w-0 pr-3">
            <div className="truncate text-[12.5px]">{special.label[locale]}</div>
            <div className="mt-0.5 text-[10.5px] text-ink-5">
              {formatPercent(locale, special.fairProbability, 1)} ·{' '}
              {special.lift >= 0 ? copy.together : copy.against}
            </div>
          </div>
          <span className="text-right font-mono text-[13.5px]">
            {formatOdds(locale, special.fairPrice)}
          </span>
          <span className="text-right font-mono text-[13.5px] text-ev">
            {formatOdds(locale, special.threshold)}
          </span>
        </div>
      ))}

      <p className="m-0 flex items-start gap-2 border-t border-hairline bg-sunken px-4 py-3 text-[11px] leading-[1.6] text-ink-2">
        <TrendingUp size={13} className="mt-px shrink-0 text-ink-3" aria-hidden />
        {copy.specialsFooter}
      </p>
    </section>
  );
}
