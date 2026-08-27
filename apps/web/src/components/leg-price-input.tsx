'use client';

import { useEffect, useState } from 'react';

/**
 * Editable leg price: shows the feed price until the user types their own
 * book's odds. Draft state keeps typing fluid; blur with an invalid value
 * clears the override back to the feed price.
 */
export function LegPriceInput({
  feedPrice,
  manual,
  label,
  onOverride,
}: {
  feedPrice: number;
  manual: boolean;
  label: string;
  onOverride: (price: number | null) => void;
}) {
  const [draft, setDraft] = useState(feedPrice.toFixed(2));
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing && !manual) setDraft(feedPrice.toFixed(2));
  }, [feedPrice, manual, editing]);

  return (
    <input
      type="number"
      min={1.01}
      step={0.01}
      value={draft}
      title={label}
      aria-label={label}
      onFocus={() => setEditing(true)}
      onChange={(e) => {
        setDraft(e.target.value);
        const parsed = Number(e.target.value);
        onOverride(Number.isFinite(parsed) && parsed > 1 ? parsed : null);
      }}
      onBlur={() => {
        setEditing(false);
        const parsed = Number(draft);
        if (!Number.isFinite(parsed) || parsed <= 1) {
          onOverride(null);
          setDraft(feedPrice.toFixed(2));
        }
      }}
      className={`w-[62px] rounded-md border bg-transparent px-1.5 py-[3px] text-right font-mono text-[13.5px] font-semibold outline-none [appearance:textfield] focus:border-ink-5 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
        manual ? 'border-risk-border text-risk' : 'border-transparent text-ink hover:border-ctrl'
      }`}
    />
  );
}
