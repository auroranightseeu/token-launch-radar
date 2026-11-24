// Round 5 item 2 — FITTED value model (locked method, evaluated once).
// log(mcap) = 6.964566512435253 + 0.5222655485140022 * log(TVL), OLS on the
// 128 tokened protocols (displayed rounded as 6.9646 + 0.5223 × log(TVL)).
// Held-out (median log miss): LOO 1.2234, walk-forward 1.0571.
// Baseline flat median multiple: LOO 1.6233, WF 1.6823.
// Family (ridge), 7d growth, age tested and NOT kept — none reduced the miss
// in BOTH tests, so growth and maturity multipliers are 1 (neutral).
// Fit script: /tmp/fit-r5-item2.py (method locked before seeing results).
export const MODEL_VERSION = 'radar-5';
export const FIT_INTERCEPT = 6.964566512435253;
export const FIT_SLOPE = 0.5222655485140022;
export const FIT_TABLE = [
  {term: 'baseline (flat median multiple)', loo: 1.6233, wf: 1.6823, kept: 'baseline'},
  {term: '+ size curve (log TVL)', loo: 1.2234, wf: 1.0571, kept: 'KEPT'},
  {term: '+ family effect (ridge)', loo: 1.3173, wf: 0.8910, kept: 'tested, not kept'},
  {term: '+ 7d TVL growth', loo: 1.3253, wf: 1.1411, kept: 'tested, not kept'},
  {term: '+ age', loo: 1.2866, wf: 2.2132, kept: 'tested, not kept'},
];
export const FIT_HELDOUT = {loo_median_miss: 1.2234, wf_median_miss: 1.0571,
  baseline_loo: 1.6233, baseline_wf: 1.6823};
