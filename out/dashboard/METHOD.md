# Signal: sealed-snapshot method

## Evidence and coverage
This offline page uses the sealed 758-protocol snapshot dated 2026-11-14. No live price, campaign, URL or reward information is inferred. “Pre-token” means the snapshot records null market cap, symbol and CoinGecko ID; absence of a record does not prove absence of a token. The separate Already trading view contains the other 416 records, with reported market caps rather than scenario values.

The board includes every watchlist protocol OR every protocol accepted by `isRankable`, at any TVL. There is no TVL-floor exclusion. This yields 198 ranked protocols: 40 watchlist and 158 early. All 758 are accounted for in the runtime audit: ranked, live, bridge, liquid, exchange, versioned, wrapped, or other. The audit is recomputed from the snapshot; `other` must be zero. Observable exclusions are CEX, Bridge, Canonical Bridge, Liquid Staking, Liquid Restaking, Restaked BTC; terminal version markers; whole words wrapped, staked, staking; and exchange-prefixed names. These products are not independent tokens waiting to launch under the kit's interpretation. Coverage is exhaustive under these observable exclusions, not proof of 198 independent future launches.

## impliedValue(): same rule for every protocol
Retained radar-3: the radar-2 form, now with a scale fitted to the snapshot instead of an assumed $20M (see Calibration below). Its only varying inputs are TVL, seven-day TVL growth, and days since listing at the snapshot date (the available proxy for tokenless age). Identity, category, chain, rank and market cap do not affect the scenario value.

B = 16,018,538 * log2(1 + TVL / 50,000,000)
g = clamp(reported 7d percentage, -60, 100)
G = exp(g / 100) for negative g; otherwise 1 + 0.35 * ln(1 + g / 100)
M = 0.65 + 0.55 * (1 - exp(-age / 540))
V = max(1, round(B * G * M)) dollars

The log base gives diminishing returns to locked capital: $50M produces $16.0M base, $150M produces $32.0M. TVL is not revenue or tokenholder equity. The scale is now a fitted market multiple (see Calibration), not an assumed round number. Growth is asymmetric because outflows warrant a stronger haircut than transient inflows warrant a premium. Clamping limits one-week extremes: G ranges about 0.549 to 1.243. M rises from 0.65 toward 1.20, with 540-day decay scale; long survival earns bounded credit, never unlimited age premium. These are conservative scenario choices, not statistically calibrated forecasts. TVL still dominates much of the ranking; forcing large rearrangements without revenue, fees or tokenomics would invent evidence.

## Calibration (radar-3)
The radar-2 scale ($20M) was an analyst assumption that had never been checked against a market price. Radar-3 fits it on the snapshot's own protocols that already trade, so the level is anchored to real market caps instead of a round number.

Calibration set: the 128 protocols with mcap_usd > 0 and tvl_usd > 0, out of 758. Excluded: 614 with mcap null (no token recorded), 15 with mcap == 0 (dead project or data error), 1 with mcap < 0 (autofinance, a data error), 0 with mcap between 0 and $1, and 0 with tvl <= 0 — every protocol with mcap > 0 also has tvl > 0, verified. Fit: S = exp(mean over the 128 of (log(mcap) − log(B0·G·M))), where B0·G·M is the radar-2 form with the scale removed. Result: S = $16,018,538, ratio 0.800927 against the assumed $20M. Radar-2 overstated values by a mean log bias of +0.222 (about 25% high on average).

Holdout: 5-fold, fold = index % 5 of the calibration list sorted by slug (deterministic). Each fold's scale is fitted on the other four folds only. Out-of-fold metrics, from the runtime's own computation on the sealed snapshot:

| | radar-2 (fixed $20M) | radar-3 (per-fold fitted scale) |
|---|---|---|
| median absolute log error | 1.296 | 1.267 |
| mean absolute log error | 1.642 | 1.681 |
| bias (mean log(pred) − log(actual)) | +0.222 | +0.001 |
| Spearman rank correlation (pooled) | 0.428 | 0.376 |

Per-fold fitted scales: $11.8M / $20.2M / $18.7M / $15.4M / $15.3M. The pooled Spearman needs an honest note: within any single fold the ranking is identical for radar-2 and radar-3 (a pure scale change cannot re-rank), and the final board (one global fitted scale) has exactly the same order as round 2. The pooled figure differs only because each fold is predicted with a different fitted scale, so pooling folds changes the pooled ranking. Do not read the pooled 0.376 as a ranking loss.

