# Devigo

Turborepo monorepo for a quantitative +EV betting platform: Shin de-vig, correlation-aware
parlay probability, fractional Kelly sizing, and 10,000 seeded Monte Carlo settlements per ticket.

```
apps/
  web/                Next.js 14 App Router — landing (/) + live ticket builder (/panel)
packages/
  core/               @devigo/core     — pure maths, zero runtime deps, 100% coverage gate
  adapters/           @devigo/adapters — OddsAdapter interface + The Odds API implementation
  i18n/               @devigo/i18n     — typed ES/EN dictionaries + Intl formatters
  ui/                 @devigo/ui       — design tokens
```

## @devigo/core

| Module | Responsibility |
| --- | --- |
| `odds.ts` | Decimal / American / fractional conversion, implied probability, book margin |
| `vig.ts` | Multiplicative, additive and Shin (1993) margin removal (iterative z solve) |
| `parlay.ts` | Price accumulation, correlation-matrix-adjusted joint probability, survival curve |
| `value.ts` | EV, edge, fractional Kelly floored at zero, value-bet scanner |
| `monte-carlo.ts` | Seeded 10k-iteration ticket settlement, percentiles, drawdown, decay |

All simulation runs on a deterministic xorshift128 PRNG — the same ticket reproduces the same
variance report on any machine. Coverage thresholds fail the build below 100% on lines,
branches, functions and statements.

## Quickstart

```bash
pnpm install
pnpm test        # all workspace test suites (core 34 · i18n 3 · adapters 3)
pnpm test:cov    # core with the 100% coverage gate
pnpm typecheck
pnpm build
pnpm dev         # web on http://localhost:3000
```

## Web app

- `/` — landing. Bilingual ES/EN (persisted under `localStorage["devigo:lang"]`).
- `/panel` — market board + ticket builder. Every click recomputes de-vigged fair prices,
  joint probability (uniform-rho correlation slider), EV, ¼-Kelly and the 10k-run Monte Carlo
  histogram synchronously via `@devigo/core`.

Market rows in `apps/web/src/lib/markets.ts` are fixture data matching the design handoff.
Swap them for the live feed via `@devigo/adapters` behind a route handler that keeps the API
key server-side (`createTheOddsApiAdapter` → `toFairMarkets`).

> Modelling tool, not betting advice. 18+. Landing metrics (4.7% / +3.1% / 41k bets) are
> placeholder claims from the design prototype — replace with real figures or remove before
> publishing.
