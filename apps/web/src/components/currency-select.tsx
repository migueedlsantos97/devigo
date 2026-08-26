'use client';

import { CURRENCIES } from '@/lib/currency';

export function CurrencySelect({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (code: string) => void;
  label: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      title={label}
      className="min-h-[30px] shrink-0 cursor-pointer rounded-lg border border-ctrl bg-card px-2 py-1 font-mono text-[11px] text-[#a1a1aa] outline-none hover:border-[#3f3f46] focus:border-[#3f3f46]"
    >
      {CURRENCIES.map((c) => (
        <option key={c.code} value={c.code} className="bg-card text-[#f4f4f5]">
          {c.code}
        </option>
      ))}
    </select>
  );
}