What was tried and rejected: a full refit (OLS of log(mcap) on log B0, growth and log age) gives a growth coefficient of −0.04 per point — negative, inconsistent with a growth premium — and the age coefficient flips sign across folds (+0.02, +0.04, −0.18, +0.05, −0.17), so there is no stable age signal either. Its out-of-fold median is 1.308 and Spearman 0.350, worse than scale-only. A TVL power law (exponent 0.522) gives out-of-fold median 1.283 and Spearman 0.362, also worse. The radar-2 G and M forms are therefore kept as a conservative prior, not fitted to noise.

What the calibration does and does not do: it removes the level bias (bias +0.222 → +0.001) and lowers the median error (1.296 → 1.267) — a real, measured correction of the model's level. It does not re-rank anything, and the mean error is slightly worse (1.642 → 1.681), because the error distribution is skewed and the median is the robust centre here. Limits: the token-having population is older and larger than the pre-token board, so a scale fitted on it centres the level but does not guarantee pre-token ranking. The board values all fall by ×0.801 (top $113,529,413 → $90,928,759, bottom $1,673,067 → $1,340,004); the order is unchanged.

Listing age = max(0, floor((snapshot day - listed_at) / one day)). It measures time tracked, not deployment date or verified time without a token. Null age uses 180 days; null growth uses 0%, visibly marked unknown in the page. Null and observed zero are not equivalent evidence. Rounded display factors do not replace full-precision arithmetic. The detail view displays B, G and M so readers can reproduce V. No launch date, probability, circulating supply or token distribution is predicted; this is not a price target or expected reward.


## Round 4 netted farm verdicts and value bands
For each row, the dashboard shows a planning verdict at a selectable deposit ($1,000 or $10,000) and assumed drop share (3.5%, 7%, or 14%). The headline is $1,000 at 7%. The drop share is an assumption: no snapshot field proves that a drop exists or will be claimable. The verdict is a planning aid, not a profit promise.

The V1 full-leg net is: `slice = drop_share * implied_value * (deposit / TVL)`; `net = slice - gas - spread - forgone`. Gas is the mid estimate of $12.50 per transaction on Ethereum or $1.60 otherwise, multiplied by `3 + hold/7` for one entry, one transaction per active week, exit, and revocation. Spread is 0.3% of deposit. Forgone return is a 4% T-bill rate times hold/365 times deposit. Hold is 45 days for unknown age, 60 for age below 180 days, 45 for age below 730 days, and 30 otherwise. FARM requires net > 0; MARGINAL is net > -(gas + spread); otherwise SKIP. Verdicts are computed at the point estimate, never at the low end of the uncertainty band.

Every implied value also shows a bootstrap uncertainty band: point value multiplied by 0.789 to 1.259, derived from P10 $12,639,026 and P90 $20,168,947 around the fitted $16,018,538 scale. This is a broad value-model uncertainty display, not a confidence interval or price target. The calibration panel retains the 128-protocol out-of-fold metrics, including median miss ×3.55.

Six steps per row carry that protocol's exact TVL, reported growth, listing age, implied scenario value, first two listed chains and total chain count. Chain order is inherited from the snapshot: per-chain TVL is absent, so these are NOT proven largest chains. Operate on one independently verified deployment, not every chain. Implied value is context, not an allocation recommendation.

TVL sets a deliberately small capital ceiling: below $50M = early/$50; $50M to below $1B = floor/$100; $1B+ = large/$150. Capital can be lost in full; it is separate from gas and product fees. The category playbook supplies a concrete core action: for example, lending supplies without borrowing; DEX use tests a small useful swap and supported stable pair; derivatives cap test margin at $10 and promptly close. Verify that action exists in official documentation before using it. If minimums exceed the ceiling or mechanics are unclear, observe instead. No snapshot field verifies a specific asset, deployment, vault, campaign or action's availability.

Prepare (15 minutes), test entry (20–30 minutes), weekly review (10 minutes), exit test/review (5 minutes), disclosure check (5 minutes weekly), and local ledger/revocation (5 minutes/session). First-listed Ethereum reserves $5–20 per transaction; other networks reserve $0.20–3. These are planning ranges, not network quotes or guaranteed upper bounds. Read actual gas, spread, entry/exit and funding fees; stop if uneconomic. Product fees and losses are additional. Review horizon is 60 days for listing age below 180 days, 45 for 180–729 days, 30 for 730+; unknown age uses 45 days. This is a review schedule, not a required lock or reward qualification period. Queue delays may extend exit. Negative reported growth triggers an explicit liquidity caution; all plans test an exit before repeating activity.

