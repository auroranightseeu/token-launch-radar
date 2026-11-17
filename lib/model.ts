// Identity and category never enter this snapshot-only value model.
export const MODEL_VERSION = 'radar-2';
export const parseSnapshot = text => JSON.parse(text);
export const isPreToken = p => p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
export function isRankable(p) {
  return isPreToken(p) && !['CEX','Bridge','Canonical Bridge','Liquid Staking','Liquid Restaking','Restaked BTC'].includes(p.category)
    && !/\s(?:v\d+(?:\.\d+)*|\d+\.\d+)$/i.test(p.name)
    && !/\b(?:wrapped|staked|staking)\b/i.test(p.name)
    && !/^(?:Binance|Coinbase|Bybit|Kraken|Bitget|OKX|Bitfinex|Gemini)/i.test(p.name);
}
export function impliedValue(p, asOf) {
  const age_days = p.listed_at ? Math.max(0, Math.floor((Date.parse(asOf)-Date.parse(p.listed_at))/86400000)) : null;
  const effective_age_days = age_days ?? 180;
  const growth_pct = Math.max(-60, Math.min(100, p.change_7d ?? 0));
  const base_usd = 20000000 * Math.log1p(p.tvl_usd/50000000)/Math.LN2;
  const growth_multiplier = growth_pct < 0 ? Math.exp(growth_pct/100) : 1+0.35*Math.log1p(growth_pct/100);
  const maturity_multiplier = 0.65+0.55*(1-Math.exp(-effective_age_days/540));
  return {age_days, effective_age_days, growth_pct, base_usd, growth_multiplier, maturity_multiplier,
    implied_value_usd:Math.max(1,Math.round(base_usd*growth_multiplier*maturity_multiplier))};
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
export function farmSteps(p, age) {
  const chain = p.chains[0] ?? 'the documented network';
  const capital = p.tvl_usd >= 1e9 ? 150 : p.tvl_usd >= 5e7 ? 100 : 50;
  const hold = age === null ? 45 : age < 180 ? 60 : age < 730 ? 45 : 30;
  const gas = /ethereum/i.test(chain) ? '$5–20' : '$0.20–3';
  const [action,weekly] = playbook(p.category);
  return [
    `01 / Prepare a separate wallet for ${p.name} on ${chain}. Find its official app through independently verified protocol documentation; this snapshot has no URL. Check supported assets and approvals. Cost: ${gas} native gas plus $${capital} risk capital. Time: 15 minutes.`,
    `02 / ${p.category ?? 'Protocol'} entry: ${action} Cap exposure at $${capital}; if minimums exceed this, observe instead. Cost: ${gas} gas plus displayed spread/product fees; capital is at risk. Time: 20–30 minutes.`,
    `03 / Weekly: ${weekly} Verify published points criteria rather than assuming rewards. Cost: ${gas} per active week plus displayed fees; never pay for artificial activity. Time: 10 minutes weekly.`,
    `04 / Review for ${hold} days (${age === null ? 'unknown listing age; conservative default' : age+' days since listing'}). Test a small withdrawal and exit on contract or liquidity concerns; do not hold merely for points. Cost: up to $${capital} tied up with possible loss, plus ${gas} exit gas. Time: ${hold} days, 5 minutes per review.`,
    `05 / Check ${p.name}'s own published rewards announcements. Claim only through a link published by the protocol and verified against its documentation; never pay to claim or share a seed. No launch or eligibility is promised. Cost: $0 to check; verified network gas only if applicable. Time: 5 minutes weekly.`,
    `06 / Log ${chain}, wallet, transaction hashes, amounts, fees, approvals, entry date and ${hold}-day review date. Save eligibility evidence, record the exit and compare rewards with total costs. Cost: $0 for a local log; ${gas} if revoking approval. Time: 5 minutes per session.`
  ];
}
export function buildRadar(s) {
  const watch = new Set(s.watchlist);
  const board = s.protocols.filter(p => watch.has(p.slug) || (p.tvl_usd < s.floor_usd && isRankable(p)))
    .map(p => {const model=impliedValue(p,s.as_of); return {...p,model,age_days:model.age_days,implied_value_usd:model.implied_value_usd,watchlist:watch.has(p.slug),farm_steps:farmSteps(p,model.age_days)};})
    .sort((a,b) => b.implied_value_usd-a.implied_value_usd || (a.slug<b.slug?-1:1)).map((r,i)=>({...r,rank:i+1}));
  const live=s.protocols.filter(p=>!isPreToken(p)).sort((a,b)=>(b.mcap_usd??-1)-(a.mcap_usd??-1)||(a.slug<b.slug?-1:1));
  return {board,radar:{as_of:s.as_of,model_version:MODEL_VERSION,rows:board,live,board_size:board.length,watchlist_size:watch.size,early_size:board.length-watch.size,live_size:live.length}};
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
