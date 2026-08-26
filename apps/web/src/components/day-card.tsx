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
      className="relative flex min-w-[84px] flex-none cursor-pointer flex-col items-start gap-[2px] rounded-xl border px-3.5 pb-[9px] pt-2.5 text-left transition-colors hover:border-[#3f3f46]"
      style={{ background: active ? '#0d2a20' : '#101014', borderColor: active ? '#0f9d6e' : '#1c1c21' }}
    >
      <span className="font-mono text-[10px] tracking-[.08em]" style={{ color: active ? '#6ee7b7' : '#71717a' }}>
        {weekday}
      </span>
      <span className="font-mono font-semibold leading-[1.35]" style={{ fontSize: numSize, color: active ? '#34d399' : '#f4f4f5' }}>
        {num}
      </span>
      <span className="font-mono text-[10px]" style={{ color: active ? '#6ee7b7' : '#52525b' }}>
        {count}
      </span>
      {isToday && <span className="absolute right-2.5 top-2.5 h-[5px] w-[5px] rounded-full bg-ev" />}
    </button>
  );
}
