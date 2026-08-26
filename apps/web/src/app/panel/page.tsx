'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  BadgePercent,
  Check,
  CircleAlert,
  CircleX,
  Database,
  FileText,
  Info,
  Layers,
  LayoutGrid,
  Link2,
  Merge,
  Search,
  Shield,
  Trash2,
  TrendingUp,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import { decimalToAmerican, type BuildMode } from '@devigo/core';
import { formatOdds, formatPercent, getDictionary, LOCALE_META } from '@devigo/i18n';
import { CurrencySelect } from '@/components/currency-select';
import { DayCard } from '@/components/day-card';
import { HelpModal, useHelpModal } from '@/components/help-modal';
import { InfoTip } from '@/components/info-tip';
import { LeagueChip } from '@/components/league-badge';
import { LegPriceInput } from '@/components/leg-price-input';
import { LangSwitch } from '@/components/lang-switch';
import { Wordmark } from '@/components/logo';
import { SportTab } from '@/components/sport-tab';
import { formatCurrency, useCurrency } from '@/lib/currency';
import { dayLabel, localDateKey, todayKey } from '@/lib/date-groups';
import { useHistory } from '@/lib/history';
import { useLocale } from '@/lib/locale';
import { MIN_EDGE, sportLabel, STAKE_STEPS, STYLE_CONFIG } from '@/lib/markets';
import { usePanel } from '@/lib/ticket-store';

const survivalColor = (p: number): string => (p > 0.4 ? '#34d399' : p > 0.15 ? '#f59e0b' : '#f43f5e');

const STYLE_ICON: Record<BuildMode, typeof Shield> = {
  conservative: Shield,
  balanced: Zap,
  fantasy: Layers,
};

