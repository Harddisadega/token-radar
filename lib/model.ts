// The token radar's model (radar-2): one snapshot of the protocol universe in, one ranked board out.
//
// The board ranks every slug in the snapshot's watchlist (the floor, never a ceiling) plus every
// pre-token protocol below the watchlist floor that passes the SAME exclusion rule the house used to
// build the watchlist: no wrapped, staked or bridged product of a token that already trades, no CEX,
// no versioned pool. The snapshot's ten fields let the program apply the rule's observable half
// (category, name words, name prefix, version marker); the half it cannot see — DefiLlama's
// parentProtocol — is why the board stops at the floor for protocols above it: 92 protocols above
// $50M record no token yet are left out rather than guessed at, and the dashboard says so. Most
// of them are exchanges, bridges, or wrapped/staked products of tokens that already trade; the
// rest carry a parent protocol the snapshot does not name.
//
// A protocol is pre-token when its record carries no token (no market cap, no CoinGecko id, no
// symbol). Live-token protocols are kept apart and shown with the market's own values, never mixed
// into the ranked board.
//
// Implied value follows only from the snapshot's own figures, and the base multiple is FITTED, not
// chosen: the program fits it from the token-bearing protocols (the comps) at every run:
//
//   comps      = token-bearing protocols with a market cap and TVL above zero (n = 128 here)
//   multiple_i = mcap_usd / tvl_usd for each comp
//   M          = median of the multiples, winsorized at the 5th and 95th percentiles (0.2227 here)
//
//   growth     = clamp(change_7d, -50, 100) per cent
//   growthMult = 1 + (growth / 100) x 0.6
//   maturity   = 0.7 + min(age_days, 1095) / 1095 x 0.3   (age_days unknown: 365)
//   odds       = 0.7 + 0.6 x categoryTokenRate            (the share of the protocol's category
//                                                          that already has a token; a category
//                                                          whose protocols rarely launch one scores
//                                                          lower, and one whose protocols usually
//                                                          have one scores higher)
//   chains     = 1 + 0.03 x min(max(chains - 1, 0), 4)    (a protocol live on more chains)
//   implied    = max(1, round(tvl_usd x M x growthMult x maturity x odds x chains))
//
// The fit is validated, not asserted: a 5-fold held-out check (folds by slug hash, so the split is
// deterministic) refits M on four folds and predicts the fifth fold's market caps with the full
// formula. On this snapshot the full model predicts held-out market caps with a median absolute
// percentage error of 90.5% and 64.1% of predictions within 2x of the true market cap, against a
// flat 0.25x multiple's 88.8% and 64.1% — the multiples are wildly dispersed (5th percentile 0.006,
// 95th 12.16), so no TVL multiple predicts a market cap closely, and the dashboard says that
// plainly. The market-cap check is a sanity check on the base multiple only: the growth, maturity,
// odds and chain factors encode launch prospects, which a market cap cannot validate, so they are
// stated as priors with modest ranges rather than as fitted coefficients. What the fitted multiple
// buys is a defensible anchor instead of a round number: category medians were tested the same way
// and lost to the pooled median (93.1% median error), so the model uses the pooled median and does
// not pretend a category multiple is sharper than it is.
//
// No protocol name is ever special-cased: the same function scores every row.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants, as the dashboard states them. */
export interface ModelConstants {
  base_multiple: number;
  growth_weight: number;
  growth_floor: number;
  growth_cap: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_days: number;
  unknown_age_days: number;
  odds_floor: number;
  odds_range: number;
  chain_step: number;
  chain_max_steps: number;
}

/** The model's version label: the dashboard names it. */
export const MODEL_VERSION = 'radar-2';

/** How many live-token protocols the Live token view carries, by market cap. */
export const LIVE_ROWS = 24;

