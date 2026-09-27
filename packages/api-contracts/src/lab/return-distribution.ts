import { z } from 'zod';

/**
 * Return Distribution + Value-at-Risk "Lab" contracts.
 *
 * A deterministic, seeded study of the distribution of holding-period returns
 * and the tail-risk measures derived from it. It has NO data dependency (no DB,
 * no provider) — it runs on a clearly-labelled synthetic, seeded return process
 * — so it renders at any time, including during a database outage. Determinism
 * (scenario + seed in → identical distribution out) is a first-class
 * requirement, matching Aurox's deterministic-first doctrine.
 *
 * The teaching point: EMPIRICAL tail risk (from the simulated distribution) is
 * compared against the PARAMETRIC normal-distribution estimate. Fat tails and
 * skew make the normal assumption understate VaR / Expected Shortfall — the
 * study makes that gap explicit rather than hiding it.
 *
 * All returns are expressed as fractions (0.05 = +5%). VaR and CVaR are reported
 * as POSITIVE loss magnitudes (0.08 = an 8% loss).
 */
export const returnScenarioSchema = z.enum([
  'normal',
  'fat_tailed',
  'crash_skew',
  'calm',
  'volatile',
]);
export type ReturnScenario = z.infer<typeof returnScenarioSchema>;

export const returnDistributionParamsSchema = z.object({
  /** Synthetic return process shape. */
  scenario: returnScenarioSchema.default('fat_tailed'),
  /** Holding period in trading days that returns are aggregated over. */
  horizonDays: z.number().int().min(1).max(21).default(1),
  /** Baseline annualized volatility, in percent (e.g. 20 → 20%/yr). */
  baseVolPct: z.number().min(1).max(120).default(20),
  /** Annualized drift, in percent (e.g. 8 → 8%/yr). */
  annualDriftPct: z.number().min(-30).max(40).default(8),
  /** Number of simulated horizon returns. More → smoother, slower. */
  samples: z.number().int().min(500).max(20_000).default(6_000),
  /** PRNG seed — identical seed + params reproduce identical output. */
  seed: z.number().int().nonnegative().default(1),
});
export type ReturnDistributionParams = z.infer<typeof returnDistributionParamsSchema>;

/** One histogram bin over horizon returns. */
export const returnHistogramBinSchema = z.object({
  /** Bin lower edge (return fraction). */
  start: z.number(),
  /** Bin upper edge (return fraction). */
  end: z.number(),
  /** Count of samples in the bin. */
  count: z.number().int().nonnegative(),
  /** count / total (fraction of mass in the bin). */
  density: z.number().min(0).max(1),
});
export type ReturnHistogramBin = z.infer<typeof returnHistogramBinSchema>;

/** VaR / Expected-Shortfall at one confidence level: empirical vs parametric. */
export const varEstimateSchema = z.object({
  /** Confidence level, e.g. 0.95. */
  confidence: z.number().min(0).max(1),
  /** Empirical Value-at-Risk from the simulated distribution (positive loss). */
  empiricalVar: z.number(),
  /** Empirical Conditional VaR / Expected Shortfall (mean loss beyond VaR). */
  empiricalCVar: z.number(),
  /** Parametric VaR assuming a normal distribution (positive loss). */
  gaussianVar: z.number(),
  /** Parametric Expected Shortfall assuming a normal distribution. */
  gaussianCVar: z.number(),
  /**
   * How much the empirical VaR exceeds the Gaussian VaR, as a fraction of the
   * Gaussian VaR (0.4 = empirical is 40% larger). Positive means the normal
   * assumption UNDERSTATES risk — the fat-tail warning.
   */
  varUnderstatement: z.number().nullable(),
});
export type VarEstimate = z.infer<typeof varEstimateSchema>;

export const returnStatsSchema = z.object({
  mean: z.number(),
  stdev: z.number().min(0),
  /** Third standardized moment (0 = symmetric, <0 = left/downside skew). */
  skewness: z.number(),
  /** Excess kurtosis (0 = normal-tailed, >0 = fat tails). */
  excessKurtosis: z.number(),
  min: z.number(),
  max: z.number(),
  samples: z.number().int().nonnegative(),
});
export type ReturnStats = z.infer<typeof returnStatsSchema>;

export const returnDistributionResultSchema = z.object({
  scenario: returnScenarioSchema,
  seed: z.number().int(),
  generatedAt: z.string(),
  horizonDays: z.number().int(),
  tradingDaysPerYear: z.number().int().positive(),
  stats: returnStatsSchema,
  histogram: z.array(returnHistogramBinSchema),
  /** VaR/ES at each studied confidence level, ascending confidence. */
  varEstimates: z.array(varEstimateSchema),
  /** Probability of a loss (return < 0), in [0,1]. */
  probabilityOfLoss: z.number().min(0).max(1),
  /** Worst and best sampled horizon returns (fractions). */
  worst: z.number(),
  best: z.number(),
  /** Plain-language summary of the shape and the empirical-vs-normal tail gap. */
  summary: z.string(),
});
export type ReturnDistributionResult = z.infer<typeof returnDistributionResultSchema>;
