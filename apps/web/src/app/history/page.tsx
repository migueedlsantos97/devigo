'use client';

import Link from 'next/link';
import { useEffect, useMemo } from 'react';
import { formatOdds, formatPercent, getDictionary, LOCALE_META } from '@devigo/i18n';
import { AccountBox } from '@/components/account-box';
import { CurrencySelect } from '@/components/currency-select';
import { ThemeToggle } from '@/components/theme-toggle';
import { InfoTip } from '@/components/info-tip';
import { LangSwitch } from '@/components/lang-switch';
import { Wordmark } from '@/components/logo';
import { formatCurrency, useCurrency } from '@/lib/currency';
import { realizedProfit, useHistory, type SavedTicket, type TicketStatus } from '@/lib/history';
import { useLocale } from '@/lib/locale';
import type { OddsFeedResponse } from '@/lib/markets';

const STATUS_STYLE: Record<TicketStatus, { color: string; border: string }> = {
  pending: { color: 'var(--text-2)', border: 'var(--ctrl)' },
  won: { color: 'var(--ev)', border: 'var(--ev-border)' },
  lost: { color: 'var(--danger-text)', border: 'var(--danger-border)' },
  void: { color: 'var(--text-3)', border: 'var(--ctrl)' },
};

export default function HistoryPage() {
  const [locale, setLocale] = useLocale();
  const [currency, setCurrency] = useCurrency(locale);
  const t = getDictionary(locale);
  const { tickets, setStatus, remove, updateClosings } = useHistory();

  useEffect(() => {
    let cancelled = false;
    fetch('/api/odds')
      .then((res) => (res.ok ? (res.json() as Promise<OddsFeedResponse>) : null))
      .then((data) => {
        if (cancelled || !data) return;
        const map = new Map<string, number>();
        for (const market of data.markets) for (const r of market.runners) map.set(r.id, r.price);
        updateClosings(map);
      })
      .catch(() => {
        // feed unreachable — stored closing lines still apply
      });
    return () => {
      cancelled = true;
    };
  }, [updateClosings]);

  const money = (v: number) => formatCurrency(v, currency);
  const pct = (v: number, d = 2) => formatPercent(locale, v, d);
  const num = (v: number) => formatOdds(locale, v);
  const dateFmt = useMemo(
    () => new Intl.DateTimeFormat(LOCALE_META[locale].bcp47, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
    [locale],
  );

  const clvOf = (ticket: SavedTicket): number | null => {
    const values = ticket.legs.flatMap((leg) =>
      leg.closing !== null && leg.closing > 1 ? [leg.price / leg.closing - 1] : [],
    );
    if (!values.length) return null;
    return values.reduce((a, b) => a + b, 0) / values.length;
  };

  const summary = useMemo(() => {
    const staked = tickets.reduce((sum, ticket) => sum + ticket.stake, 0);
    const real = tickets.reduce((sum, ticket) => sum + (realizedProfit(ticket) ?? 0), 0);
    const expected = tickets.reduce((sum, ticket) => sum + ticket.ev * ticket.stake, 0);
    return { staked, real, expected };
  }, [tickets]);

  const clvValues = tickets.map(clvOf).filter((v): v is number => v !== null);
  const clvAvg = clvValues.length ? clvValues.reduce((a, b) => a + b, 0) / clvValues.length : null;

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="sticky top-0 z-20 flex h-[60px] items-center justify-between gap-6 border-b border-edge px-4 backdrop-blur-[12px] md:px-7" style={{ background: 'var(--header-bg)' }}>
        <Link href="/" className="shrink-0"><Wordmark compact /></Link>
        <div className="flex items-center gap-3.5">
          <LangSwitch locale={locale} onChange={setLocale} />
          <CurrencySelect value={currency} onChange={setCurrency} label={t.currencyLabel} />
          <ThemeToggle label={t.themeLabel} />
          <Link href="/panel" className="inline-flex min-h-[36px] shrink-0 items-center whitespace-nowrap rounded-lg bg-ev px-[15px] py-2 text-[12.5px] font-semibold text-ev-on hover:bg-ev-light">
            {t.panelNav.builder}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[860px] px-4 pb-16 pt-8 md:px-6">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="m-0 text-[26px] font-semibold tracking-[-.02em]">{t.history.title}</h1>
          <span className="font-mono text-[11px] text-ink-3">{t.history.summary(tickets.length)}</span>
        </div>

        <div className="mt-5">
          <AccountBox t={t} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5 md:grid-cols-4">
          <div className="rounded-xl border border-edge bg-raised px-4 py-3">
            <div className="text-[10.5px] uppercase tracking-[.05em] text-ink-3">{t.history.totalStaked}</div>
            <div className="mt-1 font-mono text-[19px] font-semibold">{money(summary.staked)}</div>
          </div>
          <div className="rounded-xl border border-edge bg-raised px-4 py-3">
            <div className="text-[10.5px] uppercase tracking-[.05em] text-ink-3">{t.history.realPL}</div>
            <div className="mt-1 font-mono text-[19px] font-semibold" style={{ color: summary.real > 0 ? 'var(--ev)' : summary.real < 0 ? 'var(--danger)' : 'var(--text)' }}>
              {summary.real >= 0 ? '+' : ''}{money(summary.real)}
            </div>
          </div>
          <div className="rounded-xl border border-edge bg-raised px-4 py-3">
            <div className="text-[10.5px] uppercase tracking-[.05em] text-ink-3">{t.history.expectedPL}</div>
            <div className="mt-1 font-mono text-[19px] font-semibold" style={{ color: summary.expected >= 0 ? 'var(--ev)' : 'var(--danger)' }}>
              {summary.expected >= 0 ? '+' : ''}{money(summary.expected)}
            </div>
          </div>
          <div className="rounded-xl border border-edge bg-raised px-4 py-3">
            <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[.05em] text-ink-3">{t.history.clvAvg} <InfoTip tip={t.history.clvHelp} /></div>
            <div className="mt-1 font-mono text-[19px] font-semibold" style={{ color: clvAvg === null ? 'var(--text-4)' : clvAvg >= 0 ? 'var(--ev)' : 'var(--danger)' }}>
              {clvAvg === null ? '—' : (clvAvg >= 0 ? '+' : '') + pct(clvAvg, 2)}
            </div>
          </div>
        </div>

        {tickets.length === 0 && (
          <div className="mt-8 rounded-2xl border border-edge bg-raised px-6 py-10 text-center text-[13px] leading-[1.6] text-ink-3">
            {t.history.empty}
          </div>
        )}

        <div className="mt-5 flex flex-col gap-3">
          {tickets.map((ticket) => {
            const clv = clvOf(ticket);
            const profit = realizedProfit(ticket);
            const style = STATUS_STYLE[ticket.status];
            return (
              <div key={ticket.id} className="rounded-[14px] border border-edge bg-raised">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="rounded-[5px] border px-2 py-[2px] font-mono text-[10px] font-semibold" style={{ color: style.color, borderColor: style.border }}>
                      {t.history[ticket.status === 'pending' ? 'statusPending' : ticket.status === 'won' ? 'statusWon' : ticket.status === 'lost' ? 'statusLost' : 'statusVoid']}
                    </span>
                    <span className="font-mono text-[10.5px] text-ink-4">{t.history.savedAt(dateFmt.format(new Date(ticket.createdAt)))}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {(['won', 'lost', 'pending'] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStatus(ticket.id, s)}
                        className={`min-h-[26px] cursor-pointer rounded-md border px-2 py-[2px] font-mono text-[9.5px] ${
                          ticket.status === s ? 'border-ev-active text-ev' : 'border-ctrl text-ink-3 hover:border-ink-5'
                        }`}
                      >
                        {s === 'won' ? t.history.statusWon : s === 'lost' ? t.history.statusLost : t.history.statusPending}
                      </button>
                    ))}
                    <button type="button" onClick={() => remove(ticket.id)} className="cursor-pointer border-none bg-transparent font-mono text-[9.5px] text-ink-4 hover:text-danger">
                      {t.history.delete}
                    </button>
                  </div>
                </div>
                <div className="flex flex-col px-4 py-1">
                  {ticket.legs.map((leg) => (
                    <div key={leg.runnerId} className="flex items-center justify-between gap-3 border-b border-hairline py-2 last:border-b-0">
                      <div className="min-w-0">
                        <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-[12.5px] font-medium">{leg.label}</span>
                        <span className="block overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[10px] text-ink-3">
                          {leg.matchup}{leg.book ? ` · ${leg.book.toUpperCase()}` : ''}
                        </span>
                      </div>
                      <span className="shrink-0 font-mono text-[13px] font-semibold">{num(leg.price)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-hairline px-4 py-2.5 font-mono text-[11px] text-ink-3">
                  <span>{num(ticket.combined)} <span className="text-ink-4">/ {num(ticket.fairCombined)}</span></span>
                  <span>{formatCurrency(ticket.stake, ticket.currency)}</span>
                  <span style={{ color: ticket.ev >= 0 ? 'var(--ev)' : 'var(--danger)' }}>EV {(ticket.ev >= 0 ? '+' : '') + pct(ticket.ev, 1)}</span>
                  <span>
                    {t.history.clv}{' '}
                    {clv === null ? (
                      <span className="text-ink-4">{t.history.noClv}</span>
                    ) : (
                      <span style={{ color: clv >= 0 ? 'var(--ev)' : 'var(--danger)' }}>{(clv >= 0 ? '+' : '') + pct(clv, 2)}</span>
                    )}
                  </span>
                  {profit !== null && (
                    <span className="ml-auto font-semibold" style={{ color: profit > 0 ? 'var(--ev)' : profit < 0 ? 'var(--danger)' : 'var(--text-2)' }}>
                      {profit >= 0 ? '+' : ''}{formatCurrency(profit, ticket.currency)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <footer className="mt-14 border-t border-hairline pt-5 text-xs text-ink-4">{t.footer.legal}</footer>
      </main>
    </div>
  );
}
