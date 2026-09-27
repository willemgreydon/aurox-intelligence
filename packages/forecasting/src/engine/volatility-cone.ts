import type {
  VolatilityConeBand,
  VolatilityConeParams,
  VolatilityConeResult,
  VolatilityScenario,
} from '@repo/api-contracts';

/**
 * Deterministic Volatility Cone study.
 *
 * PURE and reproducible: identical params (including `seed`) always yield an
 * identical result. No I/O, no ambient time — `generatedAt` is injected by the
 * caller (never read from a clock here). Mirrors the forecasting-purity and
 * determinism doctrine: a study that framed a decision must be exactly
 * reproducible for audit.
 *
 * Pipeline: seeded synthetic daily log-returns (per volatility regime) →
 * cumulative close path → for each rolling window, the distribution of
 * OVERLAPPING annualized realized-vol samples → percentile bands + the latest
 * (current) realized vol and where it sits in that distribution.
 */

const TRADING_DAYS_PER_YEAR = 252;

/** Rolling windows (trading days) and their labels, short → long. */
const WINDOWS: ReadonlyArray<{ window: number; label: string }> = [
  { window: 5, label: '1W' },
  { window: 10, label: '2W' },
  { window: 21, label: '1M' },
  { window: 42, label: '2M' },
  { window: 63, label: '3M' },
  { window: 126, label: '6M' },
  { window: 252, label: '1Y' },
];

/** Minimum overlapping samples required before a window is reported. */
const MIN_SAMPLES = 12;

/** mulberry32 — small, fast, well-distributed seeded PRNG in [0, 1). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal via Box–Muller, driven by a seeded uniform generator. */
function standardNormal(rng: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Linear-interpolated quantile over an ascending-sorted array. */
function quantile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0]!;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const lo = sorted[base]!;
  const hi = sorted[base + 1] ?? lo;
  return lo + (hi - lo) * rest;
}

/**
 * Per-bar volatility MULTIPLIER for a scenario at fractional progress t ∈ [0,1].
 * The baseline daily vol is scaled by this factor so each regime has a
 * recognisable, deterministic shape (no randomness in the multiplier itself).
 */
function volMultiplier(scenario: VolatilityScenario, t: number): number {
  switch (scenario) {
    case 'calm':
      // Persistently low vol, barely drifting.
      return 0.55;
    case 'steady':
      // Flat baseline — the reference case.
      return 1;
    case 'clustered':
      // Alternating calm / stormy regimes (vol clustering) — deterministic waves.
      return 0.7 + 0.6 * (0.5 + 0.5 * Math.sin(t * Math.PI * 6));
    case 'shock':
      // Calm for most of the history, then a sharp vol spike in the final ~18%.
      return t < 0.82 ? 0.7 : 0.7 + (t - 0.82) / 0.18 * 2.3;
    case 'trending':
      // Moderate, gently rising vol as a trend matures.
      return 0.8 + 0.5 * t;
    default:
      return 1;
  }
}

/** Small deterministic drift per scenario (fraction of baseVol), for the path shape. */
function driftFactor(scenario: VolatilityScenario): number {
  return scenario === 'trending' ? 0.06 : scenario === 'calm' ? 0.02 : 0;
}