Record transactions and costs, avoid manufactured volume and leverage, and never assume a launch or eligibility. Check only verified protocol disclosures for any actual rewards rules. No campaign, points program or claim entitlement is asserted.

## Reading the page and limits
Sort column headings; search name/slug; filter category, TVL or watchlist; choose deposit and drop-share assumptions; open any row for arithmetic, band and six cost/time steps. Live-token records stay outside pre-token ranks. There is no network dependency. Model code and board data live outside this dossier's source text; this document describes their implementation, while screenshots must be re-rendered from the matching output before submission.

Missing evidence includes audits, exploit history, per-chain liquidity, revenue, valuation comparables, official app addresses, ownership, tokenomics, eligibility, jurisdiction and fees. TVL can be double-counted or borrowed; a seven-day change can reflect prices rather than adoption. More chains do not establish safety. No score substitutes for independent contract, liquidity and eligibility checks.

## Round 5 integrity strip and set-aside ledger
The cover carries an INTEGRITY strip whose every number is recomputed in the
browser from the sealed snapshot build (`window.RADAR`) and the rendered
table — nothing in it is hardcoded. Checks: (1) table rows = board.json
(198/198); (2) ranks 1–198 sequential and implied values non-increasing;
(3) totals match, 758 = 198 ranked + 560 set aside; (4) checksum; (5)
watchlist 40/40; (6) ledger 758/758 protocols accounted for.

Checksum recipe (FNV-1a 32-bit): for every board row in rank order, take
`slug:implied_value_usd`, join the 198 strings with `|`, hash with FNV-1a
(offset 0x811c9dc5, prime 0x01000193, unsigned 32-bit), render as 8 lowercase
hex digits. Recompute from `board.json` with the same recipe to verify the
strip; any change to a slug, a value, or the row order changes the checksum.

Set aside (560, never ranked): the protocols the board excludes by design —
416 already trading (a token exists), 43 bridge, 43 liquid staking /
restaking, 42 exchange / CEX, 11 versioned, 5 wrapped / staked. They are
accounted for in the audit ledger (758 = 198 ranked + 560 set aside + 0
other) and listed on the "Already trading" tab where a market cap exists.
Ranking stays 198; the value model is unchanged.

## Round 5 fitted value model (item 2 — method locked before seeing results)
The value model is a fitted size curve: log(value) = 6.964567 + 0.522266 ×
log(TVL), OLS on the 128 protocols that already trade (mcap > 0, TVL > 0).
It replaces the round-4 B × G × M form. Growth, family and age are NOT in
the model — they were tested held-out and not kept (see below).

Method (locked before any number was seen): baseline = flat median multiple
(median mcap/TVL × TVL) on the 128 tokened protocols. Candidates added in
this order: (1) size curve log TVL (OLS), (2) family effect (ridge,
lambda=10), (3) 7d TVL growth, (4) age (log age, missing listed_at → 180d).
Two tests, metric = median |log(pred) − log(actual)| (median log miss,
lower is better): leave-one-out over all 128, and walk-forward (95 with a
listing date: 63 oldest fit, 32 newest predicted — early listings predict
the new ones). A term is KEPT only if it lowers the median miss in BOTH
tests; otherwise it is shown as "tested, not kept". No term, split, lambda
or metric was changed after seeing the numbers.

Results (term × two tests):
- baseline (flat median multiple): LOO 1.6233, WF 1.6823 — baseline.
- + size curve (log TVL): LOO 1.2234, WF 1.0571 — KEPT (both lower).
- + family effect (ridge): LOO 1.3173, WF 0.8910 — tested, not kept
  (LOO worse than size-only 1.2234, though WF improved).
- + 7d TVL growth: LOO 1.3253, WF 1.1411 — tested, not kept (both worse).
- + age: LOO 1.2866, WF 2.2132 — tested, not kept (both worse).
Final model: size only. Held-out median log miss LOO 1.2234 / WF 1.0571
(vs baseline 1.6233 / 1.6823). The fit script is /tmp/fit-r5-item2.py.