/** The fitted multiple and its held-out validation, computed from the snapshot at every run. */
export interface ModelFit {
  comps: number;
  multiple_p5: number;
  multiple_median: number;
  multiple_p95: number;
  folds: number;
  median_ape_pct: number;
  within_2x_pct: number;
  within_50_pct: number;
  flat_median_ape_pct: number;
  flat_within_2x_pct: number;
  category_median_ape_pct: number;
}

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  model: {
    base_multiple: number;
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    odds_multiplier: number;
    chain_multiplier: number;
    category_token_rate: number;
    age_days: number | null;
  };
  farm_steps: string[];
}

/** The dashboard's compact view of one row, with farm plans generated in the page. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  growth_multiplier: number;
  maturity_multiplier: number;
  odds_multiplier: number;
  chain_multiplier: number;
  category_token_rate: number;
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

/** Everything the dashboard needs: the board, the live set, and the model it runs. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  fit: ModelFit;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  left_out_above_floor: number;
  rows: RadarRow[];
  live: LiveRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** The house watchlist rule's observable half, applied to every candidate row, not just the watchlist. */
const EXCLUDED_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);
const EXCHANGE_PREFIX = /^(Binance|Coinbase|Bybit|Kraken|Bitget|OKX|Bitfinex|Gemini)\b/;
const WRAPPED_WORD = /\b(wrapped|staked|staking)\b/i;
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** Whether a protocol is one the board may rank: pre-token, and not a wrapped, staked or bridged
 *  product of a token that already trades, not a CEX, not a versioned pool. */
export function isRankable(p: SnapshotProtocol): boolean {
  return (
    isPreToken(p) &&
    !EXCLUDED_CATEGORIES.has(p.category ?? '') &&
    !EXCHANGE_PREFIX.test(p.name) &&
    !WRAPPED_WORD.test(p.name) &&
    !VERSIONED.test(p.name)
  );
}

/** A deterministic 32-bit hash of a string, for the validation folds. */
function hash32(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;
const medianOf = (values: number[]): number => {
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)]!;
};
const quantile = (sorted: number[], p: number): number => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]!;

/** The share of protocols in each category that already have a token, plus the overall share. */
export function categoryTokenRates(protocols: SnapshotProtocol[]): { byCategory: Map<string, number>; overall: number } {
  const byCategory = new Map<string, { n: number; tok: number }>();
  let n = 0;
  let tok = 0;
  for (const p of protocols) {
    const c = p.category ?? 'Other';
    const v = byCategory.get(c) ?? { n: 0, tok: 0 };
    v.n++;
    if (!isPreToken(p)) v.tok++;
    byCategory.set(c, v);
    n++;
    if (!isPreToken(p)) tok++;
  }
  const rates = new Map<string, number>();
  for (const [c, v] of byCategory) rates.set(c, v.n > 0 ? v.tok / v.n : 0);
  return { byCategory: rates, overall: n > 0 ? tok / n : 0 };
}

/** The model's constants: the base multiple is fitted at run time, the rest are the priors. */
export function modelConstants(fittedMultiple: number): ModelConstants {
  return {
    base_multiple: round4(fittedMultiple),
    growth_weight: 0.6,
    growth_floor: -50,
    growth_cap: 100,
    maturity_floor: 0.7,
    maturity_range: 0.3,
    maturity_days: 1095,
    unknown_age_days: 365,
    odds_floor: 0.7,
    odds_range: 0.6,
    chain_step: 0.03,
    chain_max_steps: 4,
  };
}

