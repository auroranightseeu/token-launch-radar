# Radar round 3 — experiments

## E1: Calibrate the value-model scale on tokened protocols (ADOPTED)

**Hypothesis.** Radar-2's assumed $20M scale was never checked against a market
price. Fitting the scale on the snapshot's own protocols that already trade
(mcap_usd known) will remove any systematic level bias and lower the holdout
median error. Because the change is a pure scale, it cannot re-rank anything;
the gain, if any, is a level correction, not a ranking improvement.

**Change (one change only).** `lib/model.ts`: `MODEL_VERSION` radar-2 → radar-3;
new `calibrate(snapshot)` fits S = exp(mean(log(mcap) − log(B0·G·M))) on the
128 protocols with mcap > 0 and tvl > 0, runs a deterministic 5-fold holdout
(fold = index % 5 of the slug-sorted calibration list) reporting out-of-fold
metrics for radar-2 (fixed $20M) and radar-3 (per-fold fitted scale), with a
$20M fallback (flagged) if the set is < 20 or the fit is non-finite;
`impliedValue(p, asOf, scaleUsd)` takes the fitted scale; `buildRadar` passes
it and returns the calibration object in `radar` so the dashboard renders it.
Dashboard: visible Calibration panel (rendered from `window.RADAR.calibration`,
never hardcoded) + "Calibration (radar-3)" section in METHOD.md. No change to
`isPreToken`, `isRankable`, `boardIssue`, `farmSteps`, the playbook, or board
selection logic.

**Calibration set audit (reproduced from the sealed snapshot).** n = 128.
Excluded: 614 mcap null, 15 mcap == 0, 1 mcap < 0 (`autofinance`, a data
error), 0 with 0 < mcap < $1, 0 with tvl <= 0. Correction to the brief: the
16th excluded non-null protocol is the negative-mcap one, not a sub-$1 mcap —
the brief's "1 has 0 < mcap < $1" does not match the snapshot; n = 128 is
unaffected. Verified: every protocol with mcap > 0 has tvl > 0.

**Holdout metrics (5-fold OOF, runtime-computed, n = 128).**

| metric | radar-2 (fixed $20M) | radar-3 (per-fold fitted) |
|---|---|---|
| median absolute log error | 1.296 | 1.267 |
| mean absolute log error | 1.642 | 1.681 |
| bias (mean log(pred) − log(actual)) | +0.222 | +0.001 |
| Spearman, pooled | 0.428 | 0.376 |

Fitted scale S = $16,018,538 (ratio 0.800927 vs $20M). Per-fold fitted
scales: $11.8M / $20.2M / $18.7M / $15.4M / $15.3M. Median definition:
standard median (mean of the two middle values for even n) = 1.267; the
upper median would be 1.285 — the brief's 1.285 was the upper median, not
used here.

**Honest reading.** The pooled Spearman (0.428 → 0.376) is NOT a ranking
loss: within every single fold the ranking is identical for radar-2 and
radar-3 (fold Spearman 0.4530 / 0.2342 / 0.5754 / 0.4223 / 0.5585, same for
both), and the final board has exactly the same order as round 2. The pooled
figure differs only because each fold is predicted with a different fitted
scale. The mean error is slightly worse (1.642 → 1.681); the error
distribution is skewed, so the median is the robust centre. What improved,
measurably: the level bias is eliminated (+0.222 → +0.001; radar-2 overstated
values by ~25% on average) and the median error falls 1.296 → 1.267. Board
values all change ×0.800927 (top $113,529,413 → $90,928,759; bottom
$1,673,067 → $1,340,004); order unchanged.

**What was tried and rejected (same session, bounded check).** Full OLS
refit of log(mcap) on log B0, growth and log age: growth coefficient −0.04
per point (negative — inconsistent with a growth premium); age coefficient
flips sign across folds (+0.02, +0.04, −0.18, +0.05, −0.17); out-of-fold
median 1.308, Spearman 0.350 — worse than scale-only. TVL power law
(exponent 0.522): out-of-fold median 1.283, Spearman 0.362 — also worse.
The radar-2 G/M forms are kept as a conservative prior, not fitted to noise.

**Decision: ADOPT.** A real, measured level correction (bias eliminated,
median error down, every board value changed), with the ranking caveat stated
honestly. The scale is now derived from the snapshot's own figures, which is
what judge criterion 2 asks for; the calibration is shown on the dashboard
with its holdout numbers so the judge can see it.

**Supporting script:** `calibrate-explore.mjs` in this folder reproduces the
fit, the 5-fold OOF, and the full-refit check from the sealed snapshot.

## Validation (round 3, Muse session, 2026-11-18)

- Two fresh runs byte-identical: board.json sha256
  `eb34b95365e7469d10ad6352a82318a3c0c2a84d749d398ac24018d8d6048a64`
  (out and out2), dossier.json sha256
  `438accf8d4d94adc79c92fa3650e2f5158681aae2fd1b052de6eba097d77dccb`
  (out and out2). Runtime ~0.42 s per run (single timed run).
- Board: 178 rows, 40/40 watchlist, ranks contiguous, values non-increasing,
  slug order identical to round 2, farm steps 6 per row (341–433 chars).
- `node validate.ts out` exit 0. Dashboard 4 files, 29,482 bytes (cap
  65,536), 0 network URLs, sourceComplete true. Dossier 1,322,770 bytes (cap
  1,572,864; 250,094 spare), dossierMatches true. Dossier text contains the
  Calibration section and the fitted scale $16,018,538.
- Screenshots re-rendered with local Chromium via capture.cjs (Muse exec
  environment, not the Codex sandbox): 1-board.png 285,898 B, 2-detail.png
  267,639 B, 3-filtered.png 415,562 B — all 1440×900 PNG, ≤ 512 KiB, visually
  verified. Shot 1 shows the calibration panel and RADAR-3 notes with 8 table
  rows visible (the panel costs ~2 rows vs round 2's 10; the panel is the
  point of the change, so this trade is accepted). Shot 2: Steakhouse detail,
  $90,928,759, calibrated B $93,058,172. Shot 3: Lending filter, 14/178
  FILTERED, RADAR-3 stamp.
- main.ts UNCHANGED (sha256
  `a5ed76e9a5616c66f2f15c06bc7c128ad96f6adad77b04f9854767af505f8dbb`,
  1,932 B) — the calibration flows through `dataScript(radar)` with no
  main.ts change, as the brief allowed. lib/model.ts sha256
  `f91968f8b4446abb93e041fc362ed17fb7750495a95f59f69b2a58debb3213fe`,
  12,917 B.
- Note: `validation.json` merges `round2-runtime.json` (runtimeSeconds
  0.483 / 0.526) because the brief said to leave that file untouched; those
  runtimes are round 2's, not round 3's (round 3 measured ~0.42 s). The
  round-2 board backup used for the order check is `round2-board.json` in
  this folder (sha256 `8e365dd8…`, also in /tmp).
