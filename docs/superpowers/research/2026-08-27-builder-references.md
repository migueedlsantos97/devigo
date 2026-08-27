# Builder redesign — competitor references

Notes gathered while reviewing sites the project owner picked out. Kept as
evidence for the redesign decisions, not as a list of things to copy: two of
these sell predictions ("our AI says this will happen"), which is the opposite
of what Devigo sells (what a price is really worth). Their *controls* and
*layout* are worth learning from; their *claims* are not.

## nerdytips.com/es — "Generador de Boletos"

Two columns: controls on the left, resulting slip on the right.

Controls, all on one panel:
- Target total odds, with an "automatic odds" toggle (free tier capped at 2.00)
- Number of selections — presets `Auto 2-5 / 5-10 / 10-15 / 15-20`, or a fixed number
- Ten market checkboxes (1X2, Over/Under 1.5/2.5/3.5, BTTS, Double Chance, …)
- Min/max odds *per selection*, each range annotated in plain words:
  "1.50–1.80: solo grandes favoritos", "2.00–2.50: equilibrado", "3.00+: alto riesgo"
- Match window: today / today+tomorrow / next 3 days
- Minimum confidence slider, tiers labelled "sólido" … "banker"
- Toggles: major leagues only, shortening odds only

Result: per selection shows league, time, team logos, market shorthand (U3.5),
a confidence badge (6.5/10) and the price. Summary gives total odds, average
confidence and win probability.

Worth taking: the density of control, the two-column arrangement, and above all
the plain-language annotation on every numeric range.
Worth rejecting: confidence-as-verdict framing.

## predictbet.ai — predictions feed + accumulator

Feed of match cards rather than a table. Each card: country flag + league,
kickoff, team logos (96px), recent form as a W/L/D letter run, the tip, a 🔥
"High Value" badge, and "Confidence 90% · High".

Its accumulator is **not** a builder — it publishes six AI-picked predictions
and the user takes them or leaves them. No total odds, combined probability or
payout shown. Filters exist for confidence and odds range.

Worth taking: cards over tables; recent form as a compact scannable run; a
single value badge that draws the eye.
Worth rejecting: a slip you cannot influence, and a summary that omits the
totals — the numbers Devigo exists to show.

## Read across both

1. Both give the eye an anchor per match — logos, flags, form runs. Devigo's
   board is text-only, which is why it reads as a spreadsheet.
2. Both put one prominent number per selection. Devigo currently shows three
   (fair price, edge, price) at similar weight, so nothing leads.
3. NerdyTips annotates every range in words. Devigo's three style pills carry
   their explanation in a tooltip, where it goes unread.
4. Neither hides the controls: the panel is the page. Devigo's builder is a
   thin strip above a board that dominates it.

## learningheroes.com — "IA para apuestas deportivas" (listicle)

Not a product: a promotional blog post rounding up five AI betting tools —
Predictbet.AI, InfinitySports.AI, Reggie el Robot, Leans.AI, WinnerOdds.
Contributes nothing to layout, but it maps the market Devigo is entering and
the language that market sells in.

What the pitch sounds like: "algoritmos predictivos", "análisis profundo de
datos", "entrenado con 5 millones de datos históricos". Volume and mystery.

What the whole article never mentions once: expected value, Kelly staking,
closing line value, market efficiency, realistic ROI. It does concede that no
tool guarantees winners, then keeps selling.

The gap is the positioning. Competitors promise *who wins*; the substance —
whether a price is worth taking, and what it costs when it isn't — is missing
from their marketing because it is missing from their products. Devigo's
numbers are exactly that substance. The redesign should therefore not bury the
fair price, the edge and the house's cut behind a "generate" button the way a
prediction tool would; those figures are the product, and the builder should
put them in front of the user, not behind a verdict.

## mysports.ai — closest competitor found so far

The first reference that speaks our language: EV as a percentage, Pinnacle as
the reference price, units instead of cash stakes, a published closing-line
value figure (+6.62%), and a downloadable 2022-2025 backtest. Where the others
sell a verdict, this one sells a number and shows its working.

Board layout — a table, not cards. Per row: crests, the pick, unit size (2-3),
the Pinnacle price, win probability, EV%, and a result marker. Confidence is a
three-star scale (Pro / Standard / Basic) rather than a raw score.

Filters: bet type (moneyline / spread / totals / parlays / correct score),
league, time window (upcoming / past / live), and confidence tier.

Two devices worth stealing outright:

1. **An inference diagram.** live odds → live score → historical matches → AI
   inference → confidence × EV. A picture of how the number was produced,
   printed next to the number. We compute far more defensible figures than they
   do and explain them nowhere; the user has already said the models are the
   part they do not understand.

2. **The optimal-odds-range breakdown.** Their tracker slices realised ROI by
   price band and points at 2.00-3.00. That is a finding about the user's own
   betting, not a prediction — the honest kind of insight, and one our history
   page has the data to produce.

Their retention hook is not the picks: it is bet tracking (30-second manual
entry, book import, auto-settlement from live scores) feeding a bankroll curve
with ROI by league, market, price band and book. Our /history page is the same
idea, unfinished.

Worth rejecting: "79% precision (BERT v4.8)" and "1,500+ features". Precision
without a stated market baseline is not a claim, and neither is a feature count.
Their own CLV figure is the number that means something. We should never print a
hit rate as a headline.

Note their comparison table pits them against "análisis" blogs and "odds tools"
— the second column is us. Their argument is that a raw odds tool leaves the
work to the user. The redesign answers that by doing the work while still
showing it, not by hiding it behind a verdict.

## polypredictr.com — prediction markets (Polymarket + Kalshi)

Different sport, same problem: a long list of priced propositions the user has
to triage. No builder, no slip, no combination tool — but the card is the
best-solved version of "one row, one price" we have seen.

Card anatomy (grid, `sm:2 / xl:3` columns):
- 48px market thumbnail, bold two-line title
- venue badge (POLYMARKET / KALSHI) + a `HOT` flame badge
- a bookmark button that only appears on hover
- **one focal proposition** in a recessed inner panel: the question in small
  grey text on the left, one big tabular-nums percentage on the right, a 1.5px
  progress bar underneath, and `+12 more options` in tiny text
- footer line: volume (`$49.8M`) · deadline with a clock icon

That inner panel is the device worth taking. A market with 13 runners renders
as **one** number plus a count of what is hidden. Our board does the opposite —
every runner, every price, at equal weight — which is exactly why it reads as a
spreadsheet. Showing the leading runner and collapsing the rest behind a count
would cut the visual noise without removing any information.

Volume as a footer figure is also worth stealing: it is a liquidity signal, and
the closest thing our board has is nothing. A price quoted by two books and a
price quoted by fifteen should not look identical.

Navigation is layered but light: tab row (Browse All / Trending / Highest Pay /
Bookmarked), then a scrolling row of ~20 category chips, then two dropdowns
(platform, sort). Plus a `RECENTLY VIEWED` strip with a CLEAR button, and a
"submit a market by URL" box that lets users add markets to everyone's feed.

`/copy-trade` is a leaderboard of eight traders with all-time P/L, win %,
prediction count, open positions and biggest win — gated behind "access unlocks
live trade alerts". A social layer bolted onto a data product.

Anti-patterns, both familiar:
- The hero counters read `MARKETS TRACKED 0` and `TOTAL VOLUME $0` while the
  feed below listed 586 markets. Placeholder metrics that were never wired up —
  the same disease we cured on our own landing.
- `AVG WIN RATE 72%` as a headline stat on the copy-trade page. Win rate without
  the prices paid is not a performance claim; a 90% hit rate at 1.05 loses money.