Effect on the board: ranking is now a pure power law in TVL (exponent
0.52), so 188 of 198 positions moved vs round 4. Top 10 before → after:
steakhouse-financial → sentora-curator, sentora-curator →
steakhouse-financial, gauntlet and veda hold 3rd/4th, usdd holds 5th,
nonce-capital and bittensor-dtao enter the top 10. Watchlist stays 40/40
(membership does not depend on ranking). The value bands (0.789 / 1.259)
are still the round-4 bootstrap of the old scale — they are NOT the new
model's uncertainty; the new model's held-out median log miss is 1.2234
(LOO) / 1.0571 (WF), i.e. roughly a ×3.4 / ×2.9 factor.

## Round 5 honest per-row ranges (item 3)
Every implied value carries an honest range from the held-out residuals of
the size curve — not a bootstrap of the old scale. LOO residuals
(log actual − log predicted) over the 128 tokened protocols: P25 −1.1841,
P75 +1.4343, P10 −2.7825, P90 +2.1551. As multipliers on the implied value:
P25–P75 ×0.306–×4.197, P10–P90 ×0.062–×8.629. The bands are wide because
the model is uncertain (median log miss 1.22 ≈ ×3.4) — that is the honest
picture, not a defect of the display. Each board row shows its P25–P75
range in the table and both ranges in the detail view; verdicts are netted
at the POINT estimate, never at a band edge.

Coverage — % of actual market caps inside the LOO-derived bands, as-is:
- LOO (128): P25–P75 50.0% (64/128), P10–P90 79.7% (102/128).
- Walk-forward (32 newest, same LOO bands): P25–P75 56.2% (18/32),
  P10–P90 75.0% (24/32) — below the nominal 80%, reported as-is.
The walk-forward residuals are shifted up (median +0.56 log: newer
protocols trade above what the older fit predicts), so the P10–P90 band
misses a quarter of them on the high side. Script: /tmp/bands-r5-item3.py.

Farm verdicts are recomputed from the fitted (round-5) implied values at
build time and the dashboard's verdict summary counts the same board rows,
so the table and the summary agree. Headline $1,000 / 7%: round 4
FARM 67 / MARGINAL 124 / SKIP 7 → round 5 FARM 74 / MARGINAL 117 / SKIP 7.

## Round 5 token odds (item 4)
The shown implied value is a SCENARIO (expected) value: value-if-launch
× token odds. The value-if-launch is the fitted size curve (item 2); the
odds come from a logistic regression predicting whether a protocol has a
token signal. Method LOCKED before seeing results; forward selection in
the given order; a term is kept only if the Brier score falls in BOTH
10-fold and walk-forward.

Label: y=1 if NOT pre-token (market cap OR CoinGecko ID OR symbol present):
416/758, base rate 54.88%. y=0 if pre-token (all three null): 342.
Note: only 128 have a recorded market cap > 0; the other 288 of the 416
carry a symbol (and usually a CoinGecko ID) with no recorded cap — the
label is "has any token signal", not "has a measurable cap".

| term (added in order) | 10-fold Brier | walk-forward Brier | kept? |
|---|---|---|---|
| base rate | 0.2476 | 0.2873 | baseline |
| + listing age (log) | 0.2416 | 0.2801 | KEPT |
| + category (ridge, lam=10) | 0.2226 | 0.2760 | KEPT |
| + log TVL | 0.2211 | 0.2760 | KEPT |
| + 7d growth | 0.2168 | 0.2758 | KEPT |

All four terms kept. Final Brier 0.2168 / 0.2758 vs base 0.2476 / 0.2873.
The log-TVL and 7d-growth walk-forward gains are small (0.00003 and
0.00015) but strictly down in both tests, so they meet the keep rule.
10-fold: stratified, seed 7. Walk-forward: 645 protocols with listed_at,
430 oldest fit, 215 newest predicted. Numeric features standardised from
the training set; intercept unpenalised; numeric ridge lam=1; category
one-hot lam=10. Missing listed_at → 180d; missing change_7d (4) → 0.
Script: /tmp/odds-r5-item4.py.

Odds for the 198 ranked range 0.027–0.857 (median 0.490). Ranking is by
the scenario value, so it changes with the odds (193/198 positions vs
the value-if-launch ranking). Verdicts are netted at the scenario value.
The honest bands (item 3) are the value-model uncertainty, applied as
multipliers on the scenario value; the odds themselves carry additional
uncertainty that is not banded here.