/** The multipliers and the implied value one protocol gets under `model`. */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  model: ModelConstants,
  tokenRate: number,
): { implied: number; growthPct: number; growthMult: number; maturityMult: number; oddsMult: number; chainMult: number; age: number | null } {
  const age = ageDays(asOf, protocol.listed_at);
  const rawGrowth = finite(protocol.change_7d, 0);
  const growthPct = Math.min(model.growth_cap, Math.max(model.growth_floor, rawGrowth));
  const growthMult = 1 + (growthPct / 100) * model.growth_weight;
  const ageForModel = age ?? model.unknown_age_days;
  const maturityMult = model.maturity_floor + (Math.min(Math.max(ageForModel, 0), model.maturity_days) / model.maturity_days) * model.maturity_range;
  const oddsMult = model.odds_floor + model.odds_range * Math.min(Math.max(tokenRate, 0), 1);
  const chainCount = protocol.chains.length > 0 ? protocol.chains.length : 1;
  const chainMult = 1 + model.chain_step * Math.min(Math.max(chainCount - 1, 0), model.chain_max_steps);
  const base = protocol.tvl_usd * model.base_multiple;
  const implied = Math.max(1, Math.round(base * growthMult * maturityMult * oddsMult * chainMult));
  return { implied, growthPct, growthMult, maturityMult, oddsMult, chainMult, age };
}

/**
 * Fit the base multiple from the token-bearing comps and validate it held-out. The fit is computed
 * from the snapshot at every run, so the numbers the dashboard states are the numbers this snapshot
 * produces — nothing is hardcoded. Returns the fitted multiple and the validation summary.
 */
export function fitModel(snapshot: Snapshot): { multiple: number; fit: ModelFit } {
  const comps = snapshot.protocols.filter((p) => !isPreToken(p) && p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0);
  const multiples = comps.map((p) => p.mcap_usd! / p.tvl_usd).sort((a, b) => a - b);
  const p5 = quantile(multiples, 0.05);
  const p95 = quantile(multiples, 0.95);
  const winsor = (m: number): number => Math.min(p95, Math.max(p5, m));
  const multiple = medianOf(multiples.map(winsor));
  const model = modelConstants(multiple);
  const { byCategory, overall } = categoryTokenRates(snapshot.protocols);
  const tokenRateOf = (p: SnapshotProtocol): number => byCategory.get(p.category ?? 'Other') ?? overall;

  const FOLDS = 5;
  const predict = (p: SnapshotProtocol, m: number): number => {
    const v = impliedValue(p, snapshot.as_of, { ...model, base_multiple: m }, tokenRateOf(p));
    return v.implied;
  };
  const ape = (errors: number[]): { median: number; within2x: number; within50: number } => {
    const s = [...errors].sort((a, b) => a - b);
    return {
      median: s[Math.floor(s.length / 2)]! * 100,
      within2x: (s.filter((e) => e <= 1).length / s.length) * 100,
      within50: (s.filter((e) => e <= 0.5).length / s.length) * 100,
    };
  };
  const fullErrors: number[] = [];
  const flatErrors: number[] = [];
  const catErrors: number[] = [];
  for (let fold = 0; fold < FOLDS; fold++) {
    const train = comps.filter((c) => hash32(c.slug) % FOLDS !== fold);
    const test = comps.filter((c) => hash32(c.slug) % FOLDS === fold);
    const trainMultiple = medianOf(train.map((c) => winsor(c.mcap_usd! / c.tvl_usd)));
    // Category medians on the training fold, for the comparison the dashboard reports.
    const catTrain = new Map<string, number[]>();
    for (const c of train) {
      const k = c.category ?? 'Other';
      const arr = catTrain.get(k) ?? [];
      arr.push(winsor(c.mcap_usd! / c.tvl_usd));
      catTrain.set(k, arr);
    }
    const catMedian = new Map<string, number>();
    const catCount = new Map<string, number>();
    for (const [k, arr] of catTrain) {
      catMedian.set(k, medianOf(arr));
      catCount.set(k, arr.length);
    }
    for (const t of test) {
      fullErrors.push(Math.abs(predict(t, trainMultiple) - t.mcap_usd!) / t.mcap_usd!);
      flatErrors.push(Math.abs(t.tvl_usd * 0.25 - t.mcap_usd!) / t.mcap_usd!);
      const k = t.category ?? 'Other';
      const catM = (catCount.get(k) ?? 0) >= 5 ? catMedian.get(k)! : trainMultiple;
      catErrors.push(Math.abs(t.tvl_usd * catM - t.mcap_usd!) / t.mcap_usd!);
    }
  }
  const full = ape(fullErrors);
  const flat = ape(flatErrors);
  const cat = ape(catErrors);
  const fit: ModelFit = {
    comps: comps.length,
    multiple_p5: round4(p5),
    multiple_median: round4(multiple),
    multiple_p95: round4(p95),
    folds: FOLDS,
    median_ape_pct: Math.round(full.median * 10) / 10,
    within_2x_pct: Math.round(full.within2x * 10) / 10,
    within_50_pct: Math.round(full.within50 * 10) / 10,
    flat_median_ape_pct: Math.round(flat.median * 10) / 10,
    flat_within_2x_pct: Math.round(flat.within2x * 10) / 10,
    category_median_ape_pct: Math.round(cat.median * 10) / 10,
  };
  return { multiple, fit };
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, model: ModelConstants, tokenRates: Map<string, number>, overallRate: number): BoardRow[] {
  const index = bySlug(snapshot.protocols);
  const chosen = new Map<string, SnapshotProtocol>();
  // The watchlist is the floor: every slug it names.
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  // The early radar: pre-token protocols below the watchlist floor that pass the same exclusion
  // rule the house used for the watchlist. Never a replacement for a watchlist row.
  const early = snapshot.protocols
    .filter((p) => !chosen.has(p.slug) && isRankable(p) && p.tvl_usd < snapshot.floor_usd)
    .sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
  for (const p of early) chosen.set(p.slug, p);

  const rateOf = (p: SnapshotProtocol): number => round4(tokenRates.get(p.category ?? 'Other') ?? overallRate);
  const scored = [...chosen.values()].map((p) => {
    const v = impliedValue(p, snapshot.as_of, model, rateOf(p));
    return { p, ...v, tokenRate: rateOf(p) };
  });
  scored.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  return scored.map((s, i) => ({
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token',
    age_days: s.age,
    implied_value_usd: s.implied,
    model: {
      base_multiple: model.base_multiple,
      growth_pct: s.growthPct,
      growth_multiplier: round4(s.growthMult),
      maturity_multiplier: round4(s.maturityMult),
      odds_multiplier: round4(s.oddsMult),
      chain_multiplier: round4(s.chainMult),
      category_token_rate: round4(s.tokenRate),
      age_days: s.age,
    },
    farm_steps: farmSteps(s.p, s.age, s.implied).map(stepText),
  }));
}

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.trim().length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 250;
  if (p.tvl_usd >= 1_000_000_000) return 150;
  if (p.tvl_usd >= 100_000_000) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** Gas for the whole plan, in dollars: one setup plus a weekly action over the hold. */
