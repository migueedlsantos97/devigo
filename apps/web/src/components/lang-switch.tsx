'use client';

import { LOCALES, type Locale } from '@devigo/i18n';

export function LangSwitch({ locale, onChange }: { locale: Locale; onChange: (l: Locale) => void }) {
  return (
    <span className="flex shrink-0 rounded-lg border border-ctrl bg-card p-[2px]">
      {LOCALES.map((code) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            onClick={() => onChange(code)}
            className={`min-h-[36px] min-w-[38px] cursor-pointer rounded-md border-none px-[9px] py-1 font-mono text-[10.5px] font-semibold ${
              active ? 'bg-ev text-ev-on' : 'bg-transparent text-ink-3'
            }`}
          >
            {code.toUpperCase()}
          </button>
        );
      })}
    </span>
  );
}
