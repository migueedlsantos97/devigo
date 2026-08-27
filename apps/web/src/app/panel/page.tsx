'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { CircleAlert } from 'lucide-react';
import { getBoardCopy, getDictionary } from '@devigo/i18n';
import { CurrencySelect } from '@/components/currency-select';
import { LangSwitch } from '@/components/lang-switch';
import { Wordmark } from '@/components/logo';
import { MatchList } from '@/components/match-list';
import { SpecialsList } from '@/components/specials-list';
import { ThemeToggle } from '@/components/theme-toggle';
import { TicketPanel } from '@/components/ticket-panel';
import { TicketSheet } from '@/components/ticket-sheet';
import { formatCurrency, useCurrency } from '@/lib/currency';
import { useHistory } from '@/lib/history';
import { useLocale } from '@/lib/locale';
import { useIsWide } from '@/lib/media';
import { DEFAULT_BANKROLL } from '@/lib/markets';
import { useMatchBoard } from '@/lib/match-store';

/** Cash amounts a person actually types, not a slider nobody drags. */
const STAKE_STEPS: ReadonlyArray<number> = [100, 200, 500, 1000];

export default function PanelPage() {
  const [locale, setLocale] = useLocale();
  const [currency, setCurrency] = useCurrency(locale);
  const t = getDictionary(locale);
  const copy = getBoardCopy(locale);
  const board = useMatchBoard();
  const history = useHistory();

  const [query, setQuery] = useState('');
  const [stake, setStake] = useState(200);
  const [saved, setSaved] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const wide = useIsWide();

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length === 0) return board.matches;
    return board.matches.filter((match) =>
      `${match.matchup} ${match.league}`.toLowerCase().includes(needle),
    );
  }, [board.matches, query]);

  const saveTicket = (): void => {
    const ticket = board.ticket;
    if (!ticket) return;
    history.save({
      stake,
      currency,
      method: 'shin',
      // Legs come from different matches, so the ticket carries no correlation
      // of its own; what correlation there is lives inside the specials list.
      corr: 0,
      source: 'live',
      combined: ticket.price,
      fairCombined: ticket.fairPrice,
      ev: ticket.probability * ticket.price - 1,
      edge: ticket.edge,
      legs: ticket.legs.map((leg) => ({
        runnerId: leg.key,
        label: leg.label[locale],
        matchup: leg.matchup,
        book: leg.book,
        price: leg.price,
        fairPrice: 1 / leg.fairProbability,
        closing: null,
      })),
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  // Built once and placed either in the third column or inside the phone's
  // sheet: same panel, one copy in the accessibility tree.
  const ticketPanel = (
    <TicketPanel
      ticket={board.ticket}
      objective={board.objective}
      onObjective={board.setObjective}
      stake={stake}
      onStake={setStake}
      stakeSteps={STAKE_STEPS}
      bankroll={DEFAULT_BANKROLL}
      currency={currency}
      locale={locale}
      copy={copy}
      onSave={saveTicket}
      saved={saved}
    />
  );

  return (
    <main className="min-h-screen bg-canvas text-ink">
      <header
        className="sticky top-0 z-20 flex min-h-[56px] flex-wrap items-center gap-x-4 gap-y-2 border-b border-edge px-4 py-2 backdrop-blur-[12px] md:px-6"
        style={{ background: 'var(--header-bg)' }}
      >
        <Link href="/" className="flex min-h-[44px] items-center no-underline">
          <Wordmark compact />
        </Link>
        <nav className="flex gap-0.5">
          <span className="flex min-h-[44px] items-center rounded-[7px] bg-btn px-3 text-[12.5px]">{t.panelNav.builder}</span>
          <Link href="/scan" className="flex min-h-[44px] items-center rounded-[7px] px-3 text-[12.5px] text-ink-3 no-underline hover:text-ink">
            {t.panelNav.scanner}
          </Link>
          <Link href="/history" className="flex min-h-[44px] items-center rounded-[7px] px-3 text-[12.5px] text-ink-3 no-underline hover:text-ink">
            {t.panelNav.history}
          </Link>
        </nav>

        <div className="flex-1" />

        <span className="hidden items-center gap-2 sm:flex">
          <span className="text-[11px] text-ink-3">{t.bankrollLabel}</span>
          <span className="font-mono text-[12.5px] text-ink-bright">
            {formatCurrency(DEFAULT_BANKROLL, currency)}
          </span>
        </span>
        <FeedBadge state={board.feed} live={t.feedLive} loading={t.feedLoading} books={board.matches.length} />
        <CurrencySelect value={currency} onChange={setCurrency} label={t.currencyLabel} />
        <LangSwitch locale={locale} onChange={setLocale} />
        <ThemeToggle label={t.panelNav.bankroll} />
      </header>

      {board.feed === 'quota' || board.feed === 'unavailable' ? (
        <FeedProblem
          title={board.feed === 'quota' ? t.feedQuota : t.feedUnavailable}
          body={board.feed === 'quota' ? t.feedQuotaBody : t.feedUnavailableBody}
        />
      ) : (
        <>
          <div
            className="grid grid-cols-1 gap-4 px-4 py-4 md:px-6 panel:grid-cols-[380px_minmax(0,1fr)_360px]"
            // Room for the sheet's collapsed bar, so the last match in the list
            // is reachable rather than parked underneath it.
            style={{ paddingBottom: wide ? undefined : 'calc(76px + env(safe-area-inset-bottom))' }}
          >
            <MatchList
              matches={visible}
              selected={board.selected}
              focused={board.focused}
              locale={locale}
              copy={copy}
              query={query}
              onQuery={setQuery}
              onToggle={board.toggle}
              onFocus={board.focus}
            />

            <div className="min-w-0">
              {board.focusedMatch && board.focusedModel ? (
                <SpecialsList
                  match={board.focusedMatch}
                  specials={board.specials}
                  locale={locale}
                  copy={copy}
                />
              ) : (
                <div className="rounded-[14px] border border-dashed border-edge px-4 py-10 text-center">
                  <p className="m-0 text-[13px] font-medium">{copy.emptyTitle}</p>
                  <p className="m-0 mt-1.5 text-[12px] leading-[1.55] text-ink-3">{copy.emptyBody}</p>
                </div>
              )}
            </div>

            {wide && ticketPanel}
          </div>

          {!wide && (
            <TicketSheet
              ticket={board.ticket}
              open={sheetOpen}
              onOpenChange={setSheetOpen}
              stake={stake}
              currency={currency}
              locale={locale}
              copy={copy}
            >
              {ticketPanel}
            </TicketSheet>
          )}
        </>
      )}
    </main>
  );
}

function FeedBadge({
  state,
  live,
  loading,
  books,
}: {
  state: ReturnType<typeof useMatchBoard>['feed'];
  live: string;
  loading: string;
  books: number;
}) {
  if (state === 'loading') {
    return <span className="text-[11px] text-ink-3">{loading}</span>;
  }
  if (state !== 'live') return null;
  return (
    <span className="flex items-center gap-1.5 rounded-[7px] border border-edge px-2.5 py-1">
      <span className="h-1.5 w-1.5 rounded-full bg-ev" aria-hidden />
      <span className="text-[11px] text-ink-2">
        {live} · {books}
      </span>
    </span>
  );
}

function FeedProblem({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto max-w-[520px] px-4 py-16 text-center">
      <span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-edge">
        <CircleAlert size={20} className="text-risk" aria-hidden />
      </span>
      <h1 className="m-0 text-[16px] font-semibold">{title}</h1>
      <p className="m-0 mt-2 text-[13px] leading-[1.6] text-ink-3">{body}</p>
    </div>
  );
}
