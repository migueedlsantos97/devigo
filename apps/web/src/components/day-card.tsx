'use client';

export function DayCard({
  weekday,
  num,
  numSize,
  count,
  active,
  isToday,
  onClick,
}: {
  weekday: string;
  num: string;
  numSize: '13px' | '19px';
  count: string;
  active: boolean;
  isToday: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex min-w-[84px] flex-none cursor-pointer flex-col items-start gap-[2px] rounded-xl border px-3.5 pb-[9px] pt-2.5 text-left transition-colors hover:border-ink-5"
      style={{ background: active ? 'var(--ev-soft)' : 'var(--raised)', borderColor: active ? 'var(--ev-active)' : 'var(--edge)' }}
    >
      <span className="font-mono text-[10px] tracking-[.08em]" style={{ color: active ? 'var(--ev-light)' : 'var(--text-3)' }}>
        {weekday}
      </span>
      <span className="font-mono font-semibold leading-[1.35]" style={{ fontSize: numSize, color: active ? 'var(--ev)' : 'var(--text)' }}>
        {num}
      </span>
      <span className="font-mono text-[10px]" style={{ color: active ? 'var(--ev-light)' : 'var(--text-4)' }}>
        {count}
      </span>
      {isToday && <span className="absolute right-2.5 top-2.5 h-[5px] w-[5px] rounded-full bg-ev" />}
    </button>
  );
}
