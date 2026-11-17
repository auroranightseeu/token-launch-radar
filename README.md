# Token Launch Radar

[![make.fun](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01)
[![Rank](https://make.fun/badge/token-radar-01/auroranightseeu/token-launch-radar/rank.svg)](https://make.fun/bounty/token-radar-01)
[![Reward](https://make.fun/badge/token-radar-01/auroranightseeu/token-launch-radar/reward.svg)](https://make.fun/bounty/token-radar-01)

**Signal** — a radar that ranks pre-token DeFi protocols by what their token launch would be worth, and shows how to farm each one.

## How it works

`main.ts` (Node 22, standard library only) reads the sealed DefiLlama snapshot (`/input/snapshot.json`, 758 protocols) and:

- Finds the protocols that record no token and are not a wrapped, staked or bridged product of a token that already trades.
- Ranks them with a value model that is a pure function of the snapshot's own figures: `implied = round(B × G × M)`, where `B` is a log-dampened TVL scale, `G` comes from the 7-day TVL growth, and `M` from how long the protocol has run with no token. No hardcoded names.
- Writes `board.json` with 178 ranked rows (the full 40-protocol watchlist plus 138 early protocols below the floor), each with an implied value in USD and a six-step farm plan with costs and time.
- Builds a static dashboard (`dashboard/`) that renders with no network: sortable board, text/category/TVL filters, a watchlist toggle, a detail view for every protocol with the model arithmetic and farm plan, and a separate view of protocols whose token already trades.
- Writes `dossier.json` with `buildDossier` from `vendor/makefun-board.ts`, and copies the three screenshots (`screenshots/`) of the board, a protocol detail view, and a filtered view.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <path-to-snapshot.json>
```

The program runs twice and both runs write byte-identical output.

## License

MIT — see [LICENSE](LICENSE).
