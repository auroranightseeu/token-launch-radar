// Stage 1 — calibration exploration (radar-3). Reproduces the fit, the 5-fold
// holdout (OOF) metrics for radar-2 vs radar-3, and a bounded full-refit check.
// Node 22 stdlib only. Reads the sealed snapshot; writes nothing to out/.
import {readFileSync} from 'node:fs';

const snap = JSON.parse(readFileSync('token-radar-01-kit/input/snapshot.json', 'utf8'));
const asOf = snap.as_of;

// ---- radar-2 forms, copied exactly from lib/model.ts impliedValue() ----
function bgm(p) {
  const age_days = p.listed_at ? Math.max(0, Math.floor((Date.parse(asOf) - Date.parse(p.listed_at)) / 86400000)) : null;
  const effective_age_days = age_days ?? 180;
  const growth_pct = Math.max(-60, Math.min(100, p.change_7d ?? 0));
  const base_usd = 20000000 * Math.log1p(p.tvl_usd / 50000000) / Math.LN2; // B0 * $20M
  const growth_multiplier = growth_pct < 0 ? Math.exp(growth_pct / 100) : 1 + 0.35 * Math.log1p(growth_pct / 100);
  const maturity_multiplier = 0.65 + 0.55 * (1 - Math.exp(-effective_age_days / 540));
  return {age_days, effective_age_days, growth_pct, base_usd, growth_multiplier, maturity_multiplier,
    b0gm: (base_usd / 20000000) * growth_multiplier * maturity_multiplier}; // B0*G*M with scale 1
}

// ---- calibration set + exclusion audit ----
const excl = {mcap_null: 0, mcap_zero: 0, mcap_sub1: 0, mcap_negative: 0, tvl_nonpositive: 0};
const weird = [];
const calib = [];
for (const p of snap.protocols) {
  if (p.mcap_usd === null) { excl.mcap_null++; continue; }
  if (p.mcap_usd === 0) { excl.mcap_zero++; continue; }
  if (p.mcap_usd < 0) { excl.mcap_negative++; weird.push(p.slug); continue; }
  if (p.mcap_usd < 1) { excl.mcap_sub1++; continue; }
  if (!(p.tvl_usd > 0)) { excl.tvl_nonpositive++; continue; }
  calib.push(p);
}
calib.sort((a, b) => (a.slug < b.slug ? -1 : 1));
console.log('exclusions:', JSON.stringify(excl), 'weird mcap<0 slugs:', JSON.stringify(weird));
console.log('calibration n =', calib.length);
console.log('all mcap>0 have tvl>0:', snap.protocols.filter(p => p.mcap_usd > 0).every(p => p.tvl_usd > 0));

// ---- helpers ----
const median = xs => { const s = [...xs].sort((a, b) => a - b); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
function ranksAvg(xs) { // Spearman ranks with average ranks for ties
  const order = xs.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
  const r = new Array(xs.length);
  for (let i = 0; i < order.length;) {
    let j = i;
    while (j + 1 < order.length && order[j + 1][0] === order[i][0]) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) r[order[k][1]] = avg;
    i = j + 1;
  }
  return r;
}
function spearman(xs, ys) {
  const rx = ranksAvg(xs), ry = ranksAvg(ys);
  const mx = mean(rx), my = mean(ry);
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < xs.length; i++) { num += (rx[i] - mx) * (ry[i] - my); dx += (rx[i] - mx) ** 2; dy += (ry[i] - my) ** 2; }
  return num / Math.sqrt(dx * dy);
}
function metrics(actual, pred) {
  const le = actual.map((a, i) => Math.log(pred[i]) - Math.log(a));
  const ale = le.map(Math.abs);
  return {n: actual.length, median_abs_log_err: median(ale), mean_abs_log_err: mean(ale),
    bias: mean(le), spearman: spearman(actual, pred)};
}

// ---- global fit ----
const logs = calib.map(p => { const {b0gm} = bgm(p); return Math.log(p.mcap_usd) - Math.log(b0gm); });
const S = Math.exp(mean(logs));
console.log('fitted scale S = $' + S.toFixed(0), 'ratio vs $20M =', (S / 20000000).toFixed(6));
console.log('radar-2 log bias (mean log(pred)-log(actual)) =', (Math.log(20000000) - mean(logs)).toFixed(6));

