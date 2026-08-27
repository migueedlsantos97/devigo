'use client';

import { Check, CircleAlert } from 'lucide-react';
import type { BoardCopy, Locale } from '@devigo/i18n';
import { formatOdds, formatPercent } from '@devigo/i18n';
import type { Objective } from '@/lib/builder';
import type { BuiltTicket } from '@/lib/builder';
import { formatCurrency } from '@/lib/currency';

const OBJECTIVES: ReadonlyArray<Objective> = ['cobrar', 'valor', 'pagar'];

/**
 * The live ticket. Money leads, because that is the question the user actually
 * has; the price, what it is worth, and the gap between them follow, because
 * that is the answer they did not know they needed.
 */
export function TicketPanel({
  ticket,
  objective,
  onObjective,
  stake,
  onStake,
  stakeSteps,
  bankroll,
  currency,
  locale,
  copy,
  onSave,
  saved,
}: {
  ticket: BuiltTicket | null;
  objective: Objective;
  onObjective: (next: Objective) => void;
  stake: number;
  onStake: (next: number) => void;
  stakeSteps: ReadonlyArray<number>;
  bankroll: number;
  currency: string;
  locale: Locale;
  copy: BoardCopy;
  onSave: () => void;
  saved: boolean;
}) {
  const money = (value: number): string => formatCurrency(value, currency);
  const positive = ticket !== null && ticket.edge > 0;

  /**
   * Quarter Kelly on a thin edge over a long parlay lands below the smallest
   * coin anyone can bet. Printing it — and how many hundreds of times over the
   * user's stake is — reads as a rounding artefact, not as advice. Under a
   * unit of currency the honest answer is that there is no stake to suggest.
   */
  const raw = ticket === null ? 0 : bankroll * ticket.kelly;
  const suggested = raw >= 1 ? raw : null;

  /**
   * Three verdicts, not two. An edge that exists but cannot carry a stake is
   * neither a green light nor a red one, and calling it green had the panel
   * contradicting itself: "pays more than it is worth", directly above "the
   * model does not recommend betting it".
   */
  const good = positive && suggested !== null;
  const thin = positive && suggested === null;
  const multiple = suggested === null ? 0 : stake / suggested;
  // Only worth saying once the gap is big enough to be a decision, not noise.
  const overstaked = multiple >= 1.5 ? copy.overStake(formatOdds(locale, multiple)) : '';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {OBJECTIVES.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onObjective(key)}
            aria-pressed={objective === key}
            title={copy.objectives[key].hint}
            className={`min-h-[44px] panel:min-h-[36px] cursor-pointer rounded-[9px] border px-4 panel:px-3.5 text-[12.5px] panel:text-[12px] font-medium transition-colors ${
              objective === key
                ? 'border-ev bg-ev-brand text-ev-text'
                : 'border-edge text-ink-2 hover:border-ctrl-strong'
            }`}
          >
            {copy.objectives[key].label}
          </button>
        ))}
      </div>
      <p className="m-0 text-[11px] leading-[1.5] text-ink-3">{copy.objectives[objective].hint}</p>

      {ticket === null ? (
        <div className="rounded-[14px] border border-dashed border-edge px-4 py-8 text-center">
          <p className="m-0 text-[13px] font-medium">{copy.emptyTitle}</p>
          <p className="m-0 mt-1.5 text-[12px] leading-[1.55] text-ink-3">{copy.emptyBody}</p>
        </div>
      ) : (
        <div
          className={`overflow-hidden rounded-[14px] border bg-raised ${good ? 'border-ev-border' : thin ? 'border-risk-border' : 'border-edge'}`}
        >
          <div className="px-4 pb-3.5 pt-4">
            <div className="text-[11px] text-ink-3">{copy.withStake(money(stake))}</div>
            <div className="mt-1 font-mono text-[28px] font-semibold leading-none tracking-[-0.02em]">
              {money(stake * ticket.price)}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {stakeSteps.map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => onStake(step)}
                  aria-pressed={stake === step}
                  className={`min-h-[44px] panel:min-h-[32px] cursor-pointer rounded-[7px] px-3.5 panel:px-2.5 font-mono text-[12.5px] panel:text-[11.5px] ${
                    stake === step ? 'bg-ctrl text-ink' : 'bg-btn text-ink-3 hover:text-ink'
                  }`}
                >
                  {money(step)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-hairline px-4 py-3">
            <Row label={copy.pays} value={formatOdds(locale, ticket.price)} />
            <Row label={copy.worth} value={formatOdds(locale, ticket.fairPrice)} />
            <div className="flex h-[5px] overflow-hidden rounded-full bg-hairline">
              <span
                className="h-full"
                style={{
                  width: `${Math.min(100, (ticket.fairPrice / ticket.price) * 100)}%`,
                  background: good ? 'var(--ev)' : thin ? 'var(--risk)' : 'var(--danger)',
                }}
              />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] text-ink-2">{positive ? copy.inFavour : copy.against_}</span>
              <span
                className="font-mono text-[16px] font-semibold"
                style={{ color: good ? 'var(--ev)' : thin ? 'var(--risk)' : 'var(--danger)' }}
              >
                {formatPercent(locale, Math.abs(ticket.edge), 1)}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-hairline px-4 py-3">
            <Row label={copy.cashesOne} value={copy.cashesEvery(formatOdds(locale, ticket.fairPrice))} mono={false} />
            <Row label={copy.suggested} value={suggested === null ? '—' : money(suggested)} />
            {/* With no edge at all the red verdict below already says it; a
                second sentence about a thin edge would be describing the wrong
                problem. */}
            {(suggested !== null || thin) && (
              <p className="m-0 text-[10.5px] leading-[1.5] text-ink-5">
                {suggested === null
                  ? copy.noStake
                  : `${copy.kellyNote(money(bankroll))} ${overstaked}`}
              </p>
            )}
          </div>

          <div
            className={`flex items-start gap-2 border-t px-4 py-3 ${
              good
                ? 'border-ev-subtle bg-ev-brand'
                : thin
                  ? 'border-risk-border bg-risk-soft'
                  : 'border-danger-border bg-danger-bg'
            }`}
          >
            {good ? (
              <Check size={14} className="mt-px shrink-0 text-ev" aria-hidden />
            ) : (
              <CircleAlert
                size={14}
                className={`mt-px shrink-0 ${thin ? 'text-risk' : 'text-danger'}`}
                aria-hidden
              />
            )}
            <span
              className="text-[11.5px] leading-[1.6]"
              style={{
                color: good ? 'var(--ev-text)' : thin ? 'var(--risk)' : 'var(--danger-text)',
              }}
            >
              {good
                ? copy.verdictGood
                : thin
                  ? copy.verdictThin
                  : copy.verdictBad(formatPercent(locale, Math.abs(ticket.edge), 1))}
            </span>
          </div>

          <div className="px-4 pb-4 pt-3">
            <button
              type="button"
              onClick={onSave}
              className="min-h-[48px] panel:min-h-[42px] w-full cursor-pointer rounded-[9px] border border-ev bg-ev text-[13.5px] panel:text-[13px] font-semibold text-ev-on hover:bg-ev-light"
            >
              {saved ? '✓' : copy.save}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[12px] text-ink-2">{label}</span>
      <span className={`text-[13.5px] ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}