export function runVolatilityConeStudy(
  params: VolatilityConeParams,
  generatedAt: string,
): VolatilityConeResult {
  const sampleBars = Math.round(params.years * TRADING_DAYS_PER_YEAR);
  const baseAnnualVol = params.baseVolPct / 100;
  const baseDailyVol = baseAnnualVol / Math.sqrt(TRADING_DAYS_PER_YEAR);
  const seed = (params.seed >>> 0) || 1;
  const rng = mulberry32(seed);
  const drift = (driftFactor(params.scenario) * baseAnnualVol) / TRADING_DAYS_PER_YEAR;

  // --- Generate the synthetic close path from seeded daily log-returns. ------
  const logReturns = new Array<number>(sampleBars);
  const closes = new Array<number>(sampleBars + 1);
  closes[0] = 100;
  for (let i = 0; i < sampleBars; i += 1) {
    const t = sampleBars > 1 ? i / (sampleBars - 1) : 0;
    const sigma = baseDailyVol * volMultiplier(params.scenario, t);
    const r = drift + sigma * standardNormal(rng);
    logReturns[i] = r;
    closes[i + 1] = closes[i]! * Math.exp(r);
  }

  // --- Rolling realized-vol distribution per window. -------------------------
  const annualize = Math.sqrt(TRADING_DAYS_PER_YEAR);
  const bands: VolatilityConeBand[] = [];
  let currentShortVol: number | null = null;
  let currentLongVol: number | null = null;

  for (const { window, label } of WINDOWS) {
    if (logReturns.length < window + 1) continue;
    const samples: number[] = [];
    // Overlapping windows across the whole return history.
    for (let end = window; end <= logReturns.length; end += 1) {
      const slice = logReturns.slice(end - window, end);
      samples.push(realizedVol(slice) * annualize);
    }
    if (samples.length < MIN_SAMPLES) continue;

    const current = samples[samples.length - 1]!; // latest complete window
    const sorted = samples.slice().sort((a, b) => a - b);
    const below = sorted.filter((v) => v <= current).length;
    const currentPercentile = sorted.length > 0 ? (below - 1) / Math.max(1, sorted.length - 1) : null;

    bands.push({
      window,
      label,
      min: sorted[0]!,
      p10: quantile(sorted, 0.1),
      p25: quantile(sorted, 0.25),
      median: quantile(sorted, 0.5),
      p75: quantile(sorted, 0.75),
      p90: quantile(sorted, 0.9),
      max: sorted[sorted.length - 1]!,
      current,
      currentPercentile: currentPercentile == null ? null : Math.max(0, Math.min(1, currentPercentile)),
      sampleSize: samples.length,
    });
  }

  if (bands.length > 0) {
    currentShortVol = bands[0]!.current;
    currentLongVol = bands[bands.length - 1]!.current;
  }

  // --- Context path (downsample to <= 180 points for a small chart). ---------
  const path = downsample(closes, 180);

  const summary = buildSummary(params, bands, currentShortVol);

  return {
    scenario: params.scenario,
    seed,
    generatedAt,
    tradingDaysPerYear: TRADING_DAYS_PER_YEAR,
    sampleBars,
    bands,
    path,
    currentShortVol,
    currentLongVol,
    summary,
  };
}

/** Sample standard deviation (n-1) of a return slice. Returns 0 for < 2 points. */
function realizedVol(returns: readonly number[]): number {
  const n = returns.length;
  if (n < 2) return 0;
  let mean = 0;
  for (const r of returns) mean += r;
  mean /= n;
  let sumSq = 0;
  for (const r of returns) {
    const d = r - mean;
    sumSq += d * d;
  }
  return Math.sqrt(sumSq / (n - 1));
}

/** Evenly-spaced downsample keeping first and last (deterministic indices). */
function downsample(values: readonly number[], maxPoints: number): number[] {
  if (values.length <= maxPoints) return values.slice();
  const out: number[] = [];
  for (let i = 0; i < maxPoints; i += 1) {
    const idx = Math.round((i / (maxPoints - 1)) * (values.length - 1));
    out.push(values[idx]!);
  }
  return out;
}

function pctText(v: number | null): string {
  return v == null ? '—' : `${(v * 100).toFixed(1)}%`;
}

function buildSummary(
  params: VolatilityConeParams,
  bands: VolatilityConeBand[],
  currentShort: number | null,
): string {
  if (bands.length === 0) {
    return `Not enough history (${params.years}y) to build a volatility cone.`;
  }
  const shortBand = bands[0]!;
  const pctile = shortBand.currentPercentile;
  const regimeText =
    pctile == null
      ? 'indeterminate'
      : pctile >= 0.8
        ? 'elevated vs its own history'
        : pctile <= 0.2
          ? 'compressed vs its own history'
          : 'in its normal historical range';
  return (
    `Synthetic ${params.scenario} regime over ${params.years}y at ${params.baseVolPct}% base vol. ` +
    `Latest ${shortBand.label} realized vol ${pctText(currentShort)} sits at the ` +
    `${pctile == null ? '—' : Math.round(pctile * 100)}th percentile — ${regimeText}.`
  );
}
