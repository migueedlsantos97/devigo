'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { combinePrices } from '@devigo/core';
import { formatMoney, formatOdds, formatPercent, getDictionary } from '@devigo/i18n';
import { LangSwitch } from '@/components/lang-switch';
import { Wordmark } from '@/components/logo';
import { InfoTip } from '@/components/info-tip';
import { useLocale } from '@/lib/locale';

interface ScanLeg {
  event: string;
  market: string;
  selection: string;
  price: number;
}

type Phase =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; key: 'errorGeneric' | 'errorNoKey' | 'errorNoLegs' }
  | { kind: 'done' };

const MAX_SIDE = 1568;

/** Downscale + re-encode to JPEG so uploads stay small and readable. */
const toJpegBase64 = (file: File): Promise<{ data: string; mediaType: string }> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('canvas'));
        return;
      }
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      resolve({ data: dataUrl.split(',')[1] ?? '', mediaType: 'image/jpeg' });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('decode'));
    };
    img.src = url;
  });

export default function ScanPage() {
  const [locale, setLocale] = useLocale();
  const t = getDictionary(locale);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [legs, setLegs] = useState<ScanLeg[]>([]);
  const [stake, setStake] = useState(300);
  const [currency, setCurrency] = useState<string | null>(null);
  const [slipTotal, setSlipTotal] = useState<number | null>(null);
  const [vig, setVig] = useState(3);
  const fileRef = useRef<HTMLInputElement>(null);

  const analyze = useCallback(async (file: File) => {
    setPhase({ kind: 'loading' });
    try {
      const payload = await toJpegBase64(file);
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        setPhase({
          kind: 'error',
          key: err.error === 'not_configured' ? 'errorNoKey' : err.error === 'no_legs' ? 'errorNoLegs' : 'errorGeneric',
        });
        return;
      }
      const data = (await res.json()) as {
        legs: ScanLeg[]; stake: number | null; currency: string | null; totalOdds: number | null;
      };
      setLegs(data.legs);
      if (data.stake) setStake(data.stake);
      setCurrency(data.currency);
      setSlipTotal(data.totalOdds);
      setPhase({ kind: 'done' });
    } catch {
      setPhase({ kind: 'error', key: 'errorGeneric' });
    }
  }, []);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent): void => {
      const items = e.clipboardData ? Array.from(e.clipboardData.items) : [];
      const file = items.find((i) => i.type.startsWith('image/'))?.getAsFile();
      if (file) void analyze(file);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [analyze]);

  const money = (v: number): string =>
    currency ? `${currency} ${new Intl.NumberFormat(locale === 'es' ? 'es-ES' : 'en-US', { maximumFractionDigits: 0 }).format(v)}` : formatMoney(locale, v);
  const pct = (v: number, d = 2) => formatPercent(locale, v, d);
  const num = (v: number) => formatOdds(locale, v);

  const analysis = useMemo(() => {
    if (legs.length === 0) return null;
    const combined = combinePrices(legs.map((l) => l.price));
    const fairAt = (v: number): number => legs.reduce((acc, l) => acc * l.price * (1 + v), 1);
    const central = fairAt(vig / 100);
    const lo = fairAt(Math.max(0.005, vig / 100 - 0.01));
    const hi = fairAt(vig / 100 + 0.01);
    const ev = (1 / central) * combined - 1;
    const evLo = (1 / hi) * combined - 1;
    const evHi = (1 / lo) * combined - 1;
    return { combined, fairLo: lo, fairHi: hi, central, ev, evLo, evHi, pPaid: 1 / combined, pReal: 1 / central };
  }, [legs, vig]);

  return (
    <div className="min-h-screen bg-canvas text-[#f4f4f5]">
      <header className="sticky top-0 z-20 flex h-[60px] items-center justify-between gap-6 border-b border-edge px-4 backdrop-blur-[12px] md:px-7" style={{ background: 'rgba(9,9,11,.88)' }}>
        <Link href="/" className="shrink-0"><Wordmark compact /></Link>
        <div className="flex items-center gap-3.5">
          <LangSwitch locale={locale} onChange={setLocale} />
          <Link href="/panel" className="inline-flex min-h-[36px] shrink-0 items-center whitespace-nowrap rounded-lg bg-ev px-[15px] py-2 text-[12.5px] font-semibold text-ev-on hover:bg-ev-light">
            {t.scan.toPanel}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[720px] px-4 pb-16 pt-10 md:px-6">
        <h1 className="m-0 text-[30px] font-semibold leading-[1.1] tracking-[-.025em] md:text-[36px]">{t.scan.title}</h1>
        <p className="mt-3 max-w-[56ch] text-[14.5px] leading-[1.6] text-[#a1a1aa]">{t.scan.subtitle}</p>

        {(phase.kind === 'idle' || phase.kind === 'error' || phase.kind === 'loading') && (
          <div className="mt-7">
            <button
              type="button"
              disabled={phase.kind === 'loading'}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files.item(0);
                if (file?.type.startsWith('image/')) void analyze(file);
              }}
              className="flex min-h-[160px] w-full cursor-pointer flex-col items-center justify-center gap-2.5 rounded-2xl border border-dashed border-[#2c2c34] bg-raised p-8 text-center transition-colors hover:border-ev-border disabled:cursor-wait"
            >
              {phase.kind === 'loading' ? (
                <>
                  <span className="dv-pulse h-2 w-2 rounded-full bg-ev" />
                  <span className="font-mono text-[12.5px] text-[#a1a1aa]">{t.scan.analyzing}</span>
                </>
              ) : (
                <>
                  <span className="text-[14.5px] font-semibold text-ev">{t.scan.upload}</span>
                  <span className="max-w-[40ch] text-[12.5px] leading-[1.5] text-[#71717a]">{t.scan.dropHint}</span>
                </>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.item(0);
                if (file) void analyze(file);
                e.target.value = '';
              }}
            />
            {phase.kind === 'error' && (
              <div className="mt-3 rounded-[9px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-xs leading-[1.5] text-danger-text">
                {t.scan[phase.key]}
              </div>
            )}
          </div>
        )}

        {phase.kind === 'done' && analysis && (
          <div className="mt-7 flex flex-col gap-4">
            <section className="overflow-hidden rounded-[14px] border border-edge bg-raised">
              <div className="flex items-center justify-between border-b border-edge px-4 py-3">
                <span className="text-sm font-semibold">{t.scan.extracted(legs.length)}</span>
                <span className="font-mono text-[11px] text-[#71717a]">
                  {slipTotal !== null ? `slip ${num(slipTotal)} · ` : ''}engine {num(analysis.combined)}
                </span>
              </div>
              <div className="flex flex-col">
                {legs.map((leg, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-2.5">
                    <div className="min-w-0">
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[12.5px] font-medium">{leg.selection}</div>
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[10.5px] text-[#71717a]">
                        {leg.event}{leg.market ? ` · ${leg.market}` : ''}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <input
                        type="number"
                        min={1.01}
                        step={0.01}
                        defaultValue={leg.price.toFixed(2)}
                        aria-label={t.scan.colPrice}
                        onChange={(e) => {
                          const parsed = Number(e.target.value);
                          if (Number.isFinite(parsed) && parsed > 1) {
                            setLegs((prev) => prev.map((l, j) => (j === i ? { ...l, price: parsed } : l)));
                          }
                        }}
                        className="w-[62px] rounded-md border border-transparent bg-transparent px-1.5 py-[3px] text-right font-mono text-[13px] font-semibold outline-none [appearance:textfield] hover:border-ctrl focus:border-[#3f3f46] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        aria-label="remove"
                        onClick={() => setLegs((prev) => prev.filter((_, j) => j !== i))}
                        className="h-[18px] w-[18px] cursor-pointer border-none bg-transparent text-sm leading-none text-[#52525b] hover:text-danger"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-3 px-4 py-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-[130px] text-[11.5px] text-[#71717a]">{t.scan.stake}</span>
                  <input
                    type="number" min={1} step={10} value={stake}
                    onChange={(e) => setStake(Math.max(1, Number(e.target.value) || 1))}
                    className="w-[100px] rounded-md border border-ctrl bg-transparent px-2 py-1 text-right font-mono text-[13px] font-semibold outline-none focus:border-[#3f3f46] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <span className="font-mono text-xs text-[#71717a]">{currency ?? ''}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="flex w-[130px] items-center gap-1 text-[11.5px] text-[#71717a]">{t.scan.vig} <InfoTip tip={t.scan.vigHelp} /></span>
                  <input
                    type="range" min={1} max={5} step={0.5} value={vig}
                    onChange={(e) => setVig(Number(e.target.value))}
                    className="flex-1" style={{ accentColor: '#f59e0b' }}
                  />
                  <span className="w-[52px] text-right font-mono text-[13px] font-semibold text-risk">{vig.toFixed(1)}%</span>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-2 gap-2 md:grid-cols-3">
              <div className="rounded-xl border border-edge bg-raised px-4 py-3.5">
                <div className="text-[10.5px] uppercase tracking-[.05em] text-[#71717a]">{t.scan.paid}</div>
                <div className="mt-1 font-mono text-[22px] font-semibold">{num(analysis.combined)}</div>
              </div>
              <div className="rounded-xl border border-edge bg-raised px-4 py-3.5">
                <div className="text-[10.5px] uppercase tracking-[.05em] text-[#71717a]">{t.scan.fairRange}</div>
                <div className="mt-1 font-mono text-[22px] font-semibold text-model">{num(analysis.fairLo)}–{num(analysis.fairHi)}</div>
              </div>
              <div className="rounded-xl border border-edge bg-raised px-4 py-3.5">
                <div className="text-[10.5px] uppercase tracking-[.05em] text-[#71717a]">{t.scan.probPaid}</div>
                <div className="mt-1 font-mono text-[22px] font-semibold">{pct(analysis.pPaid, 2)}</div>
              </div>
              <div className="rounded-xl border border-edge bg-raised px-4 py-3.5">
                <div className="text-[10.5px] uppercase tracking-[.05em] text-[#71717a]">{t.scan.probReal}</div>
                <div className="mt-1 font-mono text-[22px] font-semibold text-model">{pct(analysis.pReal, 2)}</div>
              </div>
              <div className="rounded-xl border px-4 py-3.5" style={{ borderColor: analysis.ev < 0 ? '#7f1d3a' : '#0f5c43', background: analysis.ev < 0 ? '#2a1116' : '#082f24' }}>
                <div className="text-[10.5px] uppercase tracking-[.05em]" style={{ color: analysis.ev < 0 ? '#fda4af' : '#6ee7b7' }}>{t.scan.evRange}</div>
                <div className="mt-1 font-mono text-[22px] font-semibold" style={{ color: analysis.ev < 0 ? '#fda4af' : '#34d399' }}>
                  {pct(analysis.evLo, 0)}…{pct(analysis.evHi, 0)}
                </div>
              </div>
              <div className="rounded-xl border px-4 py-3.5" style={{ borderColor: analysis.ev < 0 ? '#7f1d3a' : '#0f5c43', background: analysis.ev < 0 ? '#2a1116' : '#082f24' }}>
                <div className="text-[10.5px] uppercase tracking-[.05em]" style={{ color: analysis.ev < 0 ? '#fda4af' : '#6ee7b7' }}>{t.scan.houseTake}</div>
                <div className="mt-1 font-mono text-[22px] font-semibold" style={{ color: analysis.ev < 0 ? '#fda4af' : '#34d399' }}>
                  {analysis.ev < 0 ? money(-analysis.ev * stake) : money(0)}
                </div>
              </div>
            </section>

            <div className="rounded-[10px] border px-4 py-3 text-[12.5px] leading-[1.55]" style={{ borderColor: analysis.ev < 0 ? '#7f1d3a' : '#0f5c43', background: analysis.ev < 0 ? '#2a1116' : '#082f24', color: analysis.ev < 0 ? '#fda4af' : '#a7f3d0' }}>
              {analysis.ev < 0 ? t.scan.verdict(pct(-analysis.ev, 1), money(-analysis.ev * stake)) : t.scan.verdictPositive}
            </div>

            <p className="m-0 text-[11.5px] leading-[1.5] text-[#52525b]">{t.scan.matchNote} {t.scan.disclaimer}</p>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => { setPhase({ kind: 'idle' }); setLegs([]); setSlipTotal(null); setCurrency(null); }}
                className="min-h-[42px] cursor-pointer rounded-[10px] border border-[#27272a] bg-transparent px-[18px] text-[13.5px] font-medium text-[#f4f4f5] hover:border-[#3f3f46]"
              >
                {t.scan.again}
              </button>
              <Link href="/panel" className="inline-flex min-h-[42px] items-center rounded-[10px] bg-ev px-[18px] text-[13.5px] font-semibold text-ev-on hover:bg-ev-light">
                {t.scan.toPanel}
              </Link>
            </div>
          </div>
        )}

        <footer className="mt-14 border-t border-hairline pt-5 text-xs text-[#52525b]">{t.footer.legal}</footer>
      </main>
    </div>
  );
}
