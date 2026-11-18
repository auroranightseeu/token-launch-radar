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
