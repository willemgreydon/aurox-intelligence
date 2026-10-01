import type { MonteCarloBand, MonteCarloParams, MonteCarloResult } from '@repo/api-contracts';

/**
 * Deterministic Monte Carlo portfolio simulation (Geometric Brownian Motion).
 *
 * PURE and reproducible: identical params (including `seed`) always yield an
 * identical result. No I/O, no ambient time — `generatedAt` is injected by the
 * caller (never read from a clock here). This mirrors the forecasting-purity and
 * confidence/determinism doctrine: a simulation that drove a decision must be
 * exactly reproducible for audit.
 */

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

export function runMonteCarloSimulation(
  params: MonteCarloParams,
  generatedAt: string,
): MonteCarloResult {
  const periodsPerYear = 12;
  const steps = Math.round(params.years * periodsPerYear);
  const dt = 1 / periodsPerYear;

  const mu = params.annualReturnPct / 100;
  const sigma = params.annualVolatilityPct / 100;
  // GBM discretization: log-return per step ~ N(drift, vol^2).
  const drift = (mu - 0.5 * sigma * sigma) * dt;
  const vol = sigma * Math.sqrt(dt);

  const contribution = params.monthlyContribution ?? 0;
  const paths = Math.max(100, Math.min(params.paths ?? 800, 5000));
  const seed = (params.seed >>> 0) || 1;
  const rng = mulberry32(seed);

  // stepValues[step][path] — retained only to compute per-step percentiles,
  // then discarded (we keep bands + a few sample paths).
  const stepValues: number[][] = Array.from({ length: steps + 1 }, () => new Array<number>(paths));

  for (let p = 0; p < paths; p += 1) {
    let value = params.startingCapital;
    stepValues[0]![p] = value;
    for (let s = 1; s <= steps; s += 1) {
      const z = standardNormal(rng);
      value = value * Math.exp(drift + vol * z) + contribution;
      if (value < 0) value = 0;
      stepValues[s]![p] = value;
    }
  }

  const bands: MonteCarloBand[] = [];
  for (let s = 0; s <= steps; s += 1) {
    const col = stepValues[s]!.slice().sort((a, b) => a - b);
    bands.push({
      step: s,
      yearFraction: s / periodsPerYear,
      p5: quantile(col, 0.05),
      p25: quantile(col, 0.25),
      p50: quantile(col, 0.5),
      p75: quantile(col, 0.75),
      p95: quantile(col, 0.95),
    });
  }

  // A few evenly-spaced full paths for visual texture (deterministic indices).
  const sampleCount = Math.min(8, paths);
  const samplePaths: number[][] = [];
  for (let i = 0; i < sampleCount; i += 1) {
    const idx = Math.floor((i / sampleCount) * paths);
    const path: number[] = new Array(steps + 1);
    for (let s = 0; s <= steps; s += 1) path[s] = stepValues[s]![idx]!;
    samplePaths.push(path);
  }

  const endCol = stepValues[steps]!.slice().sort((a, b) => a - b);
  const mean = endCol.reduce((acc, v) => acc + v, 0) / endCol.length;
  const endValues = {
    p5: quantile(endCol, 0.05),
    p25: quantile(endCol, 0.25),
    p50: quantile(endCol, 0.5),
    p75: quantile(endCol, 0.75),
    p95: quantile(endCol, 0.95),
    mean,
  };

  const totalContributed = params.startingCapital + contribution * steps;
  const probabilityOfTarget =
    params.targetValue != null && params.targetValue >= 0
      ? endCol.filter((v) => v >= params.targetValue!).length / endCol.length
      : null;
  const medianMultiple = totalContributed > 0 ? endValues.p50 / totalContributed : 0;

  const summary =
    `${paths} seeded paths over ${params.years}y at ${params.annualReturnPct}% drift / ` +
    `${params.annualVolatilityPct}% vol. Median end ${Math.round(endValues.p50)} vs ` +
    `${Math.round(totalContributed)} contributed (p5 ${Math.round(endValues.p5)} · p95 ${Math.round(endValues.p95)}).`;

  return {
    periodsPerYear,
    steps,
    bands,
    samplePaths,
    endValues,
    probabilityOfTarget,
    totalContributed,
    medianMultiple,
    seed,
    generatedAt,
    summary,
  };
}
