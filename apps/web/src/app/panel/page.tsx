'use client';

import Link from 'next/link';
import { useState } from 'react';
import { decimalToAmerican, type BuildMode } from '@devigo/core';
import { formatOdds, formatPercent, getDictionary, LOCALE_META } from '@devigo/i18n';
import { CurrencySelect } from '@/components/currency-select';
import { HelpModal, useHelpModal } from '@/components/help-modal';
import { InfoTip } from '@/components/info-tip';
import { LeagueChip } from '@/components/league-badge';
import { LegPriceInput } from '@/components/leg-price-input';
import { LangSwitch } from '@/components/lang-switch';
import { Wordmark } from '@/components/logo';
import { formatCurrency, useCurrency } from '@/lib/currency';
import { useHistory } from '@/lib/history';
import { useLocale } from '@/lib/locale';
import { KELLY_MULTIPLIER, MIN_EDGE, SIM_BANKROLL } from '@/lib/markets';
import { usePanel } from '@/lib/ticket-store';

const survivalColor = (p: number): string => (p > 0.4 ? '#34d399' : p > 0.15 ? '#f59e0b' : '#f43f5e');

export default function PanelPage() {
  const [locale, setLocale] = useLocale();
  const [currency, setCurrency] = useCurrency(locale);
  const t = getDictionary(locale);
  const panel = usePanel(locale);
  const help = useHelpModal();
  const history = useHistory();
  const [justSaved, setJustSaved] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [goalBuilt, setGoalBuilt] = useState(false);
  const [mode, setMode] = useState<BuildMode>('balanced');
  const { analysis, simulation } = panel;
  const goalAmount = Number(goalInput);
  const hasGoal = Number.isFinite(goalAmount) && goalAmount > 0 && goalBuilt;

  const saveTicket = (): void => {
    if (!analysis) return;
    history.save({
      stake: panel.stake,
      currency,
      method: panel.method,
      corr: panel.corr,
      source: panel.source,
      legs: panel.legs.map((leg) => ({
        runnerId: leg.id,
        label: leg.label,
        matchup: leg.matchup,
        book: leg.book,
        price: leg.price,
        fairPrice: 1 / leg.fairProbability,
        closing: null,
      })),
      combined: analysis.combinedPrice,
      fairCombined: 1 / analysis.jointProbability,
      ev: analysis.expectedValue,
      edge: analysis.edge,
    });
    setJustSaved(true);
    window.setTimeout(() => setJustSaved(false), 2000);
  };

  const num = (v: number) => formatOdds(locale, v);
  const pct = (v: number, d = 2) => formatPercent(locale, v, d);
  const money = (v: number) => formatCurrency(v, currency);
  const intFmt = new Intl.NumberFormat(LOCALE_META[locale].bcp47);

  const good = analysis !== null && analysis.expectedValue > 0;
  const risky = analysis !== null && (analysis.jointProbability < 0.1 || panel.corr >= 30);

  const verdict =
    analysis === null || simulation === null
      ? { text: t.verdict.idle, bg: '#141419', border: '#232329', color: '#a1a1aa' }
      : good
        ? {
            text:
              t.verdict.positive(pct(analysis.edge, 2)) +
              (risky ? t.verdict.heavy(pct(simulation.hitRate, 1)) : t.verdict.sized),
            bg: '#082f24', border: '#0f5c43', color: '#a7f3d0',
          }
        : { text: t.verdict.negative(pct(-analysis.edge, 2)), bg: '#2a1116', border: '#7f1d3a', color: '#fda4af' };

  const kpis = [
    { label: t.board.kpiScanned, value: intFmt.format(panel.scannedLines), color: '#f4f4f5' },
    { label: t.board.kpiValueFound, value: String(panel.valueCount), color: '#34d399' },
    { label: t.board.kpiAvgMargin, value: pct(panel.avgMargin, 2), color: '#f4f4f5' },
    { label: t.board.kpiModel, value: panel.methodShort, color: '#38bdf8' },
  ];

  const americanStr = (price: number): string => {
    const american = Math.round(decimalToAmerican(price));
    return american > 0 ? `+${american}` : String(american);
  };

  return (
    <div className="min-h-screen bg-canvas text-[#f4f4f5]">
      <header className="sticky top-0 z-20 flex h-[60px] items-center justify-between gap-6 border-b border-edge px-4 backdrop-blur-[12px] md:px-7" style={{ background: 'rgba(9,9,11,.88)' }}>
        <div className="flex min-w-0 items-center gap-[26px]">
          <Link href="/" className="shrink-0">
            <Wordmark compact />
          </Link>
          <nav className="hidden gap-[22px] overflow-hidden text-[13px] text-[#71717a] md:flex">
            <span className="whitespace-nowrap font-medium text-[#f4f4f5]">{t.panelNav.builder}</span>
            <Link href="/scan" className="whitespace-nowrap text-[#71717a] hover:text-[#f4f4f5]">{t.panelNav.scanner}</Link>
            <Link href="/history" className="whitespace-nowrap text-[#71717a] hover:text-[#f4f4f5]">{t.panelNav.history}</Link>
            <span className="whitespace-nowrap">{t.panelNav.bankroll}</span>
          </nav>
        </div>
        <div className="flex items-center gap-3.5">
          <div className="hidden shrink-0 items-center gap-[7px] whitespace-nowrap font-mono text-[11px] lg:flex">
            {panel.source === 'live' ? (
              <>
                <span className="dv-pulse h-1.5 w-1.5 rounded-full bg-ev" />
                <span className="text-[#a1a1aa]">{t.feedLive}</span>
              </>
            ) : (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-risk" />
                <span className="text-risk">{t.feedDemo}</span>
              </>
            )}
          </div>
          <LangSwitch locale={locale} onChange={setLocale} />
          <CurrencySelect value={currency} onChange={setCurrency} label={t.currencyLabel} />
          <label className="hidden shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-ctrl py-[5px] pl-2.5 pr-2.5 sm:flex">
            <span className="text-xs text-[#71717a]">{t.bankrollLabel}</span>
            <input
              type="number"
              min={1}
              step={50}
              value={panel.bankroll}
              onChange={(e) => panel.setBankroll(Number(e.target.value))}
              className="w-[84px] border-none bg-transparent text-right font-mono text-xs text-[#f4f4f5] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              aria-label={t.bankrollLabel}
            />
            <span className="font-mono text-xs text-[#71717a]">{currency}</span>
          </label>
        </div>
      </header>

      <div className="grid grid-cols-1 items-start gap-5 p-4 pb-10 panel:grid-cols-[minmax(0,1fr)_400px] md:px-7 md:pt-5">
        <main className="flex min-w-0 flex-col gap-4">
          {panel.leagues.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <LeagueChip
                league={null}
                label={t.board.allLeagues}
                count={panel.leagues.reduce((sum, l) => sum + l.count, 0)}
                active={panel.leagueFilter === null}
                onClick={() => panel.setLeagueFilter(null)}
              />
              {panel.leagues.map((l) => (
                <LeagueChip
                  key={l.league}
                  league={l.league}
                  count={l.count}
                  active={panel.leagueFilter === l.league}
                  onClick={() => panel.setLeagueFilter(panel.leagueFilter === l.league ? null : l.league)}
                />
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="rounded-xl border border-edge bg-raised px-4 py-3.5">
                <div className="text-[11px] uppercase tracking-[.04em] text-[#71717a]">{kpi.label}</div>
                <div className="mt-1.5 font-mono text-[22px] font-semibold" style={{ color: kpi.color }}>{kpi.value}</div>
              </div>
            ))}
          </div>

          <section className="overflow-hidden rounded-[14px] border border-edge bg-raised">
            <div className="flex items-center justify-between gap-4 border-b border-edge px-4 py-3.5 md:px-[18px]">
              <div className="flex min-w-0 items-baseline gap-2.5">
                <h2 className="m-0 text-sm font-semibold">{t.board.title}</h2>
                <span className="hidden overflow-hidden text-ellipsis whitespace-nowrap text-xs text-[#71717a] sm:inline">
                  {t.board.subtitle(t.methods[panel.method])}
                </span>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button
                  type="button"
                  onClick={help.show}
                  className="min-h-[32px] cursor-pointer rounded-[7px] border border-[#27272a] bg-transparent px-2.5 py-1.5 font-mono text-[11px] text-[#71717a] hover:border-[#3f3f46] hover:text-[#f4f4f5]"
                >
                  ?
                </button>
                <button
                  type="button"
                  onClick={panel.cycleMethod}
                  className="min-h-[32px] cursor-pointer rounded-[7px] border border-[#27272a] bg-[#18181b] px-2.5 py-1.5 font-mono text-[11px] text-[#a1a1aa] hover:border-[#3f3f46] hover:text-[#f4f4f5]"
                >
                  {t.board.switchModel}
                </button>
                <button
                  type="button"
                  onClick={panel.autoBuild}
                  className="min-h-[32px] cursor-pointer rounded-[7px] border border-ev bg-ev px-2.5 py-1.5 font-mono text-[11px] font-semibold text-ev-on hover:bg-ev-light"
                >
                  {t.board.autoTicket}
                </button>
              </div>
            </div>

            <div>
              {panel.board.map((market) => (
                <div key={market.id} className="grid grid-cols-1 gap-3 border-b border-hairline px-4 py-3.5 md:grid-cols-[250px_minmax(0,1fr)] md:gap-5 md:px-[18px]">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded border border-[#27272a] px-[5px] py-[1px] font-mono text-[10px] text-[#71717a]">{market.league}</span>
                      <span className="font-mono text-[11px] text-[#52525b]">{market.time}</span>
                    </div>
                    <div className="mt-1.5 text-[13px] font-medium leading-[1.35]">{market.matchup}</div>
                    <div className="mt-[3px] text-[11px] text-[#71717a]">
                      {market.marketName} · {t.board.margin(pct(market.margin, 2))}
                      {market.bookCount > 1 ? ` · ${t.board.books(market.bookCount)}` : ''}
                    </div>
                  </div>
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-2">
                    {market.runners.map((runner) => {
                      const on = panel.selected.includes(runner.id);
                      const value = runner.edge >= MIN_EDGE;
                      const edgeStr = (runner.edge >= 0 ? '+' : '') + pct(runner.edge, 1);
                      return (
                        <button
                          key={runner.id}
                          type="button"
                          onClick={() => panel.toggle(runner.id)}
                          className="flex min-h-[44px] cursor-pointer items-center justify-between gap-2.5 rounded-[10px] border px-3 py-2.5 text-left font-sans text-[#f4f4f5] transition-colors hover:border-[#3f3f46]"
                          style={{ background: on ? '#082f24' : '#141419', borderColor: on ? '#0f9d6e' : value ? '#1f4237' : '#232329' }}
                        >
                          <span className="min-w-0">
                            <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-[12.5px] font-medium">{runner.label}</span>
                            <span className="mt-[3px] block overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[10.5px]" style={{ color: value ? '#34d399' : runner.edge < -0.04 ? '#71717a' : '#a1a1aa' }}>
                              {t.board.detail(num(runner.fairPrice), edgeStr)}
                              {runner.book ? ` · ${runner.book.toUpperCase()}` : ''}
                              {runner.commission > 0 ? ` (−${Math.round(runner.commission * 100)}%)` : ''}
                            </span>
                          </span>
                          <span className="font-mono text-[15px] font-semibold" style={{ color: on ? '#34d399' : '#f4f4f5' }}>
                            {num(runner.price)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>

        <aside className="flex flex-col gap-3.5 panel:sticky panel:top-20">
          <section className="rounded-[14px] border border-edge bg-raised">
            <div className="flex items-center justify-between border-b border-edge px-4 py-3.5">
              <h2 className="m-0 text-sm font-semibold">
                {t.ticket.title} · {panel.legs.length ? t.ticket.legs(panel.legs.length) : t.ticket.emptyLegs}
              </h2>
              <div className="flex items-center gap-3">
                {panel.legs.length > 0 && (
                  <button
                    type="button"
                    onClick={saveTicket}
                    className={`cursor-pointer border-none bg-transparent font-mono text-[10.5px] ${justSaved ? 'text-ev' : 'text-[#71717a] hover:text-ev'}`}
                  >
                    {justSaved ? t.history.saved : t.history.save}
                  </button>
                )}
                <button type="button" onClick={panel.clear} className="cursor-pointer border-none bg-transparent font-mono text-[10.5px] text-[#71717a] hover:text-danger">
                  {t.ticket.clear}
                </button>
              </div>
            </div>

            <div className="border-b border-hairline px-4 py-3.5">
              <div className="flex items-center gap-1.5">
                <span className="mr-1 flex shrink-0 items-center gap-1 text-[11.5px] text-[#71717a]">
                  {t.ticket.modeLabel} <InfoTip tip={t.ticket.modeHelp} />
                </span>
                {(
                  [
                    ['conservative', t.ticket.modeConservative, '🛡️'],
                    ['balanced', t.ticket.modeBalanced, '⚡'],
                    ['fantasy', t.ticket.modeFantasy, '🚀'],
                  ] as const
                ).map(([key, label, icon]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setMode(key);
                      if (goalBuilt && goalAmount > 0) panel.buildForGoal(goalAmount, key);
                    }}
                    className={`flex min-h-[28px] cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[10.5px] font-semibold transition-colors ${
                      mode === key ? 'border-ev-active bg-ev-deep text-ev' : 'border-ctrl bg-card text-[#a1a1aa] hover:border-[#3f3f46]'
                    }`}
                  >
                    <span aria-hidden="true">{icon}</span>
                    {label}
                  </button>
                ))}
              </div>
              <div className="mt-2.5 flex items-center gap-2.5">
                <span className="flex w-[90px] shrink-0 items-center gap-1 text-[11.5px] text-[#71717a]">
                  {t.ticket.goalLabel}
                </span>
                <input
                  type="number"
                  min={1}
                  step={10}
                  placeholder={t.ticket.goalPlaceholder}
                  value={goalInput}
                  onChange={(e) => { setGoalInput(e.target.value); setGoalBuilt(false); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && goalAmount > 0) { panel.buildForGoal(goalAmount, mode); setGoalBuilt(true); } }}
                  className="min-h-[36px] w-0 flex-1 rounded-[9px] border border-ctrl bg-transparent px-3 font-mono text-[13px] outline-none focus:border-[#3f3f46] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  disabled={!(goalAmount > 0)}
                  onClick={() => { panel.buildForGoal(goalAmount, mode); setGoalBuilt(true); }}
                  className="min-h-[36px] shrink-0 cursor-pointer rounded-[9px] border border-ev bg-ev px-3.5 font-mono text-[11px] font-semibold text-ev-on hover:bg-ev-light disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t.ticket.goalBuild}
                </button>
              </div>
              {hasGoal && analysis && (
                <p
                  className="m-0 mt-2.5 text-[12px] leading-[1.5]"
                  style={{ color: panel.stake * analysis.combinedPrice - panel.stake >= goalAmount * 0.999 ? '#34d399' : '#f59e0b' }}
                >
                  {panel.stake * analysis.combinedPrice - panel.stake >= goalAmount * 0.999
                    ? t.ticket.goalReached(money(panel.stake * analysis.combinedPrice - panel.stake))
                    : t.ticket.goalShort(money(goalAmount), money(panel.stake * analysis.combinedPrice - panel.stake))}
                </p>
              )}
            </div>

            {panel.legs.length === 0 && (
              <div className="px-5 py-[34px] text-center text-[12.5px] leading-[1.6] text-[#52525b]">{t.ticket.empty}</div>
            )}

            <div className="flex flex-col">
              {panel.legs.map((leg, i) => {
                const alive = panel.survival[i] ?? 0;
                return (
                  <div key={leg.id} className="border-b border-hairline px-4 py-3">
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="min-w-0">
                        <div className="text-[12.5px] font-medium leading-[1.3]">{leg.label}</div>
                        <div className="mt-[3px] font-mono text-[10.5px] text-[#71717a]">
                          {leg.matchup} · {t.board.detail(num(1 / leg.fairProbability), pct(leg.fairProbability, 1))}
                          {leg.book ? ` · ${leg.book.toUpperCase()}` : ''}
                          {leg.commission > 0 ? ` (−${Math.round(leg.commission * 100)}%)` : ''}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {leg.manual && (
                          <span className="rounded border border-risk-border px-1 py-[1px] font-mono text-[9px] text-risk">
                            {t.help.manualTag}
                          </span>
                        )}
                        <LegPriceInput
                          feedPrice={leg.feedPrice}
                          manual={leg.manual}
                          label={t.help.manualPrice}
                          onOverride={(price) => panel.setPriceOverride(leg.id, price)}
                        />
                        <button
                          type="button"
                          onClick={() => panel.remove(leg.id)}
                          className="h-[18px] w-[18px] cursor-pointer border-none bg-transparent text-sm leading-none text-[#52525b] hover:text-danger"
                          aria-label="remove"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    <div className="mt-[9px] flex items-center gap-2">
                      <div className="h-[5px] flex-1 overflow-hidden rounded-[3px] bg-edge">
                        <div
                          className="h-full rounded-[3px] transition-[width] duration-[350ms]"
                          style={{ width: `${(alive * 100).toFixed(1)}%`, background: survivalColor(alive) }}
                        />
                      </div>
                      <span className="w-14 text-right font-mono text-[10px] text-[#71717a]">{pct(alive, 1)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col gap-3 px-4 py-3.5">
              <div className="flex items-center gap-2.5">
                <span className="w-[62px] text-[11.5px] text-[#71717a]">{t.ticket.stake}</span>
                <input
                  type="range" min={5} max={250} step={5} value={panel.stake}
                  onChange={(e) => panel.setStake(Number(e.target.value))}
                  className="flex-1" style={{ accentColor: '#34d399' }}
                />
                <span className="w-[66px] text-right font-mono text-[13px] font-semibold">{money(panel.stake)}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="flex w-[62px] items-center gap-1 text-[11.5px] text-[#71717a]">{t.ticket.correlation} <InfoTip tip={t.help.corr} /></span>
                <input
                  type="range" min={0} max={60} step={5} value={panel.corr}
                  onChange={(e) => panel.setCorr(Number(e.target.value))}
                  className="flex-1" style={{ accentColor: '#f59e0b' }}
                />
                <span className="w-[66px] text-right font-mono text-[13px] font-semibold" style={{ color: panel.corr >= 30 ? '#f59e0b' : '#a1a1aa' }}>
                  +{pct(panel.corr / 100, 0)}
                </span>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[14px] border border-edge bg-raised">
            <div className="grid grid-cols-2">
              <div className="border-b border-r border-edge px-4 py-3.5">
                <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[.05em] text-[#71717a]">{t.stats.combinedPrice} <InfoTip tip={t.help.combined} /></div>
                <div className="mt-1 font-mono text-2xl font-semibold">{analysis ? num(analysis.combinedPrice) : '—'}</div>
                <div className="mt-[2px] font-mono text-[11px] text-[#52525b]">
                  {analysis
                    ? `${americanStr(analysis.combinedPrice)} · ${t.stats.payout(money(panel.stake * analysis.combinedPrice))}`
                    : t.stats.noLegs}
                </div>
              </div>
              <div className="border-b border-edge px-4 py-3.5">
                <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[.05em] text-[#71717a]">{t.stats.fairPrice} <InfoTip tip={t.help.fair} /></div>
                <div className="mt-1 font-mono text-2xl font-semibold text-model">{analysis ? num(1 / analysis.jointProbability) : '—'}</div>
                <div className="mt-[2px] font-mono text-[11px] text-[#52525b]">{analysis ? t.stats.joint(pct(analysis.jointProbability, 2)) : '—'}</div>
              </div>
              <div className="border-b border-r border-edge px-4 py-3.5">
                <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[.05em] text-[#71717a]">{t.stats.expectedValue} <InfoTip tip={t.help.ev} /></div>
                <div className="mt-1 font-mono text-2xl font-semibold" style={{ color: analysis ? (good ? '#34d399' : '#f43f5e') : '#52525b' }}>
                  {analysis ? (analysis.expectedValue >= 0 ? '+' : '') + money(analysis.expectedValue * panel.stake) : '—'}
                </div>
                <div className="mt-[2px] font-mono text-[11px] text-[#52525b]">
                  {analysis ? t.stats.perUnit((analysis.expectedValue >= 0 ? '+' : '') + num(analysis.expectedValue)) : '—'}
                </div>
              </div>
              <div className="border-b border-edge px-4 py-3.5">
                <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[.05em] text-[#71717a]">
                  {t.stats.kelly} ({Math.round(KELLY_MULTIPLIER * 100)}%) <InfoTip tip={t.help.kelly} />
                </div>
                <div className="mt-1 font-mono text-2xl font-semibold text-[#f4f4f5]">{analysis ? money(analysis.kellyFraction * panel.bankroll) : '—'}</div>
                <div className="mt-[2px] font-mono text-[11px] text-[#52525b]">{analysis ? t.stats.ofBankroll(pct(analysis.kellyFraction, 2)) : '—'}</div>
              </div>
            </div>

            <div className="px-4 py-3.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-[.05em] text-[#71717a]">{t.sim.title} <InfoTip tip={t.help.mc} /></span>
                <span className="font-mono text-[11px] text-[#a1a1aa]">{simulation ? t.sim.hit(pct(simulation.hitRate, 2)) : '—'}</span>
              </div>
              <div className="mt-3 flex h-16 items-end gap-[2px]">
                {panel.histogram.length
                  ? panel.histogram.map((bar, i) => (
                      <div
                        key={i}
                        className="min-h-[2px] flex-1 rounded-t-[2px] transition-[height] duration-[350ms]"
                        style={{ height: `${bar.heightPct.toFixed(1)}%`, background: bar.profit ? '#34d399' : '#3f3f46' }}
                      />
                    ))
                  : Array.from({ length: 26 }, (_, i) => <div key={i} className="min-h-[2px] flex-1 rounded-t-[2px] bg-edge" />)}
              </div>
              <div className="mt-1.5 flex justify-between font-mono text-[10px] text-[#52525b]">
                <span>{simulation ? t.sim.p05(money(simulation.p05)) : '—'}</span>
                <span>{simulation ? t.sim.median(money(simulation.medianBankroll - SIM_BANKROLL)) : '—'}</span>
                <span>{simulation ? t.sim.p95(money(simulation.p95)) : '—'}</span>
              </div>
              <div className="mt-3 rounded-[9px] border px-3 py-2.5 text-xs leading-[1.5]" style={{ background: verdict.bg, borderColor: verdict.border, color: verdict.color }}>
                {verdict.text}
              </div>
            </div>
          </section>
        </aside>
      </div>
      <HelpModal t={t} open={help.open} onClose={help.close} />
    </div>
  );
}
