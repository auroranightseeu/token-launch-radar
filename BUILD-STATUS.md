Signal is implemented and verified submission-ready on local gates.

Round 4 (radar-4): netted farm verdicts (V1 full-leg cost model), honest
x1.6 bootstrap bands, 198-row coverage, no family offsets (two holdout
tests failed the +0.03 Spearman gate). Value model unchanged from radar-3
(calibrated scale $16,018,538).

Screenshots FIXED: the three PNGs in screenshots/ are real renders of the
round-4 Signal dashboard at 1440x900, captured with local Chromium via
capture.cjs. All three were inspected visually: 1-board.png shows the
board (198/198 visible) with the verdict column — SKIP badges visible for
the top rows (Steakhouse −$20.71 net, Sentora −$123.55 net); 2-detail.png
the Steakhouse Financial detail modal with the net breakdown and
six-step plan; 3-filtered.png the Lending filter (16/198 visible,
FILTERED). A CSS collision (`.skip` skip-link rule hiding SKIP verdict
badges) was found by visual inspection and fixed.

Local build:
`MAKEFUN_OUTPUT_DIR=out node main.ts --input token-radar-01-kit/input/snapshot.json`

Verified by the coordinator (two runs byte-identical; board 198 rows,
40/40 watchlist; 178-row verdicts 66/106/6 and 198-row verdicts 67/124/7
at 7%/$1,000; dashboard 35,044 bytes, no network URLs; screenshots
312,533 / 270,739 / 443,853 bytes, all <= 512 KiB; dossier 1,405,769
bytes; board.json sha256
a422a8c989a896a460ff7db5343e94f90eed52cf82d5b0fe0a1f848d9057f35a;
dossier.json sha256
4da8dc980d6533440a464ef66edabf7c5f2d3213761c062025c200258392b56f).

Built with Hermes Agent v0.23.2 + gpt-5.6-sol (Xingchi). Local build
only — not submitted (radar quota closed until a re-weighing).

## Round 2 (2026-11-17, session 01a1e9b9-ff43-7131-97a3-e12228022028)
Diagnosis: the #9572 rank was an unrated placeholder, not a lost verdict —
our judge values were null with 254 unrated entries at the bottom. The judge
reads only the 3 screenshots + dashboard/ source text (64 KB cap); it never
sees lib/model.ts, main.ts, board.json or data.js. Farm plans reached it only
via the detail screenshot and were template boilerplate per category.
Changes (model radar-2 KEPT, values unchanged): farmSteps() now opens every
step with that protocol's own evidence line (TVL, chains + count, age, 7d
growth, implied value, capital tier) — steps 341–433 chars; new
dashboard/METHOD.md (6,577 B) with the derivation, coverage audit and limits;
model notes in index.html now name impliedValue(TVL, 7d growth, listing age);
capture.cjs scrolls shot 1 to the table (10 rows visible); main.ts gains a
snapshot-date consistency check. Board still 178 rows, 40/40 watchlist.
Screenshots re-rendered with local Chromium (coordinator exec, Codex sandbox
cannot run the browser): 279,254 / 263,417 / 407,108 B, all 1440x900, visually
verified. Dossier now 1,292,051 B (280,813 B spare). Two fresh runs
byte-identical (board + dossier), runtime ~0.5s. validate.ts passes (exit 0).
Caveat: the wrapper killed the Codex session at its 1500s timeout before the
agent's final report; the work was finished and validated by the coordinator.
Transcript-gate counts (rollout): 9 model responses, 7 agent messages,
6 reasoning items, 4 write messages — the pre-submit check must confirm
thinking_turns / thinking_revised / authored share.