export default function PanelPage() {
  const [locale, setLocale] = useLocale();
  const [currency, setCurrency] = useCurrency(locale);
  const t = getDictionary(locale);
  const panel = usePanel(locale);
  const help = useHelpModal();
  const history = useHistory();
  const [justSaved, setJustSaved] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [showGlossary, setShowGlossary] = useState(false);
  const { analysis, simulation } = panel;
  const goalAmount = Number(goalInput);

  const saveTicket = (): void => {
    if (!analysis) return;
    history.save({
      stake: panel.stake,
      currency,
      method: panel.method,
      corr: panel.sharedMatchup === null ? 0 : 35,
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
  const risky = analysis !== null && (analysis.jointProbability < 0.1 || panel.sharedMatchup !== null);

  const verdict =
    analysis === null || simulation === null
      ? null
      : good
        ? {
            text:
              t.verdict.positive(pct(analysis.edge, 2)) +
              (risky ? t.verdict.heavy(pct(simulation.hitRate, 1)) : t.verdict.sized),
            bg: '#082f24', border: '#0f5c43', color: '#a7f3d0',
            Icon: risky ? CircleAlert : Check,
          }
        : {
            text: t.verdict.negative(pct(-analysis.edge, 2)),
            bg: '#2a1116', border: '#7f1d3a', color: '#fda4af', Icon: CircleX,
          };

  const builderNote = (() => {
    if (panel.buildStatus === 'none') {
      return { text: t.builder.noteNone, color: '#f59e0b', Icon: CircleAlert };
    }
    if (panel.buildStatus === 'short' && analysis) {
      return {
        text: t.builder.noteShort(
          t.ticket.legs(panel.legs.length),
          money(panel.stake * analysis.combinedPrice),
          money(goalAmount > 0 ? goalAmount : 0),
        ),
        color: '#f59e0b', Icon: CircleAlert,
      };
    }
    if (panel.buildStatus === 'built' && analysis) {
      return {
        text: t.builder.noteBuilt(
          t.ticket.legs(panel.legs.length),
          money(panel.stake * analysis.combinedPrice),
          pct(analysis.jointProbability, 2),
        ),
        color: '#a7f3d0', Icon: Check,
      };
    }
    return { text: t.builder.noteIdle, color: '#52525b', Icon: Info };
  })();

  const kpis = [
    { label: t.board.kpiScanned, value: intFmt.format(panel.scannedLines), color: '#f4f4f5', Icon: Database },
    { label: t.board.kpiValueFound, value: String(panel.valueCount), color: '#34d399', Icon: Zap },
    { label: t.board.kpiAvgMargin, value: panel.board.length ? pct(panel.avgMargin, 2) : '—', color: '#f4f4f5', Icon: BadgePercent },
    { label: t.board.kpiModel, value: panel.methodShort, color: '#38bdf8', Icon: Shield },
  ];

  const americanStr = (price: number): string => {
    const american = Math.round(decimalToAmerican(price));
    return american > 0 ? `+${american}` : String(american);
  };

  const glossaryRows = [
    { Icon: Shield, term: t.glossary.fairTerm, text: t.glossary.fairText },
    { Icon: BadgePercent, term: t.glossary.marginTerm, text: t.glossary.marginText },
    { Icon: Zap, term: t.glossary.boltTerm, text: t.glossary.boltText },
    { Icon: TrendingUp, term: t.glossary.profitTerm, text: t.glossary.profitText },
  ];

  const totalGames = panel.dates.reduce((sum, d) => sum + d.count, 0);
  const statCells =
    analysis === null
      ? []
      : [
          {
            Icon: Merge, label: t.stats.combinedPrice, value: num(analysis.combinedPrice),
            color: '#f4f4f5', sub: `${americanStr(analysis.combinedPrice)} · ${t.stats.payout(money(panel.stake * analysis.combinedPrice))}`,
          },
          {
            Icon: Shield, label: t.stats.fairPrice, value: pct(analysis.jointProbability, 1),
            color: '#38bdf8', sub: `${num(1 / analysis.jointProbability)}`,
          },
          {
            Icon: TrendingUp, label: t.stats.expectedValue,
            value: (analysis.expectedValue >= 0 ? '+' : '') + money(analysis.expectedValue * panel.stake),
            color: good ? '#34d399' : '#f43f5e', sub: t.stats.perUnit(money(panel.stake)),
          },
          {
            Icon: Layers, label: `${t.stats.kelly} (${Math.round(STYLE_CONFIG[panel.style].kellyMultiplier * 100)}%)`,
            value: money(analysis.kellyFraction * panel.bankroll),
            color: '#f4f4f5', sub: t.stats.ofBankroll(pct(analysis.kellyFraction, 2)),
          },
        ];

  return (
    <div className="min-h-screen bg-canvas text-[#f4f4f5]">
      <header className="sticky top-0 z-20 flex min-h-[60px] flex-wrap items-center justify-between gap-x-5 gap-y-2.5 border-b border-edge px-4 py-2 backdrop-blur-[12px] md:px-6" style={{ background: 'rgba(9,9,11,.9)' }}>
        <div className="flex min-w-0 items-center gap-[22px]">
          <Link href="/" className="shrink-0">
            <Wordmark compact />
          </Link>
          <nav className="hidden min-w-0 flex-wrap gap-1 text-[13px] md:flex">
            <span className="flex items-center gap-[7px] whitespace-nowrap rounded-lg bg-[#18181b] px-[11px] py-1.5 font-medium text-[#f4f4f5]">
              <LayoutGrid size={14} strokeWidth={1.5} />
              {t.panelNav.builder}
            </span>
            <Link href="/scan" className="flex items-center gap-[7px] whitespace-nowrap rounded-lg px-[11px] py-1.5 text-[#71717a] hover:text-[#d4d4d8]">
              <Search size={14} strokeWidth={1.5} />
              {t.panelNav.scanner}
            </Link>
            <Link href="/history" className="flex items-center gap-[7px] whitespace-nowrap rounded-lg px-[11px] py-1.5 text-[#71717a] hover:text-[#d4d4d8]">
              <FileText size={14} strokeWidth={1.5} />
              {t.panelNav.history}
            </Link>
            <span className="flex items-center gap-[7px] whitespace-nowrap rounded-lg px-[11px] py-1.5 text-[#71717a]">
              <Wallet size={14} strokeWidth={1.5} />
              {t.panelNav.bankroll}
            </span>
          </nav>
        </div>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-x-3 gap-y-2.5">
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
          <label className="hidden shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-ctrl py-1 pl-[11px] pr-2.5 sm:flex">
            <span className="text-xs text-[#71717a]">{t.bankrollLabel}</span>
            <input
              type="number"
              min={10}
              step={10}
              value={panel.bankroll}
              onChange={(e) => panel.setBankroll(Number(e.target.value))}
              className="w-[74px] border-none bg-transparent py-[2px] text-right font-mono text-[13px] font-semibold text-[#f4f4f5] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              aria-label={t.bankrollLabel}
            />
            <span className="font-mono text-[11px] text-[#52525b]">{currency}</span>
          </label>
        </div>
      </header>

      {/* One scrolling row, never wrapping: on a phone six wrapped tabs stacked
          into a 134px band that ate a quarter of the screen before any content. */}
      <div className="scrollbar-none sticky top-[60px] z-[19] flex items-center gap-0.5 overflow-x-auto border-b border-edge bg-band px-4 md:px-5">
        <SportTab
          sport={null}
          label={t.board.allSports}
          count={panel.sports.reduce((sum, s) => sum + s.count, 0)}
          active={panel.sportFilter === null}
          onClick={() => panel.setSportFilter(null)}
        />
        {panel.sports.map((s) => (
          <SportTab
            key={s.sport}
            sport={s.sport}
            label={sportLabel(s.sport, locale)}
            count={s.count}
            active={panel.sportFilter === s.sport}
            onClick={() => panel.setSportFilter(s.sport)}
          />
        ))}
      </div>

      <div className="flex flex-col gap-4 px-4 pb-10 pt-[18px] md:px-6">
        <section className="flex flex-col gap-3.5 rounded-[14px] border border-edge bg-raised px-5 py-[18px]">
          <div className="flex flex-wrap items-baseline gap-2.5">
            <h1 className="m-0 text-[15px] font-semibold tracking-[-.01em]">{t.builder.title}</h1>
            <span className="text-xs text-[#71717a]">{t.builder.subtitle}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="w-24 shrink-0 text-[12.5px] text-[#71717a]">{t.builder.styleLabel}</span>
            <div className="flex flex-wrap gap-1.5">
              {(['conservative', 'balanced', 'fantasy'] as const).map((key) => {
                const Icon = STYLE_ICON[key];
                const on = panel.style === key;
                const warn = key === 'fantasy';
                const label = key === 'conservative' ? t.ticket.modeConservative : key === 'balanced' ? t.ticket.modeBalanced : t.ticket.modeFantasy;
                return (
                  <button
                    key={key}
                    type="button"
                    title={t.builder.styleHint[key]}
                    onClick={() => panel.setStyle(key)}
                    className="flex min-h-[44px] cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border px-3.5 py-2 text-[12.5px] font-semibold transition-colors hover:border-[#3f3f46]"
                    style={{
                      background: on ? (warn ? '#2a1f0a' : '#0d2a20') : '#141419',
                      borderColor: on ? (warn ? '#7a5410' : '#0f9d6e') : '#232329',
                      color: on ? (warn ? '#f59e0b' : '#34d399') : '#a1a1aa',
                    }}
                  >
                    <Icon size={13} strokeWidth={1.5} />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="w-24 shrink-0 text-[12.5px] text-[#71717a]">{t.ticket.goalLabel}</span>
            <div className="flex min-w-0 flex-1 gap-2 [flex-basis:320px]">
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[9px] border border-ctrl bg-sunken px-3">
                <span className="font-mono text-xs text-[#52525b]">{currency}</span>
                <input
                  type="number"
                  min={10}
                  step={10}
                  placeholder={t.ticket.goalPlaceholder}
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') panel.buildForGoal(goalAmount); }}
                  className="min-h-[42px] min-w-0 flex-1 border-none bg-transparent py-[11px] font-mono text-[13.5px] text-[#f4f4f5] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>
              <button
                type="button"
                onClick={() => panel.buildForGoal(goalAmount)}
                className="flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-[9px] border border-ev bg-ev px-5 font-mono text-xs font-semibold text-ev-on hover:bg-ev-light"
              >
                <Zap size={13} strokeWidth={1.5} />
                {t.ticket.goalBuild}
              </button>
            </div>
          </div>

          <div className="flex items-start gap-2.5" style={{ color: builderNote.color }}>
            <builderNote.Icon size={13} strokeWidth={1.5} className="mt-[2px] shrink-0" />
            <span className="text-xs leading-[1.5]">{builderNote.text}</span>
          </div>
        </section>

        <div className="grid grid-cols-1 items-start gap-5 panel:grid-cols-[minmax(0,1fr)_400px]">
          <main className="flex min-w-0 flex-col gap-3.5">
            {panel.dates.length > 0 && (
              <div className="flex flex-col gap-[9px]">
                <div className="flex items-baseline gap-2.5">
                  <span className="text-[12.5px] font-semibold text-[#d4d4d8]">{t.board.scheduleTitle}</span>
                  <span className="text-[11.5px] text-[#52525b]">{t.board.scheduleSub}</span>
                </div>
                <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
                  <DayCard
                    weekday={t.board.allDates}
                    num={t.board.everyDay}
                    numSize="13px"
                    count={t.board.games(totalGames)}
                    active={panel.dateFilter === null}
                    isToday={false}
                    onClick={() => panel.setDateFilter(null)}
                  />
                  {panel.dates.map((d) => {
                    const label = dayLabel(d.date, locale, t.board.today, t.board.tomorrow);
                    const dayNum = d.date.slice(8);
                    return (
                      <DayCard
                        key={d.date}
                        weekday={label}
                        num={dayNum}
                        numSize="19px"
                        count={t.board.games(d.count)}
                        active={panel.dateFilter === d.date}
                        isToday={d.date === todayKey()}
                        onClick={() => panel.setDateFilter(panel.dateFilter === d.date ? null : d.date)}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-wrap overflow-hidden rounded-xl border border-edge bg-raised">
              {kpis.map((kpi) => (
                <div key={kpi.label} className="flex flex-1 items-center gap-[11px] border-r border-edge px-4 py-[11px] [flex-basis:150px]">
                  <kpi.Icon size={14} strokeWidth={1.5} className="shrink-0 text-[#3f3f46]" />
                  <span className="min-w-0">
                    <span className="block whitespace-nowrap text-[10.5px] uppercase tracking-[.05em] text-[#71717a]">{kpi.label}</span>
                    <span className="mt-[1px] block font-mono text-[17px] font-semibold" style={{ color: kpi.color }}>{kpi.value}</span>
                  </span>
                </div>
              ))}
            </div>

            <section className="overflow-hidden rounded-[14px] border border-edge bg-raised">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 px-[18px] pt-3.5">
                <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2.5 gap-y-1 [flex-basis:220px]">
                  <h2 className="m-0 whitespace-nowrap text-sm font-semibold">{t.board.title}</h2>
                  <span className="text-xs leading-[1.4] text-[#71717a]">{t.board.subtitle(t.methods[panel.method])}</span>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowGlossary((v) => !v)}
                    className="flex min-h-[40px] cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-[7px] border bg-[#18181b] px-2.5 py-1.5 font-mono text-[11px] hover:border-[#3f3f46] hover:text-[#f4f4f5]"
                    style={{ color: showGlossary ? '#34d399' : '#a1a1aa', borderColor: showGlossary ? '#0f5c43' : '#27272a' }}
                  >
                    <Info size={13} strokeWidth={1.5} />
                    {t.glossary.toggle}
                  </button>
                  <button
                    type="button"
                    onClick={panel.cycleMethod}
                    className="flex min-h-[40px] cursor-pointer items-center gap-[7px] whitespace-nowrap rounded-[7px] border border-[#27272a] bg-[#18181b] px-2.5 py-1.5 font-mono text-[11px] text-[#a1a1aa] hover:border-[#3f3f46] hover:text-[#f4f4f5]"
                  >
                    <Merge size={13} strokeWidth={1.5} />
                    {t.board.switchModel}
                  </button>
                  <button
                    type="button"
                    onClick={help.show}
                    className="flex min-h-[40px] min-w-[40px] cursor-pointer items-center justify-center rounded-[7px] border border-[#27272a] bg-transparent px-2.5 py-1.5 font-mono text-[11px] text-[#71717a] hover:border-[#3f3f46] hover:text-[#f4f4f5]"
                    aria-label={t.help.open}
                  >
                    ?
                  </button>
                </div>
              </div>

              {panel.leagues.length > 0 && (
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-b border-edge bg-sunken px-[18px] py-2.5">
                  <span className="mr-0.5 text-[11px] uppercase tracking-[.04em] text-[#52525b]">{t.board.compLabel}</span>
                  <LeagueChip
                    league={null}
                    label={t.board.allComps}
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

              {showGlossary && (
                <div className="flex flex-col gap-[9px] border-b border-edge bg-sunken px-[18px] py-3.5">
                  {glossaryRows.map((row) => (
                    <div key={row.term} className="flex items-start gap-2.5 text-[#71717a]">
                      <row.Icon size={13} strokeWidth={1.5} className="mt-[2px] shrink-0 text-[#3f3f46]" />
                      <span className="text-xs leading-[1.45]">
                        <span className="font-medium text-[#a1a1aa]">{row.term}</span> {row.text}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className={panel.leagues.length > 0 || showGlossary ? '' : 'mt-2.5 border-t border-edge'}>
                {panel.board.map((market) => (
                  <div key={market.id} className="flex flex-wrap items-center gap-x-[18px] gap-y-3.5 border-b border-hairline px-[18px] py-[13px]">
                    <div className="flex min-w-0 flex-1 flex-col [flex-basis:250px]">
                      <div className="flex items-center gap-2">
                        <span className="whitespace-nowrap rounded border border-[#27272a] px-1.5 py-[2px] font-mono text-[10px] text-[#a1a1aa]">{market.league}</span>
                        <span className="whitespace-nowrap font-mono text-[11px] text-[#52525b]">{market.time}</span>
                      </div>
                      <div className="mt-1.5 text-[13px] font-medium leading-[1.35]">{market.matchup}</div>
                      <div className="mt-[3px] text-[11px] leading-[1.4] text-[#71717a]">
                        {market.marketName} · {t.board.margin(pct(market.margin, 2))}
                        {market.bookCount > 1 ? ` · ${t.board.books(market.bookCount)}` : ''}
                      </div>
                      {market.spark !== null && (
                        <div className="mt-[7px] flex items-center gap-2">
                          <svg
                            viewBox="0 0 108 24"
                            preserveAspectRatio="none"
                            className="h-6 w-[108px] overflow-visible"
                            role="img"
                            aria-label={t.board.sparkAria(market.spark.label)}
                          >
                            <path
                              d={market.spark.d}
                              fill="none"
                              stroke={market.spark.delta >= 0 ? '#34d399' : '#f43f5e'}
                              strokeWidth={1.5}
                              strokeLinejoin="round"
                              strokeLinecap="round"
                            />
                          </svg>
                          <span className="whitespace-nowrap font-mono text-[10.5px] text-[#52525b]">{market.spark.label}</span>
                          <span
                            className="whitespace-nowrap rounded-[5px] border px-[5px] py-[1px] font-mono text-[10px] font-semibold"
                            style={{ color: market.spark.delta >= 0 ? '#34d399' : '#f43f5e', borderColor: market.spark.delta >= 0 ? '#34d399' : '#f43f5e' }}
                          >
                            {(market.spark.delta >= 0 ? '+' : '−') + pct(Math.abs(market.spark.delta), 1)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="grid min-w-0 flex-[2_1_340px] grid-cols-[repeat(auto-fit,minmax(204px,1fr))] gap-2">
                      {market.runners.map((runner) => {
                        const on = panel.selected.includes(runner.id);
                        const value = runner.edge >= MIN_EDGE;
                        const edgeStr = (runner.edge >= 0 ? '+' : '') + pct(runner.edge, 1);
                        return (
                          <button
                            key={runner.id}
                            type="button"
                            onClick={() => panel.toggle(runner.id)}
                            className="flex min-h-[44px] cursor-pointer items-center justify-between gap-2.5 rounded-[10px] border px-3 py-2.5 text-left text-[#f4f4f5] transition-colors hover:border-[#3f3f46]"
                            style={{ background: on ? '#082f24' : '#141419', borderColor: on ? '#0f9d6e' : value ? '#1f4237' : '#232329' }}
                          >
                            <span className="flex min-w-0 items-center gap-2.5">
                              {(on || value) && (
                                on
                                  ? <Check size={14} strokeWidth={2} className="shrink-0 text-ev" />
                                  : <Zap size={14} strokeWidth={1.5} className="shrink-0" style={{ color: '#1f8f6b' }} />
                              )}
                              <span className="min-w-0">
                                <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-[12.5px] font-medium">{runner.label}</span>
                                <span
                                  className="mt-[2px] block overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[10.5px]"
                                  style={{ color: value ? '#34d399' : runner.edge < -0.02 ? '#71717a' : '#a1a1aa' }}
                                >
                                  {edgeStr}
                                  {runner.book ? ` · ${runner.book.toUpperCase()}` : ''}
                                  {runner.commission > 0 ? ` (−${Math.round(runner.commission * 100)}%)` : ''}
                                </span>
                              </span>
                            </span>
                            <span className="flex shrink-0 items-center gap-2.5">
                              <span
                                className="whitespace-nowrap rounded-full border px-2 py-[3px] font-mono text-[11px] font-semibold"
                                style={{
                                  color: on ? '#6ee7b7' : value ? '#34d399' : '#a1a1aa',
                                  background: on ? '#0d3a2b' : 'transparent',
                                  borderColor: on ? '#0f9d6e' : '#232329',
                                }}
                              >
                                {pct(runner.fairProbability, 1)}
                              </span>
                              <span className="font-mono text-[15px] font-semibold" style={{ color: on ? '#34d399' : '#f4f4f5' }}>
                                {num(runner.price)}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {panel.board.length === 0 && (
                <div className="px-5 py-[34px] text-center text-[12.5px] text-[#52525b]">{t.board.noMarkets}</div>
              )}
            </section>
          </main>

          <aside className="flex flex-col gap-3.5 panel:sticky panel:top-[136px]">
            <section className="rounded-[14px] border border-edge bg-raised">
              <div className="flex items-center justify-between border-b border-edge px-4 py-3.5">
                <h2 className="m-0 flex items-center gap-2 text-sm font-semibold">
                  <FileText size={14} strokeWidth={1.5} className="text-[#52525b]" />
                  {t.ticket.title} · {panel.legs.length ? t.ticket.legs(panel.legs.length) : t.ticket.emptyLegs}
                </h2>
                <div className="flex items-center gap-3">
                  {panel.legs.length > 0 && (
                    <button
                      type="button"
                      onClick={saveTicket}
                      className={`min-h-[36px] cursor-pointer border-none bg-transparent px-1 font-mono text-[10.5px] ${justSaved ? 'text-ev' : 'text-[#71717a] hover:text-ev'}`}
                    >
                      {justSaved ? t.history.saved : t.history.save}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={panel.clear}
                    className="flex min-h-[36px] cursor-pointer items-center gap-1.5 border-none bg-transparent px-1 font-mono text-[10.5px] text-[#71717a] hover:text-danger"
                  >
                    <Trash2 size={12} strokeWidth={1.5} />
                    {t.ticket.clear}
                  </button>
                </div>
              </div>

              {panel.legs.length === 0 && (
                <div className="px-5 pb-[22px] pt-[26px] text-center">
                  <div className="flex justify-center text-[#2c2c34]">
                    <Layers size={28} strokeWidth={1.5} />
                  </div>
                  <div className="mt-3.5 text-sm font-semibold text-[#d4d4d8]">{t.ticket.emptyTitle}</div>
                  <div className="mt-1.5 text-[12.5px] leading-[1.6] text-[#71717a]">{t.ticket.empty}</div>
                </div>
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
                            className="flex cursor-pointer items-center border-none bg-transparent p-0 text-[#52525b] hover:text-danger"
                            aria-label="remove"
                          >
                            <X size={14} strokeWidth={1.5} />
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

              {analysis !== null && (
                <>
                  <div className="flex flex-col gap-2 border-b border-hairline px-4 py-3.5">
                    <div className="flex items-center justify-between gap-2.5">
                      <span className="flex items-center gap-[7px] text-[12.5px] font-medium text-[#d4d4d8]">
                        <Wallet size={13} strokeWidth={1.5} className="text-[#52525b]" />
                        <span className="whitespace-nowrap">{t.builder.stakeQuestion}</span>
                      </span>
                      <span className="whitespace-nowrap font-mono text-sm font-semibold">{money(panel.stake)}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {STAKE_STEPS.map((v) => {
                        const on = panel.stake === v;
                        return (
                          <button
                            key={v}
                            type="button"
                            onClick={() => panel.setStake(v)}
                            className="flex-auto cursor-pointer rounded-lg border px-1 py-[7px] font-mono text-xs font-semibold transition-colors hover:border-[#3f3f46]"
                            style={{
                              background: on ? '#082f24' : '#141419',
                              borderColor: on ? '#0f9d6e' : '#232329',
                              color: on ? '#34d399' : '#a1a1aa',
                            }}
                          >
                            {money(v)}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-[7px] text-[11.5px] text-[#71717a]">
                      <TrendingUp size={12} strokeWidth={1.5} className="shrink-0 text-ev" />
                      <span>{t.builder.payout(money(panel.stake * analysis.combinedPrice), pct(analysis.jointProbability, 1))}</span>
                    </div>
                  </div>
                  <div className="flex gap-2.5 px-4 py-3" style={{ color: panel.sharedMatchup !== null ? '#f59e0b' : '#52525b' }}>
                    <Link2 size={13} strokeWidth={1.5} className="mt-[2px] shrink-0" />
                    <span className="text-[11.5px] leading-[1.5]">
                      {panel.sharedMatchup !== null
                        ? t.builder.linkSome(
                            panel.sharedMatchup,
                            pct(analysis.independentProbability, 1),
                            pct(analysis.jointProbability, 1),
                          )
                        : t.builder.linkNone}
                    </span>
                  </div>
                </>
              )}
            </section>

            {analysis !== null && simulation !== null && verdict !== null && (
              <section className="overflow-hidden rounded-[14px] border border-edge bg-raised">
                <div className="grid grid-cols-2">
                  {statCells.map((cell, i) => (
                    <div
                      key={cell.label}
                      className="border-b border-edge px-4 py-3.5"
                      style={{ borderRight: i % 2 === 0 ? '1px solid #1c1c21' : 'none' }}
                    >
                      <div className="flex items-center gap-[7px] text-[#71717a]">
                        <cell.Icon size={12} strokeWidth={1.5} />
                        <span className="text-[10.5px] uppercase tracking-[.05em]">{cell.label}</span>
                      </div>
                      <div className="mt-1 font-mono text-2xl font-semibold" style={{ color: cell.color }}>{cell.value}</div>
                      <div className="mt-[2px] font-mono text-[11px] text-[#52525b]">{cell.sub}</div>
                    </div>
                  ))}
                </div>

                <div className="px-4 py-3.5">
                  <div className="flex items-center justify-between gap-2.5">
                    <span className="flex items-center gap-[7px] text-[11px] uppercase tracking-[.05em] text-[#71717a]">
                      <TrendingUp size={12} strokeWidth={1.5} />
                      {t.sim.title}
                    </span>
                    <span className="whitespace-nowrap font-mono text-[11px] text-[#a1a1aa]">{t.sim.hit(pct(simulation.hitRate, 2))}</span>
                  </div>
                  <div className="mt-3 flex h-2.5 overflow-hidden rounded-[5px] bg-[#27272a]">
                    <div
                      className="min-w-[2px] bg-ev transition-[width] duration-[350ms]"
                      style={{ width: `${(simulation.hitRate * 100).toFixed(1)}%` }}
                    />
                  </div>
                  <div className="mt-3 flex flex-col gap-[7px]">
                    <div className="flex items-center justify-between gap-2.5">
                      <span className="flex items-center gap-2 text-xs text-[#a1a1aa]">
                        <span className="h-2 w-2 shrink-0 rounded-[2px] bg-ev" />
                        {t.stats.cash(pct(simulation.hitRate, 2))}
                      </span>
                      <span className="whitespace-nowrap font-mono text-[13px] font-semibold text-ev">
                        +{money(panel.stake * (analysis.combinedPrice - 1))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2.5">
                      <span className="flex items-center gap-2 text-xs text-[#a1a1aa]">
                        <span className="h-2 w-2 shrink-0 rounded-[2px] bg-[#52525b]" />
                        {t.stats.lose(pct(1 - simulation.hitRate, 2))}
                      </span>
                      <span className="whitespace-nowrap font-mono text-[13px] font-semibold text-[#52525b]">−{money(panel.stake)}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-col gap-1.5 border-t border-edge pt-[11px]">
                    <div className="flex items-baseline justify-between gap-2.5">
                      <span className="min-w-0 flex-1 text-[11.5px] leading-[1.4] text-[#71717a]">{t.stats.oneIn}</span>
                      <span className="whitespace-nowrap font-mono text-[11.5px] text-[#a1a1aa]">
                        {t.stats.oneInValue(Math.round(1 / Math.max(simulation.hitRate, 1e-6)), pct(simulation.hitRate, 2))}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-2.5">
                      <span className="min-w-0 flex-1 text-[11.5px] leading-[1.4] text-[#71717a]">{t.stats.breakeven}</span>
                      <span
                        className="whitespace-nowrap font-mono text-[11.5px]"
                        style={{ color: simulation.hitRate >= 1 / analysis.combinedPrice ? '#34d399' : '#f59e0b' }}
                      >
                        {pct(1 / analysis.combinedPrice, 2)}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-2.5">
                      <span className="min-w-0 flex-1 text-[11.5px] leading-[1.4] text-[#71717a]">{t.stats.per100}</span>
                      <span
                        className="whitespace-nowrap font-mono text-[11.5px]"
                        style={{ color: analysis.expectedValue >= 0 ? '#34d399' : '#f43f5e' }}
                      >
                        {(analysis.expectedValue >= 0 ? '+' : '') + money(analysis.expectedValue * panel.stake * 100)}
                      </span>
                    </div>
                  </div>
                  <div
                    className="mt-3 flex gap-2.5 rounded-[9px] border px-3 py-[11px]"
                    style={{ background: verdict.bg, borderColor: verdict.border }}
                  >
                    <verdict.Icon size={14} strokeWidth={1.5} className="mt-[2px] shrink-0" style={{ color: verdict.color }} />
                    <span className="text-xs leading-[1.5]" style={{ color: verdict.color }}>{verdict.text}</span>
                  </div>
                </div>
              </section>
            )}
          </aside>
        </div>
      </div>
      <HelpModal t={t} open={help.open} onClose={help.close} />
    </div>
  );
}
