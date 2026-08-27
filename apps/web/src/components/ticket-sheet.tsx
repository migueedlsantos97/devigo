'use client';

import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import type { BoardCopy, Locale } from '@devigo/i18n';
import { formatPercent } from '@devigo/i18n';
import type { BuiltTicket } from '@/lib/builder';
import { formatCurrency } from '@/lib/currency';

/**
 * The phone's ticket: a bar pinned to the bottom that opens into the full
 * panel.
 *
 * Collapsed it carries the two numbers worth interrupting someone for — what
 * the ticket returns, and whether the price is in their favour. Everything
 * else is a tap away, which is the right trade on a screen where the match
 * list is what the user is actually working in.
 */
export function TicketSheet({
  ticket,
  open,
  onOpenChange,
  stake,
  currency,
  locale,
  copy,
  children,
}: {
  ticket: BuiltTicket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stake: number;
  currency: string;
  locale: Locale;
  copy: BoardCopy;
  children: ReactNode;
}) {
  const positive = ticket !== null && ticket.edge > 0;

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="cerrar"
          onClick={() => onOpenChange(false)}
          className="fixed inset-0 z-30 cursor-default border-none"
          style={{ background: 'var(--overlay)' }}
        />
      )}

      <div
        className="fixed inset-x-0 bottom-0 z-40 rounded-t-[18px] border-t border-edge bg-raised panel:hidden"
        style={{ boxShadow: '0 -8px 32px -12px rgba(0,0,0,0.5)' }}
      >
        <button
          type="button"
          onClick={() => onOpenChange(!open)}
          aria-expanded={open}
          className="flex min-h-[64px] w-full cursor-pointer items-center gap-3 border-none bg-transparent px-4 py-3 text-left"
        >
          {/* Open, the panel below already leads with the payout, so the bar
              becomes a plain header instead of saying it twice. */}
          {open ? (
            <span className="flex-1 text-[13px] font-semibold">{copy.ticketTitle}</span>
          ) : (
            <span className="flex flex-1 items-center gap-3">
              <span className="min-w-0 flex-1">
                <span className="block text-[10.5px] text-ink-3">
                  {ticket === null ? copy.emptyTitle : copy.withStake(formatCurrency(stake, currency))}
                </span>
                <span className="mt-0.5 block font-mono text-[19px] font-semibold leading-none">
                  {ticket === null ? '—' : formatCurrency(stake * ticket.price, currency)}
                </span>
              </span>

              {ticket !== null && (
                <span className="shrink-0 text-right">
                  <span
                    className="block font-mono text-[15px] font-semibold"
                    style={{ color: positive ? 'var(--ev)' : 'var(--danger)' }}
                  >
                    {formatPercent(locale, Math.abs(ticket.edge), 1)}
                  </span>
                  <span className="block text-[10px] text-ink-5">
                    {positive ? copy.inFavour : copy.against_}
                  </span>
                </span>
              )}
            </span>
          )}

          <ChevronDown
            size={18}
            aria-hidden
            className={`shrink-0 text-ink-3 transition-transform ${open ? '' : 'rotate-180'}`}
          />
        </button>

        {open && (
          <div
            className="max-h-[70vh] overflow-y-auto border-t border-hairline px-4 pb-4 pt-3.5"
            style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
          >
            {children}
          </div>
        )}
      </div>
    </>
  );
}
