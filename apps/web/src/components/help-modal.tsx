'use client';

import { useEffect, useState } from 'react';
import type { Dictionary } from '@devigo/i18n';

const SEEN_KEY = 'devigo:onboarded';

/** First-visit walkthrough; reopenable from the board header. */
export function useHelpModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(SEEN_KEY) === null) setOpen(true);
    } catch {
      // storage unavailable — don't force the modal
    }
  }, []);

  const close = (): void => {
    setOpen(false);
    try {
      window.localStorage.setItem(SEEN_KEY, '1');
    } catch {
      // noop
    }
  };

  return { open, show: () => setOpen(true), close };
}

export function HelpModal({ t, open, onClose }: { t: Dictionary; open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-5"
      style={{ background: 'var(--overlay)', backdropFilter: 'blur(6px)' }}
      role="dialog"
      aria-modal="true"
      aria-label={t.help.title}
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-[520px] overflow-y-auto rounded-2xl border border-edge bg-raised p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="m-0 text-lg font-semibold tracking-[-.01em]">{t.help.title}</h2>
        <ol className="m-0 mt-4 flex list-none flex-col gap-3 p-0">
          {t.help.steps.map((step, i) => (
            <li key={step.title} className="grid grid-cols-[26px_1fr] gap-3 rounded-xl border border-edge bg-card p-3.5">
              <span className="pt-[2px] font-mono text-[11px] text-ev">{String(i + 1).padStart(2, '0')}</span>
              <span>
                <span className="block text-[13.5px] font-semibold">{step.title}</span>
                <span className="mt-1 block text-[12.5px] leading-[1.55] text-ink-2">{step.body}</span>
              </span>
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full cursor-pointer rounded-[10px] border border-ev bg-ev py-3 text-[13.5px] font-semibold text-ev-on hover:bg-ev-light"
        >
          {t.help.close}
        </button>
      </div>
    </div>
  );
}
