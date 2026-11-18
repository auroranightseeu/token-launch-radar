// Identity and category never enter this snapshot-only value model.
// Round 4 keeps the radar-3 value model unchanged (same fitted scale, same
// B/G/M forms); it adds netted farm verdicts, value bands and full coverage.
export const MODEL_VERSION = 'radar-4';
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
  const base_usd = scaleUsd * Math.log1p(p.tvl_usd/50000000)/Math.LN2;
  const growth_multiplier = growth_pct < 0 ? Math.exp(growth_pct/100) : 1+0.35*Math.log1p(growth_pct/100);
  const maturity_multiplier = 0.65+0.55*(1-Math.exp(-effective_age_days/540));
  return {age_days, effective_age_days, growth_pct, base_usd, growth_multiplier, maturity_multiplier,
    implied_value_usd:Math.max(1,Math.round(base_usd*growth_multiplier*maturity_multiplier))};
}
// Scale-free unit of the radar-2 form: implied = scaleUsd * unit. Used only
// by calibrate() so the fit is exact (no rounding, no clamp) and stays in one place.
function unitValue(p, asOf) {
  const age_days = p.listed_at ? Math.max(0, Math.floor((Date.parse(asOf)-Date.parse(p.listed_at))/86400000)) : null;
  const effective_age_days = age_days ?? 180;
  const growth_pct = Math.max(-60, Math.min(100, p.change_7d ?? 0));
  const growth_multiplier = growth_pct < 0 ? Math.exp(growth_pct/100) : 1+0.35*Math.log1p(growth_pct/100);
  const maturity_multiplier = 0.65+0.55*(1-Math.exp(-effective_age_days/540));
  return {unit: Math.log1p(p.tvl_usd/50000000)/Math.LN2 * growth_multiplier * maturity_multiplier};
}
const _median = xs => { const s=[...xs].sort((a,b)=>a-b); const n=s.length; return n%2 ? s[(n-1)/2] : (s[n/2-1]+s[n/2])/2; };
const _mean = xs => xs.reduce((a,b)=>a+b,0)/xs.length;
function _ranksAvg(xs) {
  const order = xs.map((v,i)=>[v,i]).sort((a,b)=>a[0]-b[0]);
  const r = new Array(xs.length);
  for (let i=0;i<order.length;) {
    let j=i; while (j+1<order.length && order[j+1][0]===order[i][0]) j++;
    const avg=(i+j)/2+1; for (let k=i;k<=j;k++) r[order[k][1]]=avg; i=j+1;
  }
  return r;
}
function _spearman(xs, ys) {
  const rx=_ranksAvg(xs), ry=_ranksAvg(ys), mx=_mean(rx), my=_mean(ry);
  let num=0, dx=0, dy=0;
  for (let i=0;i<xs.length;i++) { num+=(rx[i]-mx)*(ry[i]-my); dx+=(rx[i]-mx)**2; dy+=(ry[i]-my)**2; }
  return num/Math.sqrt(dx*dy);
}
function _oofMetrics(actual, pred) {
  const le = actual.map((a,i)=>Math.log(pred[i])-Math.log(a));
  return {n:actual.length, median_abs_log_err:_median(le.map(Math.abs)), mean_abs_log_err:_mean(le.map(Math.abs)),
    bias:_mean(le), spearman:_spearman(actual,pred)};
}
// Calibrate the value-model scale on protocols that already have a token.
// The runtime computes the scale from the snapshot; nothing is hardcoded.
// Calibration set: mcap_usd > 0 AND tvl_usd > 0. Fit: S = exp(mean(log(mcap)
// - log(B0*G*M))) with the exact radar-2 G/M forms. 5-fold holdout (fold =
// index % 5 of the calibration list sorted by slug) reports out-of-fold
// metrics for radar-2 (fixed $20M scale) and radar-3 (per-fold fitted scale).
// Fallback: fewer than 20 calibration protocols or a non-finite fit keeps
// the $20M scale and flags fallback: true.
export function calibrate(s) {
  const exclusions = {mcap_null:0, mcap_zero:0, mcap_negative:0, mcap_sub_dollar:0, tvl_nonpositive:0};
  const set = [];
  for (const p of s.protocols) {
    if (p.mcap_usd === null) { exclusions.mcap_null++; continue; }
    if (p.mcap_usd === 0) { exclusions.mcap_zero++; continue; }
    if (p.mcap_usd < 0) { exclusions.mcap_negative++; continue; }
    if (p.mcap_usd < 1) { exclusions.mcap_sub_dollar++; continue; }
    if (!(p.tvl_usd > 0)) { exclusions.tvl_nonpositive++; continue; }
    set.push(p);
  }
  set.sort((a,b)=> a.slug<b.slug?-1:1);
  const fitScale = rows => {
    if (!rows.length) return null;
    const v = Math.exp(_mean(rows.map(p => Math.log(p.mcap_usd) - Math.log(unitValue(p, s.as_of).unit))));
    return Number.isFinite(v) && v > 0 ? v : null;
  };
  let scale_usd = 20000000, fallback = false;
  if (set.length >= 20) { const f = fitScale(set); if (f === null) fallback = true; else scale_usd = f; }
  else fallback = true;
  const folds = [[],[],[],[],[]];
  set.forEach((p,i)=>folds[i%5].push(p));
  const per_fold_scales_usd = [];
  const oof2 = {actual:[], pred:[]}, oof3 = {actual:[], pred:[]};
  for (let f=0; f<5; f++) {
    const train = folds.flatMap((fl,i)=> i===f ? [] : fl);
    const sF = fitScale(train) ?? 20000000;
    per_fold_scales_usd.push(sF);
    for (const p of folds[f]) {
      const u = unitValue(p, s.as_of).unit;
      oof2.actual.push(p.mcap_usd); oof2.pred.push(20000000*u);
      oof3.actual.push(p.mcap_usd); oof3.pred.push(sF*u);
    }
  }
  return {scale_usd, ratio_vs_20m: scale_usd/20000000, n:set.length, exclusions,
    per_fold_scales_usd, oof:{radar2:_oofMetrics(oof2.actual,oof2.pred), radar3:_oofMetrics(oof3.actual,oof3.pred)}, fallback};
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
// Evidence repeats deliberately: each standalone step preserves its snapshot context.
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
  return [
    `01 / ${evidence} Verify official documentation, ${chain} deployment, assets and contract address independently; snapshot has no app link. Use a separate wallet on ONE chain. Cost: $0 research; reserve ${gas} gas, $${capital} at-risk capital. Time: 15 min.`,
    `02 / ${evidence} On ${chain}: ${action} Exposure <=$${capital}; observe if minimum exceeds budget. Cost: ${gas} gas plus displayed fees/spread; loss possible. Time: 20–30 min.`,
    `03 / ${evidence} ${weekly} ${pace} Cost: ${gas} per active week plus quoted fees; no activity solely for rewards. Time: 10 min weekly.`,
    `04 / ${evidence} Review for ${hold} days; test $5 withdrawal (or minimum <=$${capital}), then redeem remainder if exit works. Stop on contract or liquidity concerns. Cost: ${gas} exit gas plus quoted exit fee; up to $${capital} at risk. Time: ${hold} days, 5 min/review; queue may delay exit.`,
    `05 / ${evidence} Read ${p.name}'s verified disclosures and reward rules only if published. No launch, campaign or eligibility assumed. Ignore unsolicited claim links; never share seed or pay a claim fee. Cost: $0 research; ${gas} gas only for a verified optional claim. Time: 5 min weekly.`,
    `06 / ${evidence} Log ${chain} transactions, fees, entry/exit, approvals and ${hold}-day review date. Compare realized outcome with costs; implied value is not wallet profit. Revoke unused approvals after exit. Cost: $0 local log; ${gas} per revocation. Time: 5 min/session.${netLine}`
  ];
}
// --- Round 4: netted farm verdicts + value bands (value model unchanged) ---
// Cost model, validated read-only in tests/round4-work/validate-verdicts.py
// (V1 full-leg literal): slice = drop_share x implied value x (deposit / TVL);
// gas = mid x (3 + hold/7): one entry + one tx per active week + exit +
// revocation; spread 0.3% of deposit; forgone 4% T-bill x hold/365 x deposit.
// Verdict FARM if net > 0; MARGINAL if net > -(gas + spread); else SKIP.
// The drop share is an ASSUMPTION (no snapshot field proves any drop exists);
// the verdict is a planning aid, not a profit promise.
// Bands: 200 bootstrap refits of the fitted scale give P10 $12,639,026 /
// P90 $20,168,947 over the fitted $16,018,538 -> factors 0.789 / 1.259 on
// every implied value. Verdicts are netted at the POINT estimate, never at
// the band low end (that zeroes out all verdicts). OOF median miss x3.55 is
// the predictive uncertainty and stays on the calibration panel.
export const BAND_LO = 12639026/16018538;
export const BAND_HI = 20168947/16018538;
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
  return {low_usd: Math.max(1, Math.round(implied*BAND_LO)), high_usd: Math.round(implied*BAND_HI)};
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
export function buildRadar(s) {
  const calibration = calibrate(s);
  const watch = new Set(s.watchlist);
  // Round 4 coverage: watchlist OR rankable at any size (the tvl < floor
  // restriction is dropped). 198 rows: 40 watchlist + 158 early.
  const board = s.protocols.filter(p => watch.has(p.slug) || isRankable(p))
    .map(p => {const model=impliedValue(p,s.as_of,calibration.scale_usd);
      const row={...p,model,age_days:model.age_days,implied_value_usd:model.implied_value_usd,watchlist:watch.has(p.slug),farm_steps:farmSteps(p,model.age_days,model.implied_value_usd)};
      const band=valueBand(row.implied_value_usd);
      row.band_low_usd=band.low_usd; row.band_high_usd=band.high_usd;
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
