'use client';

import Link from 'next/link';
import { formatPercent, getDictionary } from '@devigo/i18n';
import { LangSwitch } from '@/components/lang-switch';
import { Monogram } from '@/components/logo';
import { useLocale } from '@/lib/locale';

const TERMINAL = ` ✓ src/odds.test.ts            (7 tests)   6ms
 ✓ src/vig.test.ts             (7 tests)  11ms
 ✓ src/parlay.test.ts          (7 tests)   8ms
 ✓ src/value.test.ts           (6 tests)   9ms
 ✓ src/monte-carlo.test.ts     (5 tests) 214ms

 % Coverage report from v8
 File            | % Stmts | % Branch | % Funcs | % Lines
-----------------|---------|----------|---------|--------
 odds.ts         |     100 |      100 |     100 |     100
 vig.ts          |     100 |      100 |     100 |     100
 parlay.ts       |     100 |      100 |     100 |     100
 value.ts        |     100 |      100 |     100 |     100
 monte-carlo.ts  |     100 |      100 |     100 |     100

 Test Files  5 passed (5)
      Tests  32 passed (32)`;

const BAR_SHAPE = [3, 5, 9, 16, 27, 42, 61, 80, 94, 100, 96, 84, 68, 51, 37, 26, 18, 12, 8, 6, 9, 14, 21, 17, 11, 7, 4, 3];

const survivalColor = (p: number): string => (p > 0.4 ? '#34d399' : p > 0.15 ? '#f59e0b' : '#f43f5e');

