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

## Live odds feed

`/api/odds` serves real markets from [The Odds API](https://the-odds-api.com) when an API key
is configured; without one the panel falls back to a fixture clearly badged **DEMO DATA**.

With a live feed the panel line-shops across every quoted bookmaker: each market carries a
per-book price matrix, the fair line is the **cross-book consensus** (each book de-vigged
independently, then averaged — `consensusProbabilities` in `@devigo/core`), and each runner
shows the **best available price** and the book offering it (`bestOffers`). Edge is measured
as best price × consensus probability − 1, which is how real +EV appears.

```bash
# local: create apps/web/.env.local with
ODDS_API_KEY=your_key_here

# production: add the env var to the Vercel project, then redeploy
vercel env add ODDS_API_KEY production
```

The key stays server-side (route handler); responses are cached for 5 minutes. The free tier
(500 requests/month) is enough for development against 4 leagues.

## PWA

The app ships a web manifest and icons — installable from Chrome/Edge/Android ("Install app")
and iOS Safari ("Add to Home Screen"). `start_url` is `/panel`. No service worker yet, so no
offline mode.

> Modelling tool, not betting advice. 18+. The landing's sample ticket is a hypothetical
> scenario computed live by `@devigo/core`; hero metrics state only verifiable product facts.

## Sign-in email (Supabase + Resend)

Supabase's built-in mailer is capped at a few messages an hour and is meant
for testing, so account sign-in needs a real SMTP sender. Codes are sent from
`warden.website`, which the project owns.

The domain still carries `MX → secureserver.net` and an SPF record pointing
at GoDaddy, but that mailbox subscription was cancelled: the records are
leftovers, and there is no `autodiscover` entry, so nothing is receiving mail
there. Replacing the stale SPF record is therefore safe. (Had the mailbox been
live, the right move would have been a dedicated subdomain so the working
record was never touched.)

Setup, once:

1. Resend → **Domains → Add Domain** → `warden.website`.
2. Resend shows the records to add. In GoDaddy's DNS editor the **Name** field
   is relative to the domain, so `@` means the domain itself:

   | Action | Type | Name | Value |
   | --- | --- | --- | --- |
   | **Replace** the existing SPF | TXT | `@` | `v=spf1 include:amazonses.com ~all` |
   | Add | TXT | `resend._domainkey` | the `p=MIG...` key Resend shows (unique per account) |
   | Add | MX | `send` | `feedback-smtp.<region>.amazonses.com`, priority 10 |

   There must be exactly one SPF (`v=spf1`) record on `@` — two of them is an
   error that makes checks fail, so edit the old one rather than adding a second.
   Leave the root `MX` records alone; they only affect incoming mail, which
   this feature does not use.

3. Wait for Resend to report the domain verified (usually minutes).
4. Resend → **API Keys → Create**, scope it to sending.
5. Supabase → **Project Settings → Authentication → SMTP Settings**:

   | Field | Value |
   | --- | --- |
   | Host | `smtp.resend.com` |
   | Port | `465` |
   | Username | `resend` |
   | Password | the Resend API key |
   | Sender email | `acceso@warden.website` |
   | Sender name | `Devigo` |

The API key is a send credential: keep it in Supabase's settings only — it
belongs in neither this repo nor the client bundle.