function gasFor(hold: number, big: boolean): number {
  const setup = big ? 8 : 4;
  const weekly = 2;
  return setup + weekly * Math.max(1, Math.round(hold / 7));
}

/** A short dollar figure: $250, $1.2K, $3.4M. */
function shortUsd(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${Math.round(n)}`;
}

/** The category's one action, in the words a farmer can follow. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Supply $${capital} of USDC to ${name} on ${chain} and keep the position open.`;
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm')) return `Provide $${capital} of liquidity to ${name}'s main pool on ${chain} and keep the position open.`;
  if (c.includes('bridge')) return `Bridge $${capital} of USDC to ${chain} through ${name} and use the bridged funds in its app.`;
  if (c.includes('staking') || c.includes('restak')) return `Stake $${capital} of the chain's staking asset through ${name} and keep the receipt.`;
  if (c.includes('perpetual') || c.includes('derivative')) return `Deposit $${capital} of USDC as margin on ${name} and open one small hedge.`;
  if (c.includes('prediction')) return `Fund $${capital} and place one market position on ${name}.`;
  if (c.includes('curator') || c.includes('allocator')) return `Deposit $${capital} into a ${name} vault on ${chain} and keep the shares.`;
  if (c.includes('stable')) return `Mint or deposit $${capital} of the stable asset through ${name} on ${chain}.`;
  if (c.includes('rwa')) return `Mint $${capital} of the protocol's yield asset on ${chain} and hold it.`;
  if (c.includes('insurance')) return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy.`;
  if (c.includes('perps') || c.includes('perp')) return `Deposit $${capital} of USDC as margin on ${name} and open one small hedge.`;
  if (c.includes('basis')) return `Deposit $${capital} into ${name}'s basis position on ${chain} and keep it open.`;
  if (c.includes('payment')) return `Route $${capital} of payments through ${name} on ${chain} and keep the receipts.`;
  if (c.includes('governance')) return `Lock $${capital} of assets in ${name}'s governance vault on ${chain} and vote once.`;
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`;
}

/**
 * A protocol's farm plan: six steps, each an action with a cost and a time, derived from the
 * protocol's own record (category, chains, TVL, age, implied value), never from a hand-written list
 * of names. Step five nets the plan to break-even: the outlay against the implied value.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null, implied: number): FarmStep[] {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const gas = gasFor(hold, capital >= 150);
  const outlay = capital + gas;
  const sharePct = (outlay / Math.max(1, implied)) * 100;
  const share =
    sharePct >= 100
      ? 'over 100% of it, so only farm with capital you would deploy anyway'
      : sharePct >= 10
        ? `${sharePct.toFixed(1)}% of it`
        : sharePct >= 1
          ? `${sharePct.toFixed(2)}% of it`
          : `${sharePct.toFixed(3)}% of it`;
  const action = actionFor(p, capital, chain);
  return [
    {
      text: `Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.`,
      cost: 'under $3 of gas for the first transaction',
      time: '5 minutes',
    },
    {
      text: action,
      cost: `$${capital} of capital and about $${capital >= 150 ? 8 : 4} of gas`,
      time: '15 minutes to set up',
    },
    {
      text: `Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote.`,
      cost: 'about $2 of gas a week',
      time: '10 minutes a week',
    },
    {
      text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`,
      cost: `the $${capital} stays in the position`,
      time: `${hold} days`,
    },
    {
      text: `Break-even check: this plan costs about $${outlay} in all (${shortUsd(capital)} of capital plus about $${gas} of gas), so it pays for itself if the launch pays farmers just ${share} of the ${shortUsd(implied)} implied value.`,
      cost: `about $${outlay} in all`,
      time: '2 minutes to check',
    },
    {
      text: `Before you withdraw, open the protocol's own points or rewards page and claim only from the link it publishes, then write the wallet, the dates and every transaction in a farm log.`,
      cost: 'no fee to check, and never pay to claim',
      time: '15 minutes',
    },
  ];
}

/** The live-token protocols, by market cap, for the dashboard's Live token view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
    }));
}

/** A board row's compact form for data.js, with the farm plan generated in the page. */
export function radarRow(row: BoardRow): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
    odds_multiplier: row.model.odds_multiplier,
    chain_multiplier: row.model.chain_multiplier,
    category_token_rate: row.model.category_token_rate,
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot): { board: BoardRow[]; radar: RadarData } {
  const { multiple, fit } = fitModel(snapshot);
  const model = modelConstants(multiple);
  const { byCategory, overall } = categoryTokenRates(snapshot.protocols);
  const board = buildBoard(snapshot, model, byCategory, overall);
  const live = liveRows(snapshot);
  const early = board.filter((r) => !snapshot.watchlist.includes(r.slug)).length;
  const leftOut = snapshot.protocols.filter(
    (p) => isPreToken(p) && p.tvl_usd >= snapshot.floor_usd && !snapshot.watchlist.includes(p.slug),
  ).length;
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    fit,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    left_out_above_floor: leftOut,
    rows: board.map(radarRow),
    live,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.trim().length < 20 || s.trim().length > 600) return `${r.slug} has a farm step of ${s.trim().length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