## Round 5 farm plan cleanup (item 5)
The six-step field plan now shows its snapshot header ONCE above the
steps (protocol, TVL, chains, age, 7d change, implied value, tier,
at-risk capital); each step carries only its action + COST + TIME,
differentiated per step. The values, odds, ranking and verdicts are
unchanged — only the plan text was restructured.

What the plan costs are computed from, and what is assumed:
- Gas: the verdict model charges a point estimate per tx (Ethereum
  $12.50, other chains $1.60 — gasMid). The plan steps quote an assumed
  RANGE instead ($5–20 Ethereum, $0.20–3 others) because the snapshot
  has no gas data; the range is an assumption, not a measurement.
- At-risk capital by TVL tier ($150 large ≥$1B, $100 floor ≥$50M, $50
  early): assumed sizing, not a snapshot field.
- Hold by age (60d <180d, 45d <730d, 30d older, 45d unknown) and the $5
  test withdrawal: sizing rules, not measurements.
- Spread 0.3% of deposit and forgone T-bill 4% are the verdict model's
  stated assumptions; drop share (7%) and deposit ($1,000) are the
  headline scenario. All of these are written on the plan itself.

Odds table now also shows the Brier difference vs the base rate per term
(10-fold and walk-forward), as-is: age −0.0060/−0.0072, category
−0.0250/−0.0113, log TVL −0.0265/−0.0113, 7d growth −0.0308/−0.0115.
Method unchanged.

Odds are applied exactly ONCE: tokenOdds() is called in one place
(buildRadar) and the scenario value is value-if-launch × odds. The
verdict model then uses the scenario value directly (slice = drop ×
scenario × deposit/TVL) and never multiplies by the odds again.
Verified by code trace (single call site) and numerically (scenario ==
round(launch × odds) within the 4-decimal display rounding).

## Round 5 item 6: label detail + delta inkremental + ambang verdict
- Detail protokol kini memisahkan dua label: "Value model: size curve
  only — growth/age tested, not kept" dan "Odds model: log age, category,
  log TVL, 7d growth — all kept". Nilai growth/age per baris tetap tampil.
- Tabel odds kini menampilkan delta INKREMENTAL per term (vs term
  sebelumnya, 5 desimal) di samping delta vs base: age −0.00603/−0.00720,
  kategori −0.01895/−0.00411, log TVL −0.00156/−0.00003, 7d growth
  −0.00428/−0.00015. Aturan terkunci: term dipakai hanya bila Brier
  turun di KEDUA tes. Semua 4 term turun di kedua tes (semua delta
  inkremental negatif, termasuk log TVL walk-forward −0.00003 dan 7d
  growth −0.00015 yang tipis tapi turun) — jadi semua tetap KEPT,
  tidak ada yang ditandai "tested, not kept", dan tidak ada hitung
  ulang: odds, ranking, verdict, watchlist 40/40, strip dan checksum
  AE53F448 IDENTIK sebelum/sesudah item 6.

Ambang verdict (headline $1,000 / 7% drop), dari farmVerdict:
  net = slice − gas − spread − forgone
  slice = 0.07 × implied_value × (1000 / TVL)
  gas = gasMid(chain) × (3 + hold/7); gasMid Ethereum $12.50, lain $1.60
  spread = 0.3% × 1000 = $3.00; forgone = 4% × hold/365 × 1000
  FARM bila net > 0 (slice > gas+spread+forgone)
  MARGINAL bila −(gas+spread) < net ≤ 0 (forgone < slice ≤ gas+spread+forgone)
  SKIP bila net ≤ −(gas+spread) (slice ≤ forgone)
  Contoh ambang slice: Mantle hold 30d FARM bila slice > $17.94;
  Ethereum hold 30d FARM bila slice > $97.36 (gas $91.07). Karena itu
  ke-10 FARM (7%/$1.000) semuanya di chain non-Ethereum.
  Net per jam = net / (hands-on menit / 60). Dari 10 FARM, 7 punya
  net/jam < $5 (agni $1.33, fstswap $3.47, vesu $4.83, byreal $0.59,
  granite $2.09, nucleus $4.52, btcfi-cdp $3.84); hanya 3 ≥ $5
  (katana-dex $7.54, syncswap $7.12, metalx-swap $5.58).
