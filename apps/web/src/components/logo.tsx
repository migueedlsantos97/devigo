/** Devigo monogram: the bar strikes the D — the margin, removed. */
export function Monogram({ size = 28 }: { size?: number }) {
  const radius = size >= 28 ? 9 : 8;
  const fontSize = size >= 28 ? 15 : 14;
  const barTop = size >= 28 ? 13.5 : 12.5;
  const inset = size >= 28 ? 5 : 4;
  return (
    <span
      className="relative flex items-center justify-center border border-ev-border bg-ev-brand"
      style={{ width: size, height: size, borderRadius: radius }}
    >
      <span className="font-mono font-semibold leading-none text-ev" style={{ fontSize }}>
        D
      </span>
      <span
        className="absolute h-[1.5px] rounded-[1px] bg-ev"
        style={{ left: inset, right: inset, top: barTop }}
      />
    </span>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5 text-ink">
      <Monogram size={compact ? 26 : 28} />
      <span
        className="font-semibold"
        style={{ fontSize: compact ? 14 : 15, letterSpacing: compact ? '-.01em' : '-.015em' }}
      >
        Devigo
      </span>
    </span>
  );
}