// ---- 5-fold OOF ----
const folds = [[], [], [], [], []];
calib.forEach((p, i) => folds[i % 5].push(p));
const perFoldScale = [];
const oof2 = {actual: [], pred: []}; // radar-2 fixed $20M
const oof3 = {actual: [], pred: []}; // radar-3 per-fold fitted
for (let f = 0; f < 5; f++) {
  const train = folds.flatMap((fl, i) => i === f ? [] : fl);
  const sF = Math.exp(mean(train.map(p => Math.log(p.mcap_usd) - Math.log(bgm(p).b0gm))));
  perFoldScale.push(sF);
  for (const p of folds[f]) {
    const {b0gm} = bgm(p);
    oof2.actual.push(p.mcap_usd); oof2.pred.push(20000000 * b0gm);
    oof3.actual.push(p.mcap_usd); oof3.pred.push(sF * b0gm);
  }
}
console.log('per-fold fitted scales:', perFoldScale.map(s => '$' + s.toFixed(0)).join(' / '));
const m2 = metrics(oof2.actual, oof2.pred);
const m3 = metrics(oof3.actual, oof3.pred);
console.log('OOF radar-2:', JSON.stringify(m2, null, 1));
console.log('OOF radar-3 (scale-only):', JSON.stringify(m3, null, 1));

// Per-fold Spearman (within-fold ranking, scale cannot re-rank)
for (let f = 0; f < 5; f++) {
  const a = folds[f].map(p => p.mcap_usd);
  const p2 = folds[f].map(p => 20000000 * bgm(p).b0gm);
  const sF = perFoldScale[f];
  const p3 = folds[f].map(p => sF * bgm(p).b0gm);
  console.log(`fold ${f}: n=${a.length} spearman radar-2=${spearman(a, p2).toFixed(4)} radar-3=${spearman(a, p3).toFixed(4)} (identical by construction: pure scale)`);
}

// ---- bounded full-refit check ----
// OLS log(mcap) ~ a + b*ln(B0) + c*growth_pct/100 + d*ln(age) via normal equations.
function ols(X, y) {
  const k = X[0].length;
  const A = Array.from({length: k}, () => new Array(k).fill(0));
  const b = new Array(k).fill(0);
  for (let i = 0; i < X.length; i++) for (let r = 0; r < k; r++) { b[r] += X[i][r] * y[i]; for (let c = 0; c < k; c++) A[r][c] += X[i][r] * X[i][c]; }
  for (let c = 0; c < k; c++) { // Gauss-Jordan
    let piv = c; for (let r = c + 1; r < k; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
    [A[c], A[piv]] = [A[piv], A[c]]; [b[c], b[piv]] = [b[piv], b[c]];
    const d = A[c][c]; for (let j = 0; j < k; j++) A[c][j] /= d; b[c] /= d;
    for (let r = 0; r < k; r++) if (r !== c) { const f = A[r][c]; for (let j = 0; j < k; j++) A[r][j] -= f * A[c][j]; b[r] -= f * b[c]; }
  }
  return b;
}
const design = p => { const {growth_pct, effective_age_days} = bgm(p); return [1, Math.log(bgm(p).b0gm / bgm(p).growth_multiplier / bgm(p).maturity_multiplier), growth_pct / 100, Math.log(effective_age_days)]; };
// NOTE: design col 1 is ln(B0) only (scale-free base), col 2 growth/100, col 3 ln(age).
const yAll = calib.map(p => Math.log(p.mcap_usd));
const betaAll = ols(calib.map(design), yAll);
console.log('OLS full (all 128): [intercept, lnB0, growth/100, lnAge] =', betaAll.map(v => v.toFixed(4)).join(', '));
for (let f = 0; f < 5; f++) {
  const train = folds.flatMap((fl, i) => i === f ? [] : fl);
  const beta = ols(train.map(design), train.map(p => Math.log(p.mcap_usd)));
  console.log(`OLS fold ${f} (train): growth coef=${beta[2].toFixed(4)} lnAge coef=${beta[3].toFixed(4)} lnB0 coef=${beta[1].toFixed(4)}`);
}
// OOF for the full OLS refit + TVL power law, for comparison only
const oofOLS = {actual: [], pred: []}, oofPow = {actual: [], pred: []};
for (let f = 0; f < 5; f++) {
  const train = folds.flatMap((fl, i) => i === f ? [] : fl);
  const beta = ols(train.map(design), train.map(p => Math.log(p.mcap_usd)));
  const tp = train.map(p => [1, Math.log(p.tvl_usd)]);
  const betaP = ols(tp, train.map(p => Math.log(p.mcap_usd)));
  for (const p of folds[f]) {
    const x = design(p);
    const predOLS = Math.exp(beta.reduce((a, b, i) => a + b * x[i], 0));
    const predPow = Math.exp(betaP[0] + betaP[1] * Math.log(p.tvl_usd));
    oofOLS.actual.push(p.mcap_usd); oofOLS.pred.push(predOLS);
    oofPow.actual.push(p.mcap_usd); oofPow.pred.push(predPow);
  }
}
console.log('OOF full-OLS refit:', JSON.stringify(metrics(oofOLS.actual, oofOLS.pred)));
console.log('OOF TVL power law:', JSON.stringify(metrics(oofPow.actual, oofPow.pred)));
const powBeta = ols(calib.map(p => [1, Math.log(p.tvl_usd)]), yAll);
console.log('TVL power-law exponent (all 128):', powBeta[1].toFixed(4));
