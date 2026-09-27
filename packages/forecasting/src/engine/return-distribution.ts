import type {
  ReturnDistributionParams,
  ReturnDistributionResult,
  ReturnHistogramBin,
  ReturnScenario,
  ReturnStats,
  VarEstimate,
} from '@repo/api-contracts';

/**
 * Deterministic Return Distribution + Value-at-Risk study.
 *
 * PURE and reproducible: identical params (including `seed`) always yield an
 * identical result. No I/O, no ambient time — `generatedAt` is injected by the
 * caller. Mirrors the forecasting-purity and determinism doctrine: a risk study
 * that framed a decision must be exactly reproducible for audit.
 *
 * Pipeline: seeded daily returns from a chosen process (with fat tails / skew /
 * jumps) → aggregate over the holding horizon → moments, histogram, and tail
 * risk (VaR / Expected Shortfall) computed BOTH empirically and under the normal
 * assumption, so the fat-tail understatement is explicit.
 */

const TRADING_DAYS_PER_YEAR = 252;
const CONFIDENCES = [0.95, 0.99] as const;
const HISTOGRAM_BINS = 41;

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

/** Standard normal PDF. */
function normPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

/**
 * Inverse standard-normal CDF (probit) — Acklam's rational approximation.
 * Deterministic and pure; |error| < 1.15e-9 across (0,1).
 */
function invNormCdf(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let q: number;
  let r: number;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
      ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
  }
  if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) * q /
      (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1);
  }
  q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
    ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
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
 * Draw ONE daily log-return for a scenario. `sigma` is the baseline daily vol.
 * Each process is fully driven by the seeded rng (deterministic).
 */
function drawDailyReturn(scenario: ReturnScenario, dailyDrift: number, sigma: number, rng: () => number): number {
  switch (scenario) {
    case 'normal':
      return dailyDrift + sigma * standardNormal(rng);
    case 'calm':
      return dailyDrift + sigma * 0.6 * standardNormal(rng);
    case 'volatile':
      return dailyDrift + sigma * 1.6 * standardNormal(rng);
    case 'fat_tailed': {
      // Variance-Gamma-like mixture: mostly normal, occasionally a much wider
      // draw → excess kurtosis (fat tails) with roughly symmetric shape.
      const jump = rng() < 0.06;
      const scale = jump ? 3.2 : 0.9;
      return dailyDrift + sigma * scale * standardNormal(rng);
    }
    case 'crash_skew': {
      // Jump-diffusion with rare, large DOWNSIDE jumps → left skew + fat left tail.
      let r = dailyDrift + sigma * 0.9 * standardNormal(rng);
      if (rng() < 0.03) {
        r -= sigma * (3 + 4 * rng()); // sharp negative shock
      }
      return r;
    }
    default:
      return dailyDrift + sigma * standardNormal(rng);
  }
}

export function runReturnDistributionStudy(
  params: ReturnDistributionParams,
  generatedAt: string,
): ReturnDistributionResult {
  const sigma = params.baseVolPct / 100 / Math.sqrt(TRADING_DAYS_PER_YEAR);
  const dailyDrift = params.annualDriftPct / 100 / TRADING_DAYS_PER_YEAR;
  const seed = (params.seed >>> 0) || 1;
  const rng = mulberry32(seed);
  const horizon = params.horizonDays;
  const nSamples = params.samples;

  // --- Simulate horizon returns (sum of daily log-returns → simple return). --
  const returns = new Array<number>(nSamples);
  for (let i = 0; i < nSamples; i += 1) {
    let logSum = 0;
    for (let d = 0; d < horizon; d += 1) {
      logSum += drawDailyReturn(params.scenario, dailyDrift, sigma, rng);
    }
    returns[i] = Math.exp(logSum) - 1; // simple return over the horizon
  }

  // --- Moments. --------------------------------------------------------------
  const stats = computeStats(returns);

  // --- Histogram. ------------------------------------------------------------
  const sorted = returns.slice().sort((a, b) => a - b);
  const histogram = buildHistogram(sorted, nSamples);

  // --- VaR / Expected Shortfall: empirical vs normal. ------------------------
  const varEstimates: VarEstimate[] = CONFIDENCES.map((confidence) => {
    const tail = 1 - confidence;
    // Empirical: the tail quantile of the return distribution is a loss level.
    const qReturn = quantile(sorted, tail);
    const empiricalVar = Math.max(0, -qReturn);
    const tailSamples = sorted.filter((r) => r <= qReturn);
    const empiricalCVar =
      tailSamples.length > 0 ? Math.max(0, -(tailSamples.reduce((s, r) => s + r, 0) / tailSamples.length)) : empiricalVar;

    // Parametric normal, using the sample mean/std.
    const z = invNormCdf(tail); // negative
    const gaussianVar = Math.max(0, -(stats.mean + stats.stdev * z));
    const gaussianCVar = Math.max(0, -(stats.mean - stats.stdev * (normPdf(z) / tail)));

    const varUnderstatement = gaussianVar > 0 ? (empiricalVar - gaussianVar) / gaussianVar : null;

    return { confidence, empiricalVar, empiricalCVar, gaussianVar, gaussianCVar, varUnderstatement };
  });

  const probabilityOfLoss = sorted.filter((r) => r < 0).length / nSamples;
  const worst = sorted[0]!;
  const best = sorted[sorted.length - 1]!;
  const summary = buildSummary(params, stats, varEstimates);

  return {
    scenario: params.scenario,
    seed,
    generatedAt,
    horizonDays: horizon,
    tradingDaysPerYear: TRADING_DAYS_PER_YEAR,
    stats,
    histogram,
    varEstimates,
    probabilityOfLoss,
    worst,
    best,
    summary,
  };
}

