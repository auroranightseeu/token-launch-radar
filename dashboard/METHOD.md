# Signal: sealed-snapshot method

## Evidence and coverage
This offline page uses the sealed 758-protocol snapshot from DefiLlama's public protocols endpoint, dated 2026-11-14. No live price, campaign, URL or reward information is inferred. “Pre-token” means the snapshot records null market cap, symbol and CoinGecko ID; absence of a record does not prove absence of a token. The separate Already trading view contains the other 416 records, with reported market caps rather than scenario values.

Coverage audit: 342 records have all three token fields null: 132 at or above $50M and 210 below. Below the floor, isRankable's observable category/name exclusions leave 138 of 210. At/above the floor, the authoritative watchlist contributes 40 of 132; it additionally accounts for the kit's unavailable parentProtocol field. Together these yield 178 records. Applying only the observable exclusions across all sizes would yield 198, not 178: 20 additional above-floor records are conservatively omitted because they are absent from the authoritative watchlist. buildRadar ranks all 178, not just the watchlist. The other 164 records are omitted, not silently ranked as prospective launches. Exclusions are CEX, Bridge, Canonical Bridge, Liquid Staking, Liquid Restaking, Restaked BTC; terminal version markers; whole words wrapped, staked, staking; and exchange-prefixed names. These products are not independent tokens waiting to launch under the kit's interpretation. The supplied watchlist remains authoritative at the floor: parentProtocol is not present in the snapshot, so below-floor parent independence cannot be verified. Coverage is exhaustive under these observable exclusions, not proof of 178 independent future launches.

## impliedValue(): same rule for every protocol
Retained radar-2 without tuning names or ranks. Its only varying inputs are TVL, seven-day TVL growth, and days since listing at the snapshot date (the available proxy for tokenless age). Identity, category, chain, rank and market cap do not affect the scenario value.

B = 20,000,000 * log2(1 + TVL / 50,000,000)
g = clamp(reported 7d percentage, -60, 100)
G = exp(g / 100) for negative g; otherwise 1 + 0.35 * ln(1 + g / 100)
M = 0.65 + 0.55 * (1 - exp(-age / 540))
V = max(1, round(B * G * M)) dollars

The log base gives diminishing returns to locked capital: $50M produces $20M base, $150M produces $40M. TVL is not revenue or tokenholder equity. The $20M scale is an explicit analyst assumption, not a fitted market multiple. Growth is asymmetric because outflows warrant a stronger haircut than transient inflows warrant a premium. Clamping limits one-week extremes: G ranges about 0.549 to 1.243. M rises from 0.65 toward 1.20, with 540-day decay scale; long survival earns bounded credit, never unlimited age premium. These are conservative scenario choices, not statistically calibrated forecasts. TVL still dominates much of the ranking; forcing large rearrangements without revenue, fees or tokenomics would invent evidence.

Listing age = max(0, floor((snapshot day - listed_at) / one day)). It measures time tracked, not deployment date or verified time without a token. Null age uses 180 days; null growth uses 0%, visibly marked unknown in the page. Null and observed zero are not equivalent evidence. Rounded display factors do not replace full-precision arithmetic. The detail view displays B, G and M so readers can reproduce V. No launch date, probability, circulating supply or token distribution is predicted; this is not a price target or expected reward.

## farmSteps(): a bounded research and product-use recipe
Six steps per row carry that protocol's exact TVL, reported growth, listing age, implied scenario value, first two listed chains and total chain count. Chain order is inherited from the snapshot: per-chain TVL is absent, so these are NOT proven largest chains. Operate on one independently verified deployment, not every chain. Implied value is context, not an allocation recommendation.

TVL sets a deliberately small capital ceiling: below $50M = early/$50; $50M to below $1B = floor/$100; $1B+ = large/$150. Capital can be lost in full; it is separate from gas and product fees. The category playbook supplies a concrete core action: for example, lending supplies without borrowing; DEX use tests a small useful swap and supported stable pair; derivatives cap test margin at $10 and promptly close. Verify that action exists in official documentation before using it. If minimums exceed the ceiling or mechanics are unclear, observe instead. No snapshot field verifies a specific asset, deployment, vault, campaign or action's availability.

Prepare (15 minutes), test entry (20–30 minutes), weekly review (10 minutes), exit test/review (5 minutes), disclosure check (5 minutes weekly), and local ledger/revocation (5 minutes/session). First-listed Ethereum reserves $5–20 per transaction; other networks reserve $0.20–3. These are planning ranges, not network quotes or guaranteed upper bounds. Read actual gas, spread, entry/exit and funding fees; stop if uneconomic. Product fees and losses are additional. Review horizon is 60 days for listing age below 180 days, 45 for 180–729 days, 30 for 730+; unknown age uses 45 days. This is a review schedule, not a required lock or reward qualification period. Queue delays may extend exit. Negative reported growth triggers an explicit liquidity caution; all plans test an exit before repeating activity.

Record transactions and costs, avoid manufactured volume and leverage, and never assume a launch or eligibility. Check only verified protocol disclosures for any actual rewards rules. No campaign, points program or claim entitlement is asserted.

## Reading the page and limits
Sort column headings; search name/slug; filter category, TVL or watchlist; open any row for arithmetic and six cost/time steps. Live-token records stay outside pre-token ranks. There is no network dependency. Model code and board data live outside this dossier's source text; this document describes their implementation, while screenshots must be re-rendered from the matching output before submission.

Missing evidence includes audits, exploit history, per-chain liquidity, revenue, valuation comparables, official app addresses, ownership, tokenomics, eligibility, jurisdiction and fees. TVL can be double-counted or borrowed; a seven-day change can reflect prices rather than adoption. More chains do not establish safety. No score substitutes for independent contract, liquidity and eligibility checks.
