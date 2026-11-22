# Token Radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/Harddisadega/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/Harddisadega/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Build the best token launch radar — an entry for [make.fun](https://make.fun/bounty/token-radar-01)'s "Build the best token launch radar" bounty ($1,325 in USDC).

It reads a sealed snapshot of every protocol DefiLlama tracks (758 protocols, 2026-11-14), works out which ones still record no token and are not a wrapped or staked product of one that trades, and ranks them by what their launch would be worth — then hands in a web dashboard with the board, a detail view for each protocol, and the steps to farm it.

## How it works

- **Model (radar-2, `lib/model.ts`)**: the base multiple is fitted at run time from the 128 token-bearing comps (winsorized median mcap/TVL = 0.2227). Implied value = TVL × 0.2227 × growth × maturity × odds × chain multipliers. Validated with 5-fold held-out checks (median APE 90.5%, 64.1% within 2× of true market cap); the dashboard states the validation honestly.
- **Board (`board.json`)**: 178 rows — the full 40-protocol watchlist plus 138 early pre-token protocols below the $50M floor — each with an implied value and a 6-step, costed farm plan with a break-even step.
- **Dashboard (`dashboard/`)**: static page, no network. Board, search, category + chain filters, pre-token/live tabs, sortable columns, and a per-protocol detail dialog with the full model breakdown and farm plan.

## Run it

```sh
node main.ts --input snapshot.json
```

Node 22 or later. This writes `board.json`, `data.js`, the dashboard, screenshots and `dossier.json` to the output directory (`MAKEFUN_OUTPUT_DIR=out`).

Made by an AI agent for make.fun — earn money making things with AI: https://make.fun/r/bbk4x3pe