export default function LandingPage() {
  const [locale, setLocale] = useLocale();
  const t = getDictionary(locale);

  let running = 1;
  const heroLegs = t.heroCard.legs.map((leg) => {
    running *= leg.p;
    return { ...leg, survival: running };
  });

  return (
    <div className="bg-canvas text-[#f4f4f5]">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-6 border-b border-hairline px-6 backdrop-blur-[14px] lg:px-10" style={{ background: 'rgba(9,9,11,.85)' }}>
        <span className="flex items-center gap-2.5">
          <Monogram />
          <span className="text-[15px] font-semibold tracking-[-.015em]">Devigo</span>
        </span>
        <nav className="flex flex-wrap items-center justify-end gap-4 text-[13px] text-[#a1a1aa] lg:gap-6">
          <a href="#engine" className="hidden shrink-0 whitespace-nowrap hover:text-[#f4f4f5] sm:inline">{t.nav.engine}</a>
          <a href="#proof" className="hidden shrink-0 whitespace-nowrap hover:text-[#f4f4f5] sm:inline">{t.nav.proof}</a>
          <a href="#pricing" className="hidden shrink-0 whitespace-nowrap hover:text-[#f4f4f5] sm:inline">{t.nav.pricing}</a>
          <a href="#license" className="hidden shrink-0 whitespace-nowrap hover:text-[#f4f4f5] md:inline">{t.nav.whiteLabel}</a>
          <LangSwitch locale={locale} onChange={setLocale} />
          <Link href="/panel" className="inline-flex min-h-[36px] shrink-0 items-center whitespace-nowrap rounded-lg bg-ev px-[15px] py-2 text-[12.5px] font-semibold text-ev-on hover:bg-ev-light">
            {t.nav.console}
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-[1360px] grid-cols-1 items-center gap-14 px-6 pb-[72px] pt-[56px] panel:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)] panel:pt-[88px] lg:px-10">
        <div className="min-w-0">
          <div className="inline-flex max-w-full items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap rounded-full border border-ev-subtle bg-ev-deep px-[11px] py-[5px] font-mono text-[11px] text-ev-light">
            <span className="dv-pulse h-[5px] w-[5px] rounded-full bg-ev" />
            {t.hero.badge}
          </div>
          <h1 className="mt-[22px] text-[40px] font-semibold leading-[1.03] tracking-[-.035em] [text-wrap:balance] md:text-[62px]">
            {t.hero.h1a}
            <br />
            <span className="text-ev">{t.hero.h1b}</span>
          </h1>
          <p className="mt-[22px] max-w-[560px] text-[17px] leading-[1.6] text-[#a1a1aa] [text-wrap:pretty]">{t.hero.body}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/panel" className="inline-flex min-h-[44px] items-center justify-center rounded-[10px] bg-ev px-[22px] py-[13px] text-sm font-semibold text-ev-on hover:bg-ev-light">
              {t.hero.ctaPrimary}
            </Link>
            <a href="#license" className="inline-flex min-h-[44px] items-center justify-center rounded-[10px] border border-[#27272a] px-[22px] py-[13px] text-sm font-medium text-[#f4f4f5] hover:border-[#3f3f46]">
              {t.hero.ctaSecondary}
            </a>
          </div>
          <div className="mt-11 flex flex-wrap gap-9 border-t border-hairline pt-[26px]">
            {t.metrics.map((metric) => (
              <div key={metric.label}>
                <div className={`font-mono text-[26px] font-semibold ${metric.accent ? 'text-ev' : 'text-[#f4f4f5]'}`}>{metric.value}</div>
                <div className="mt-[3px] max-w-[170px] text-xs leading-[1.4] text-[#71717a]">{metric.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-0 rounded-[18px] border border-[#1f1f25] p-[18px]" style={{ background: 'linear-gradient(180deg,#111116,#0c0c10)', boxShadow: '0 40px 80px -40px #000' }}>
          <div className="flex items-center justify-between px-1 pb-3.5">
            <span className="font-mono text-[11px] tracking-[.05em] text-[#71717a]">{t.heroCard.title}</span>
            <span className="font-mono text-[11px] text-ev">{t.heroCard.ev}</span>
          </div>
          <div className="flex flex-col gap-2">
            {heroLegs.map((leg) => (
              <div key={leg.label} className="flex items-center justify-between gap-3 rounded-[10px] border border-ctrl bg-card px-[13px] py-[11px]">
                <div className="min-w-0">
                  <div className="text-[12.5px] font-medium">{leg.label}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1 w-[120px] overflow-hidden rounded-sm bg-ctrl">
                      <div className="h-full transition-[width] duration-[350ms]" style={{ width: `${(leg.survival * 100).toFixed(1)}%`, background: survivalColor(leg.survival) }} />
                    </div>
                    <span className="font-mono text-[10px] text-[#71717a]">
                      {t.heroCard.survival(formatPercent(locale, leg.survival, 1))}
                    </span>
                  </div>
                </div>
                <span className="font-mono text-sm font-semibold">{leg.price}</span>
              </div>
            ))}
          </div>
          <div className="mt-3.5 grid grid-cols-3 gap-2">
            {t.heroCard.stats.map((stat, i) => (
              <div key={stat.label} className={`rounded-[10px] border px-3 py-[11px] ${i === 2 ? 'border-ev-border bg-ev-deep' : 'border-ctrl bg-card'}`}>
                <div className={`text-[10px] uppercase tracking-[.05em] ${i === 2 ? 'text-ev-light' : 'text-[#71717a]'}`}>{stat.label}</div>
                <div className={`mt-[3px] font-mono text-[17px] font-semibold ${i === 2 ? 'text-ev' : i === 1 ? 'text-model' : 'text-[#f4f4f5]'}`}>{stat.value}</div>
              </div>
            ))}
          </div>
          <div className="mt-3.5 rounded-xl border border-[#1f1f25] bg-sunken p-[13px]">
            <div className="flex items-center justify-between font-mono text-[10.5px] text-[#71717a]">
              <span>{t.heroCard.simLabel}</span>
              <span className="text-[#a1a1aa]">{t.heroCard.simHit}</span>
            </div>
            <div className="mt-2.5 flex h-14 items-end gap-[2px]">
              {BAR_SHAPE.map((h, i) => (
                <div key={i} className="flex-1 rounded-t-[2px]" style={{ height: `${h}%`, background: i > 18 ? '#34d399' : '#3f3f46' }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="engine" className="border-t border-hairline bg-band px-6 py-[72px] lg:px-10">
        <div className="mx-auto max-w-[1360px]">
          <div className="max-w-[660px]">
            <div className="font-mono text-[11px] tracking-[.08em] text-ev">{t.engine.kicker}</div>
            <h2 className="mt-3.5 text-[30px] font-semibold leading-[1.1] tracking-[-.03em] [text-wrap:balance] md:text-[38px]">{t.engine.title}</h2>
            <p className="mt-3.5 text-[15.5px] leading-[1.6] text-[#a1a1aa] [text-wrap:pretty]">{t.engine.body}</p>
          </div>
          <div className="mt-9 grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-3.5">
            {t.engine.modules.map((mod) => (
              <div key={mod.file} className="rounded-[14px] border border-edge bg-raised p-5 transition-colors hover:border-[#2c2c34]">
                <div className="font-mono text-[11px] text-ev">{mod.file}</div>
                <div className="mt-2.5 text-[15px] font-semibold tracking-[-.01em]">{mod.title}</div>
                <p className="mt-2 text-[13px] leading-[1.6] text-[#a1a1aa]">{mod.body}</p>
                <div className="mt-3.5 font-mono text-[11px] text-[#52525b]">{mod.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="proof" className="border-t border-hairline px-6 py-[72px] lg:px-10">
        <div className="mx-auto grid max-w-[1360px] grid-cols-1 items-center gap-14 panel:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
          <div>
            <div className="font-mono text-[11px] tracking-[.08em] text-ev">{t.proof.kicker}</div>
            <h2 className="mt-3.5 text-[30px] font-semibold leading-[1.1] tracking-[-.03em] [text-wrap:balance] md:text-[38px]">{t.proof.title}</h2>
            <p className="mt-3.5 text-[15.5px] leading-[1.6] text-[#a1a1aa] [text-wrap:pretty]">{t.proof.body}</p>
            <div className="mt-[26px] flex flex-col gap-2.5">
              {t.proof.points.map((point) => (
                <div key={point} className="flex items-start gap-2.5">
                  <span className="mt-1.5 h-[5px] w-[5px] shrink-0 rounded-full bg-ev" />
                  <span className="text-sm leading-[1.55] text-[#d4d4d8]">{point}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="overflow-hidden rounded-[14px] border border-edge bg-sunken">
            <div className="flex items-center gap-2 border-b border-edge bg-raised px-3.5 py-[11px]">
              <span className="h-[9px] w-[9px] rounded-full bg-[#3f3f46]" />
              <span className="h-[9px] w-[9px] rounded-full bg-[#3f3f46]" />
              <span className="h-[9px] w-[9px] rounded-full bg-[#3f3f46]" />
              <span className="ml-2 font-mono text-[11px] text-[#71717a]">pnpm test:cov — packages/core</span>
            </div>
            <pre className="m-0 overflow-x-auto p-[18px] font-mono text-xs leading-[1.75] text-[#a1a1aa]">{TERMINAL}</pre>
          </div>
        </div>
      </section>

      <section id="pricing" className="border-t border-hairline bg-band px-6 py-[72px] lg:px-10">
        <div className="mx-auto max-w-[1360px]">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-[600px]">
              <div className="font-mono text-[11px] tracking-[.08em] text-ev">{t.pricing.kicker}</div>
              <h2 className="mt-3.5 text-[30px] font-semibold leading-[1.1] tracking-[-.03em] [text-wrap:balance] md:text-[38px]">{t.pricing.title}</h2>
            </div>
            <div className="font-mono text-[11.5px] text-[#71717a]">{t.pricing.note}</div>
          </div>
          <div className="mt-[34px] grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3.5">
            {t.pricing.plans.map((plan) => (
              <div key={plan.name} className={`flex flex-col rounded-2xl border p-6 ${plan.highlight ? 'border-ev-border bg-ev-brand' : 'border-edge bg-raised'}`}>
                <div className="flex items-center justify-between gap-2.5">
                  <span className="text-sm font-semibold">{plan.name}</span>
                  <span
                    className={`whitespace-nowrap rounded-[5px] border px-[7px] py-[2px] font-mono text-[10px] ${
                      plan.highlight ? 'border-ev-border text-ev-light' : plan.b2b ? 'border-risk-border text-risk' : 'border-[#27272a] text-[#a1a1aa]'
                    }`}
                  >
                    {plan.tag}
                  </span>
                </div>
                <div className="mt-[18px] flex items-baseline gap-1.5">
                  <span className="font-mono text-4xl font-semibold tracking-[-.02em]">{plan.price}</span>
                  <span className="text-[13px] text-[#71717a]">{plan.period}</span>
                </div>
                <p className="mt-2.5 text-[13px] leading-[1.6] text-[#a1a1aa]">{plan.blurb}</p>
                <div className="mb-6 mt-5 flex flex-col gap-2">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-[9px]">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#52525b]" />
                      <span className="text-[13px] leading-[1.5] text-[#d4d4d8]">{feature}</span>
                    </div>
                  ))}
                </div>
                <Link
                  href="/panel"
                  className={`mt-auto block min-h-[44px] content-center rounded-[9px] border py-[11px] text-center text-[13.5px] font-semibold ${
                    plan.highlight ? 'border-ev bg-ev text-ev-on hover:bg-ev-light' : 'border-[#27272a] bg-transparent text-[#f4f4f5] hover:border-[#3f3f46]'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="license" className="border-t border-hairline px-6 py-[72px] lg:px-10">
        <div className="mx-auto flex max-w-[1360px] flex-wrap items-center justify-between gap-10 rounded-[18px] border border-ev-subtle p-6 md:px-10 md:py-9" style={{ background: 'linear-gradient(120deg,#0d1f19,#101014 60%)' }}>
          <div className="max-w-[620px]">
            <h2 className="text-[26px] font-semibold leading-[1.15] tracking-[-.025em] [text-wrap:balance] md:text-[30px]">{t.license.title}</h2>
            <p className="mt-3 text-[15px] leading-[1.6] text-[#a1a1aa] [text-wrap:pretty]">{t.license.body}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href="#pricing" className="inline-flex min-h-[44px] items-center rounded-[10px] bg-ev px-[22px] py-[13px] text-sm font-semibold text-ev-on hover:bg-ev-light">{t.license.cta}</a>
            <Link href="/panel" className="inline-flex min-h-[44px] items-center rounded-[10px] border border-[#27272a] px-[22px] py-[13px] text-sm font-medium text-[#f4f4f5] hover:border-[#3f3f46]">{t.license.ctaAlt}</Link>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-[1440px] flex-wrap justify-between gap-6 border-t border-hairline px-6 pb-11 pt-7 text-xs text-[#52525b] lg:px-10">
        <span>{t.footer.legal}</span>
        <span className="font-mono">core@0.1.0 · adapters@0.1.0 · i18n@0.1.0 · ui@0.1.0</span>
      </footer>
    </div>
  );
}
