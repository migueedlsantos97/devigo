'use client';

/**
 * Own-brand league marks (official league logos are trademarked): sport glyph
 * plus the league code, colored per sport.
 */
const LEAGUE_META: Record<string, { glyph: string; color: string }> = {
  EPL: { glyph: '⚽', color: 'var(--model)' },
  LALIGA: { glyph: '⚽', color: 'var(--risk)' },
  NBA: { glyph: '🏀', color: 'var(--danger)' },
  NFL: { glyph: '🏈', color: 'var(--sport-nfl)' },
  MLB: { glyph: '⚾', color: 'var(--ev)' },
  ATP: { glyph: '🎾', color: 'var(--sport-mlb)' },
};

const SPORT_META: Record<string, { glyph: string; color: string }> = {
  futbol: { glyph: '⚽', color: 'var(--model)' },
  basket: { glyph: '🏀', color: 'var(--danger)' },
  nfl: { glyph: '🏈', color: 'var(--sport-nfl)' },
  beisbol: { glyph: '⚾', color: 'var(--ev)' },
  tenis: { glyph: '🎾', color: 'var(--sport-mlb)' },
};

export const leagueMeta = (league: string): { glyph: string; color: string } =>
  LEAGUE_META[league] ?? { glyph: '🏟️', color: 'var(--text-2)' };

export const sportMeta = (sport: string): { glyph: string; color: string } =>
  SPORT_META[sport] ?? { glyph: '🏟️', color: 'var(--text-2)' };

export function LeagueChip({
  league,
  count,
  active,
  onClick,
  label,
}: {
  league: string | null;
  count: number;
  active: boolean;
  onClick: () => void;
  label?: string;
}) {
  const meta = league ? leagueMeta(league) : null;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[40px] shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 font-mono text-[11px] font-semibold transition-colors ${
        active
          ? 'border-ev-active bg-ev-deep text-ev'
          : 'border-ctrl bg-card text-ink-2 hover:border-ink-5 hover:text-ink'
      }`}
    >
      {meta && <span aria-hidden="true" className="text-[13px] leading-none">{meta.glyph}</span>}
      {meta && (
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
      )}
      {league ?? label}
      <span className={active ? 'text-ev-light' : 'text-ink-4'}>{count}</span>
    </button>
  );
}