export const parseSnapshot = text => JSON.parse(text);
export const isPreToken = p => p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
export function isRankable(p) {
  return isPreToken(p) && !['CEX','Bridge','Canonical Bridge','Liquid Staking','Liquid Restaking','Restaked BTC'].includes(p.category)
    && !/\s(?:v\d+(?:\.\d+)*|\d+\.\d+)$/i.test(p.name)
    && !/\b(?:wrapped|staked|staking)\b/i.test(p.name)
    && !/^(?:Binance|Coinbase|Bybit|Kraken|Bitget|OKX|Bitfinex|Gemini)/i.test(p.name);
}
export function impliedValue(p, asOf, scaleUsd = 20000000) {
  const age_days = p.listed_at ? Math.max(0, Math.floor((Date.parse(asOf)-Date.parse(p.listed_at))/86400000)) : null;
  const effective_age_days = age_days ?? 180;
  const growth_pct = Math.max(-60, Math.min(100, p.change_7d ?? 0));
  // Fitted size curve only: growth and maturity are 1 (tested, not kept).
  const log_tvl = Math.log(p.tvl_usd);
  const base_usd = Math.exp(FIT_INTERCEPT + FIT_SLOPE * log_tvl);
  return {age_days, effective_age_days, growth_pct, base_usd, growth_multiplier: 1, maturity_multiplier: 1,
    intercept: FIT_INTERCEPT, slope: FIT_SLOPE, log_tvl,
    implied_value_usd:Math.max(1,Math.round(base_usd))};
}
// Calibration for the round-5 fitted model. The intercept/slope and the
// held-out medians come from the locked round-5 item-2 fit (Python,
// /tmp/fit-r5-item2.py); n is counted from the snapshot here so the panel
// stays honest. The old scale/OOF block is retired with the radar-3 model.
export function calibrate(s) {
  const set = s.protocols.filter(p => p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0);
  return {model: 'fitted size curve', intercept: FIT_INTERCEPT, slope: FIT_SLOPE,
    n: set.length, loo_median_miss: FIT_HELDOUT.loo_median_miss,
    wf_median_miss: FIT_HELDOUT.wf_median_miss,
    baseline_loo: FIT_HELDOUT.baseline_loo, baseline_wf: FIT_HELDOUT.baseline_wf,
    fit_table: FIT_TABLE,
    bands: {p25_mult: BAND_LO, p75_mult: BAND_HI, p10_mult: BAND_P10, p90_mult: BAND_P90,
      coverage: BAND_COVERAGE},
    odds: {base_rate: ODDS_BRIER.base_rate, base_cv: ODDS_BRIER.base_cv, base_wf: ODDS_BRIER.base_wf,
      final_cv: ODDS_BRIER.final_cv, final_wf: ODDS_BRIER.final_wf,
      terms: ['log age','category (ridge)','log TVL','7d growth'], kept: 'all 4',
      table: [{term:'base rate', cv: 0.247620, wf: 0.287334, dcv: 0.000000, dwf: 0.000000, icv: 0.00000, iwf: 0.00000, kept:'baseline'},
        {term:'+ listing age (log)', cv: 0.241589, wf: 0.280136, dcv: -0.006031, dwf: -0.007197, icv: -0.00603, iwf: -0.00720, kept:'KEPT'},
        {term:'+ category (ridge)', cv: 0.222637, wf: 0.276024, dcv: -0.024983, dwf: -0.011310, icv: -0.01895, iwf: -0.00411, kept:'KEPT'},
        {term:'+ log TVL', cv: 0.221077, wf: 0.275995, dcv: -0.026543, dwf: -0.011339, icv: -0.00156, iwf: -0.00003, kept:'KEPT'},
        {term:'+ 7d growth', cv: 0.216797, wf: 0.275842, dcv: -0.030823, dwf: -0.011492, icv: -0.00428, iwf: -0.00015, kept:'KEPT'}]},
    fallback: false};
}
function playbook(category) {
  const c = (category ?? '').toLowerCase();
  if (/lend|cdp|collateral/.test(c)) return ['Supply an accepted stable asset; inspect utilization and withdrawal liquidity. Avoid borrowing or recursive leverage.', 'Review interest and health metrics; add a small supply only if liquidity remains adequate.'];
  if (/dex|liquidity|amm/.test(c)) return ['Swap $10, then place the remainder in a supported stable pair; inspect fees and impermanent-loss exposure.', 'Inspect pool composition and fees; make one useful $5 swap, never wash-trade.'];
  if (/perp|derivative|option/.test(c)) return ['Read liquidation rules; use at most $10 margin for a small test trade, close promptly and keep remaining funds uncommitted.', 'Review funding costs; trade only for a real hedge and close exposure afterward.'];
  if (/restak|staking/.test(c)) return ['Inspect operators, slashing terms and exit queue; deposit into one supported non-leveraged position.', 'Review slashing and operator changes; inspect rewards without looping receipts.'];
  if (/rwa/.test(c)) return ['Check jurisdiction, identity checks, minimum subscription and redemption windows. Subscribe only if eligible; otherwise skip funding.', 'Review issuer disclosures and redemption availability; never bypass eligibility rules.'];
  if (/bridge/.test(c)) return ['Verify destination and finality; test a $5 transfer before moving the rest of a supported asset.', 'Check transfer completion and use destination funds for a real purpose, avoiding circular transfers.'];
  if (/prediction/.test(c)) return ['Read resolution and eligibility rules; risk at most $5 on one informed market and retain remaining funds.', 'Review settlement evidence; resolve or exit the position without manufacturing volume.'];
  if (/insurance/.test(c)) return ['Read exclusions, deductible and claim rules; quote actual exposure and buy only useful cover within budget.', 'Review policy expiry and preserve evidence for legitimate claims.'];
  if (/curator|allocator/.test(c)) return ['Inspect vault mandate, curator concentration and withdrawal queue; select one transparent allocation.', 'Review allocation changes and queue liquidity before adding funds.'];
  if (/stable/.test(c)) return ['Inspect collateral and redemption fees; mint or deposit a supported stable asset and test a $5 redemption.', 'Review backing and peg deviation; stop deposits if redemptions deteriorate.'];
  if (/governance/.test(c)) return ['Read participation rules and a current proposal; delegate only if an existing eligible balance permits it, without buying access.', 'Read one proposal and cast an informed eligible vote, with no paid votes or fabricated identities.'];
  if (/yield|farm|vault/.test(c)) return ['Inspect underlying assets, leverage and exit fees; deposit into one simple vault and retain its share receipt.', 'Review realized yield and exposures; harvest only when rewards exceed transaction fees.'];
  return ['Inspect documented product mechanics and withdrawal routes; test the smallest supported core action. Skip funding if unclear.', 'Repeat one documented core action only when useful; check balances and withdrawal availability first.'];
}
// Round 5 item 5: header ONCE (evidence), steps carry action + COST + TIME only.
// Gas ranges and capital tiers are ASSUMPTIONS (snapshot has no gas/fee data);
// hold-by-age and the $5 test amount are sizing rules, not measurements.
export function farmSteps(p, age, implied) {
  const chain = p.chains[0] ?? 'documented network';
  const capital = p.tvl_usd >= 1e9 ? 150 : p.tvl_usd >= 5e7 ? 100 : 50;
  const tier = p.tvl_usd >= 1e9 ? 'large' : p.tvl_usd >= 5e7 ? 'floor' : 'early';
  const hold = age === null ? 45 : age < 180 ? 60 : age < 730 ? 45 : 30;
  const gas = /ethereum/i.test(chain) ? '$5–20' : '$0.20–3';
  const chains = p.chains.slice(0,2).join('/') || 'unreported';
  const growth = p.change_7d === null ? 'unknown' : `${p.change_7d >= 0 ? '+' : ''}${p.change_7d}%`;
  // Chain order is the snapshot's order, not a TVL ranking: no per-chain balances exist.
  const evidence = `${p.name}: TVL $${p.tvl_usd}; listed chains ${chains} (${p.chains.length} total); age ${age === null ? 'unknown' : age+'d'}; 7d ${growth}; implied $${implied}; ${tier} tier $${capital}.`;
  const [action,weekly] = playbook(p.category);
  // Headline verdict at $1,000 / 7% drop, netted with the V1 full-leg cost
  // model (see farmVerdict). Shown again as the plan's closing line.
  const headline = farmVerdict({implied_value_usd:implied, tvl_usd:p.tvl_usd, chains:p.chains, age_days:age}, 0.07, 1000);
  const netLine = ` Net at $1,000 / 7%: slice $${headline.slice_usd} − gas $${headline.gas_usd} − spread $3.00 − forgone $${headline.forgone_usd} = ${headline.net_usd >= 0 ? '+' : ''}$${headline.net_usd} → ${headline.verdict}.`;
  const pace = p.change_7d !== null && p.change_7d < 0
    ? 'Outflows: test exit before adding; stop if liquidity is thin.'
    : 'Test exit before any repeat; growth is not safety evidence.';
  const assumptions = `Assumptions (no snapshot data): gas ${gas}/tx is an assumed range, not measured; at-risk capital $${capital} by TVL tier is assumed sizing; hold ${hold}d by age is a rule; $5 test withdrawal is assumed. Drop share and deposit are the headline scenario (7% / $1,000).`;
  return {header: evidence, assumptions, steps: [
    `01 / Verify official documentation, ${chain} deployment, assets and contract address independently; snapshot has no app link. Use a separate wallet on ONE chain. Cost: $0 research; reserve ${gas} gas, $${capital} at-risk capital. Time: 15 min.`,
    `02 / On ${chain}: ${action} Exposure <=$${capital}; observe if minimum exceeds budget. Cost: ${gas} gas plus displayed fees/spread; loss possible. Time: 20–30 min.`,
    `03 / ${weekly} ${pace} Cost: ${gas} per active week plus quoted fees; no activity solely for rewards. Time: 10 min weekly.`,
    `04 / Review for ${hold} days; test $5 withdrawal (or minimum <=$${capital}), then redeem remainder if exit works. Stop on contract or liquidity concerns. Cost: ${gas} exit gas plus quoted exit fee; up to $${capital} at risk. Time: ${hold} days, 5 min/review; queue may delay exit.`,
    `05 / Read ${p.name}'s verified disclosures and reward rules only if published. No launch, campaign or eligibility assumed. Ignore unsolicited claim links; never share seed or pay a claim fee. Cost: $0 research; ${gas} gas only for a verified optional claim. Time: 5 min weekly.`,
    `06 / Log ${chain} transactions, fees, entry/exit, approvals and ${hold}-day review date. Compare realized outcome with costs; implied value is not wallet profit. Revoke unused approvals after exit. Cost: $0 local log; ${gas} per revocation. Time: 5 min/session.${netLine}`
  ]};
}
// --- Round 5 item 3: HONEST bands from held-out LOO residuals ---
// P25/P75/P10/P90 of log(actual) - log(pred) for the size curve, LOO over
// the 128 tokened protocols (script /tmp/bands-r5-item3.py). Multipliers on
// the implied value. LOO coverage: P25-P75 50.0% (64/128), P10-P90 79.7%
// (102/128). Walk-forward coverage (same LOO bands, 32 newest): P25-P75
// 56.2% (18/32), P10-P90 75.0% (24/32) — below the nominal 80%, as-is.
// These replace the round-4 bootstrap bands (0.789/1.259).
export const BAND_LO = 0.30601827322904396;
export const BAND_HI = 4.196636086444757;
export const BAND_P10 = 0.06188087796414982;
export const BAND_P90 = 8.628959859351525;
export const BAND_COVERAGE = {loo_2575: 50.0, loo_1090: 79.6875, wf_2575: 56.25, wf_1090: 75.0};
export function holdDays(age) { return age === null ? 45 : age < 180 ? 60 : age < 730 ? 45 : 30; }
export function gasMid(chain) { return /ethereum/i.test(chain ?? '') ? 12.50 : 1.60; }
// Hands-on time from the plan's own time budget: 15 min prep + 25 min entry
// + 10 min per active week of review + 5 min exit + 5 min ledger/revocation.
export function handsOnMinutes(hold) { return 15 + 25 + 10*hold/7 + 5 + 5; }
export function farmVerdict(row, dropShare, deposit) {
  const hold = holdDays(row.age_days);
  const gas = gasMid(row.chains[0]) * (3 + hold/7);
  const spread = 0.003 * deposit;
  const forgone = 0.04 * hold/365 * deposit;
  const slice = dropShare * row.implied_value_usd * (deposit/row.tvl_usd);
  const net = slice - gas - spread - forgone;
  const verdict = net > 0 ? 'FARM' : net > -(gas + spread) ? 'MARGINAL' : 'SKIP';
  return {slice_usd:+slice.toFixed(2), gas_usd:+gas.toFixed(2), spread_usd:+spread.toFixed(2),
    forgone_usd:+forgone.toFixed(2), net_usd:+net.toFixed(2), verdict, hold_days:hold,
    hands_on_minutes:+handsOnMinutes(hold).toFixed(1)};
}
export function valueBand(implied) {
  return {low_usd: Math.max(1, Math.round(implied*BAND_LO)), high_usd: Math.round(implied*BAND_HI),
    p10_usd: Math.max(1, Math.round(implied*BAND_P10)), p90_usd: Math.round(implied*BAND_P90)};
}
// Coverage audit: every protocol of the 758 accounted for, first match wins.
// Ranked rows are counted by the caller; the rest fall into live (a token
// already trades) or one of the observable exclusion reasons of isRankable.
export function auditCounts(s, rankedSlugs) {
  const counts = {ranked: rankedSlugs.size, live: 0, bridge: 0, liquid: 0, exchange: 0, versioned: 0, wrapped: 0, other: 0};
  for (const p of s.protocols) {
    if (rankedSlugs.has(p.slug)) continue;
    if (!isPreToken(p)) counts.live++;
    else if (['Bridge','Canonical Bridge'].includes(p.category)) counts.bridge++;
    else if (['Liquid Staking','Liquid Restaking','Restaked BTC'].includes(p.category)) counts.liquid++;
    else if (p.category === 'CEX' || /^(?:Binance|Coinbase|Bybit|Kraken|Bitget|OKX|Bitfinex|Gemini)/i.test(p.name)) counts.exchange++;
    else if (/\s(?:v\d+(?:\.\d+)*|\d+\.\d+)$/i.test(p.name)) counts.versioned++;
    else if (/\b(?:wrapped|staked|staking)\b/i.test(p.name)) counts.wrapped++;
    else counts.other++;
  }
  return counts;
}
// --- Round 5 item 4: TOKEN ODDS (logistic regression, method LOCKED) ---
// Label y=1 if NOT isPreToken (mcap OR gecko_id OR symbol present): 416/758,
// base rate 0.5488. Features (all KEPT — Brier down in BOTH 10-fold and
// walk-forward): log age, category (ridge lam=10), log TVL, 7d growth.
// Brier: base 0.2476/0.2873 -> final 0.2168/0.2758 (10-fold / walk-forward).
// Implied value = value-if-launch x odds, labelled SCENARIO (expected value).
// Script: /tmp/odds-r5-item4.py (fit-r5-item4 in workspace).
export const ODDS_MU = [6.109676547470256,17.734672724700136,-0.06371935356200527];
export const ODDS_SD = [1.0271535287839602,1.807813926607854,0.12074851072237631];
export const ODDS_BETA = [0.17732986409159363,0.2935616549074662,0.18595267953450254,-0.3534760965079594,0.07220622972649303,0.10765119464736829,-0.04794478397187428,0.1707219460302503,-0.2429191173427235,-0.049797458690944596,-0.02581456955890809,-0.8876140283029496,0.05569435398554073,-0.07154929378656107,-0.11948343768084442,0.04430719427111991,-0.06541904055680194,0.18686950838862582,0.0010461775576074128,0.03631549751442147,0.04540890886579597,-0.06763259996786604,0.01940408281177837,0.7071021650185406,-0.03304009083129429,-0.07188891701423063,-0.014876232996020214,0.16506813567468379,-0.010452024165147417,-0.051167946277221016,0.16515825661159655,0.6286412261674084,0.08607913062026058,0.023471165694208755,-0.23127618685446866,0.06521567711641497,0.0302830186841271,-0.04968811478596962,-0.4024000773962696,0.1409018604457194,-0.05405397921338577,0.02270871933459497,-0.07212290724159569,0.06372956097596705,-0.020104723600753795,0.03566508590990502,-0.08456439157472499,0.03649513661929997,-0.705954638127259,0.04216615553149877,-0.08827729871465961,-0.1263962843957272,0.13398395511768368,0.16513322944242922,-0.027948419593184677,0.21905380154930643,0.15190518832874253];
export const ODDS_CATS = ["AI Agents","Algo-Stables","Anchor BTC","Basis Trading","Bridge","CDP","CDP Manager","CEX","Canonical Bridge","CeDeFi","Chain","Collateral Management","Collateral Markets","Cross Chain Bridge","Crypto Card Issuer","DOR","Decentralized AI","Decentralized BTC","Derivatives","Dexs","Dual-Token Stablecoin","Farm","Governance Incentives","Indexes","Insurance","Interest Rate Derivatives","Launchpad","Lending","Leveraged Farming","Liquid Restaking","Liquid Staking","Liquidity Manager","NFT Marketplace","OTC Marketplace","Onchain Capital Allocator","Options","Options Vault","Payments","Prediction Market","Privacy","RWA","Reserve Currency","Restaked BTC","Restaking","Risk Curators","Stablecoin Issuer","Stablecoin Wrapper","Staking Pool","Synthetics","Token Locker","Uncollateralized Lending","Yield","Yield Aggregator"];
export const ODDS_BRIER = {base_cv: 0.247620, base_wf: 0.287334, final_cv: 0.216797, final_wf: 0.275842, base_rate: 0.548813};
export function tokenOdds(p, as_of) {
  const age = Math.log(Math.max(1, p.listed_at ? Math.max(1, Math.floor((new Date(as_of)-new Date(p.listed_at))/864e5)) : 180));
  const lt = Math.log(p.tvl_usd);
  const gr = p.change_7d == null ? 0 : Math.max(-60, Math.min(100, p.change_7d))/100;
  const a = (age-ODDS_MU[0])/ODDS_SD[0], l = (lt-ODDS_MU[1])/ODDS_SD[1], g = (gr-ODDS_MU[2])/ODDS_SD[2];
  let z = ODDS_BETA[0] + ODDS_BETA[1]*a + ODDS_BETA[2]*l + ODDS_BETA[3]*g;
  const ci = ODDS_CATS.indexOf(p.category);
  if (ci >= 0) z += ODDS_BETA[4+ci];
  return 1/(1+Math.exp(-Math.max(-30, Math.min(30, z))));
}
export function buildRadar(s) {
  const calibration = calibrate(s);
  const watch = new Set(s.watchlist);
  // Round 4 coverage: watchlist OR rankable at any size (the tvl < floor
  // restriction is dropped). 198 rows: 40 watchlist + 158 early.
  const board = s.protocols.filter(p => watch.has(p.slug) || isRankable(p))
    .map(p => {const model=impliedValue(p,s.as_of);
      const odds=tokenOdds(p,s.as_of);
      const scenario=Math.max(1,Math.round(model.implied_value_usd*odds));
      const plan=farmSteps(p,model.age_days,scenario);
      const row={...p,model,age_days:model.age_days,value_if_launch_usd:model.implied_value_usd,token_odds:+odds.toFixed(4),implied_value_usd:scenario,watchlist:watch.has(p.slug),plan_header:plan.header,plan_assumptions:plan.assumptions,farm_steps:plan.steps};
      const band=valueBand(row.implied_value_usd);
      row.band_low_usd=band.low_usd; row.band_high_usd=band.high_usd;
      row.band_p10_usd=band.p10_usd; row.band_p90_usd=band.p90_usd;
      row.verdicts={};
      for (const dep of [1000,10000]) { row.verdicts[dep]={}; for (const drop of [0.035,0.07,0.14]) row.verdicts[dep][drop]=farmVerdict(row,drop,dep); }
      return row;})
    .sort((a,b) => b.implied_value_usd-a.implied_value_usd || (a.slug<b.slug?-1:1)).map((r,i)=>({...r,rank:i+1}));
  const live=s.protocols.filter(p=>!isPreToken(p)).sort((a,b)=>(b.mcap_usd??-1)-(a.mcap_usd??-1)||(a.slug<b.slug?-1:1));
  const audit=auditCounts(s,new Set(board.map(r=>r.slug)));
  return {board,radar:{as_of:s.as_of,model_version:MODEL_VERSION,rows:board,live,board_size:board.length,watchlist_size:watch.size,early_size:board.length-watch.size,live_size:live.length,calibration,audit}};
}
export function boardIssue(board,s) {
  if(board.length<100||board.length>4000) return 'Board size';
  if(s.watchlist.some(slug=>!board.some(r=>r.slug===slug))) return 'Coverage';
  for(const [i,r] of board.entries()) {
    if(r.rank!==i+1||!isPreToken(r)||!Number.isSafeInteger(r.implied_value_usd)||r.implied_value_usd<1||r.implied_value_usd>1e14) return 'Rank/value/status';
    if(i&&r.implied_value_usd>board[i-1].implied_value_usd) return 'Order';
    if(r.farm_steps.length!==6||r.farm_steps.some(t=>t.trim().length<20||t.trim().length>600)) return 'Steps';
  }
  return null;
}
export const dataScript = radar => `window.RADAR=${JSON.stringify(radar).replace(/</g,'\\u003c')};\n`;
