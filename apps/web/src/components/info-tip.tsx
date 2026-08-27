'use client';

/** Small ⓘ marker that reveals an explanation on hover/focus (tap on touch). */
export function InfoTip({ tip }: { tip: string }) {
  return (
    <span className="group relative inline-flex" tabIndex={0}>
      <span
        aria-label={tip}
        className="flex h-[13px] w-[13px] cursor-help items-center justify-center rounded-full border border-ctrl font-mono text-[8.5px] leading-none text-ink-4 group-hover:border-ink-5 group-hover:text-ink-2"
      >
        i
      </span>
      <span className="pointer-events-none absolute bottom-[calc(100%+7px)] left-1/2 z-40 w-[230px] -translate-x-1/2 rounded-[9px] border border-ctrl bg-btn px-3 py-2.5 text-left text-[11.5px] font-normal normal-case leading-[1.5] tracking-normal text-ink-bright opacity-0 shadow-[0_12px_32px_-12px_#000] transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
        {tip}
      </span>
    </span>
  );
}
