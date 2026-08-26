'use client';

/**
 * Own-brand league marks (official league logos are trademarked): sport glyph
 * plus the league code, colored per sport.
 */
const LEAGUE_META: Record<string, { glyph: string; color: string }> = {
  EPL: { glyph: '⚽', color: '#38bdf8' },
  LALIGA: { glyph: '⚽', color: '#f59e0b' },
  NBA: { glyph: '🏀', color: '#f43f5e' },
  NFL: { glyph: '🏈', color: '#a78bfa' },
  MLB: { glyph: '⚾', color: '#34d399' },
  ATP: { glyph: '🎾', color: '#a3e635' },
};

export const leagueMeta = (league: string): { glyph: string; color: string } =>
  LEAGUE_META[league] ?? { glyph: '🏟️', color: '#a1a1aa' };

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
      className={`flex min-h-[34px] shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 font-mono text-[11px] font-semibold transition-colors ${
        active
          ? 'border-ev-active bg-ev-deep text-ev'
          : 'border-ctrl bg-card text-[#a1a1aa] hover:border-[#3f3f46] hover:text-[#f4f4f5]'
      }`}
    >
      {meta && <span aria-hidden="true" className="text-[13px] leading-none">{meta.glyph}</span>}
      {meta && (
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
      )}
      {league ?? label}
      <span className={active ? 'text-ev-light' : 'text-[#52525b]'}>{count}</span>
    </button>
  );
}