function computeStats(returns: readonly number[]): ReturnStats {
  const n = returns.length;
  let mean = 0;
  for (const r of returns) mean += r;
  mean /= n;

  let m2 = 0;
  let m3 = 0;
  let m4 = 0;
  let min = Infinity;
  let max = -Infinity;
  for (const r of returns) {
    const d = r - mean;
    const d2 = d * d;
    m2 += d2;
    m3 += d2 * d;
    m4 += d2 * d2;
    if (r < min) min = r;
    if (r > max) max = r;
  }
  const variance = m2 / n;
  const stdev = Math.sqrt(variance);
  const skewness = stdev > 0 ? m3 / n / (stdev * stdev * stdev) : 0;
  const excessKurtosis = variance > 0 ? m4 / n / (variance * variance) - 3 : 0;

  return { mean, stdev, skewness, excessKurtosis, min, max, samples: n };
}

function buildHistogram(sorted: readonly number[], total: number): ReturnHistogramBin[] {
  const min = sorted[0]!;
  const max = sorted[sorted.length - 1]!;
  const span = max - min || 1;
  const width = span / HISTOGRAM_BINS;
  const bins: ReturnHistogramBin[] = [];
  for (let i = 0; i < HISTOGRAM_BINS; i += 1) {
    const start = min + i * width;
    const end = i === HISTOGRAM_BINS - 1 ? max : start + width;
    bins.push({ start, end, count: 0, density: 0 });
  }
  for (const r of sorted) {
    let idx = Math.floor((r - min) / width);
    if (idx < 0) idx = 0;
    if (idx >= HISTOGRAM_BINS) idx = HISTOGRAM_BINS - 1;
    bins[idx]!.count += 1;
  }
  for (const b of bins) b.density = b.count / total;
  return bins;
}

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

function buildSummary(
  params: ReturnDistributionParams,
  stats: ReturnStats,
  varEstimates: VarEstimate[],
): string {
  const v95 = varEstimates.find((v) => v.confidence === 0.95);
  // Deep-tail (99%) is where fat tails/skew show up most, so headline the gap there.
  const vDeep = varEstimates.reduce((a, b) => (b.confidence > a.confidence ? b : a), varEstimates[0]!);
  const tailShape =
    stats.excessKurtosis > 1
      ? 'fat-tailed'
      : stats.excessKurtosis < -0.3
        ? 'thin-tailed'
        : 'near-normal';
  const skewText = stats.skewness < -0.3 ? 'left-skewed (downside-heavy)' : stats.skewness > 0.3 ? 'right-skewed' : 'roughly symmetric';
  const deepPct = Math.round(vDeep.confidence * 100);
  const gapText =
    vDeep.varUnderstatement != null && vDeep.varUnderstatement > 0.05
      ? ` The normal assumption understates ${deepPct}% VaR by ${Math.round(vDeep.varUnderstatement * 100)}% — it would under-reserve for the tail.`
      : vDeep.varUnderstatement != null && vDeep.varUnderstatement < -0.05
        ? ` The normal assumption overstates ${deepPct}% VaR by ${Math.round(-vDeep.varUnderstatement * 100)}%.`
        : ` The normal assumption tracks the empirical ${deepPct}% tail closely.`;
  return (
    `Synthetic ${params.scenario} returns over a ${params.horizonDays}-day horizon: ` +
    `${tailShape}, ${skewText} (excess kurtosis ${stats.excessKurtosis.toFixed(1)}, skew ${stats.skewness.toFixed(2)}). ` +
    `Empirical 95% VaR ${v95 ? pct(v95.empiricalVar) : '—'}, ${deepPct}% VaR ${pct(vDeep.empiricalVar)}.${gapText}`
  );
}
