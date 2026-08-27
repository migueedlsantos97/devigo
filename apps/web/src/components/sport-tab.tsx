'use client';

import { sportMeta } from './league-badge';

/** Underlined tab in the sport strip below the header. */
export function SportTab({
  sport,
  label,
  count,
  active,
  onClick,
}: {
  sport: string | null;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  const meta = sport ? sportMeta(sport) : null;
  const empty = count === 0;
  return (
    <button
      type="button"
      onClick={empty ? undefined : onClick}
      disabled={empty}
      className="flex min-h-[44px] shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap border-none bg-transparent px-3 pb-2.5 pt-3 text-[13px] transition-colors disabled:cursor-default"
      style={{
        borderBottom: `2px solid ${active ? 'var(--ev)' : 'transparent'}`,
        color: empty ? 'var(--text-5)' : active ? 'var(--ev)' : 'var(--text-3)',
        fontWeight: active ? 600 : 400,
      }}
    >
      {meta && <span aria-hidden="true">{meta.glyph}</span>}
      {label}
      <span className="font-mono text-[10.5px]" style={{ color: empty ? 'var(--ctrl-strong)' : active ? 'var(--ev-light)' : 'var(--text-5)' }}>
        {count}
      </span>
    </button>
  );
}
