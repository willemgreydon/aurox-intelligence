import { z } from 'zod';

/**
 * Monte Carlo "Path Explorer" contracts.
 *
 * A deterministic, seeded portfolio-growth simulation. It has NO data
 * dependency (no DB, no provider) — it runs purely on user-supplied
 * assumptions — which makes it safe to render at any time, including during a
 * database outage. Determinism (seed in → identical paths out) is a first-class
 * requirement, matching Aurox's deterministic-first doctrine.
 */
export const monteCarloParamsSchema = z.object({
  /** Initial capital in account currency. */
  startingCapital: z.number().min(0).max(1_000_000_000),
  /** Expected annual return (drift), in percent. e.g. 7 → 7%/yr. */
  annualReturnPct: z.number().min(-50).max(100),
  /** Annualized volatility (sigma), in percent. e.g. 15 → 15%/yr. */
  annualVolatilityPct: z.number().min(0).max(200),
  /** Horizon in years. */
  years: z.number().int().min(1).max(40),
  /** Recurring monthly contribution added at each period end. */
  monthlyContribution: z.number().min(0).max(10_000_000).default(0),
  /** Number of simulated paths. More paths → smoother bands, slower compute. */
  paths: z.number().int().min(100).max(5000).default(800),
  /** PRNG seed — identical seed + params reproduce identical output. */
  seed: z.number().int().nonnegative().default(1),
  /** Optional target end-value for a "probability of reaching" readout. */
  targetValue: z.number().min(0).nullable().default(null),
});
export type MonteCarloParams = z.infer<typeof monteCarloParamsSchema>;

/** Percentile band of portfolio value at a single time step. */
export const monteCarloBandSchema = z.object({
  step: z.number().int(),
  yearFraction: z.number(),
  p5: z.number(),
  p25: z.number(),
  p50: z.number(),
  p75: z.number(),
  p95: z.number(),
});
export type MonteCarloBand = z.infer<typeof monteCarloBandSchema>;

export const monteCarloResultSchema = z.object({
  periodsPerYear: z.number().int(),
  steps: z.number().int(),
  /** Per-step percentile bands, index 0 = starting capital. */
  bands: z.array(monteCarloBandSchema),
  /** A handful of full paths for visual texture (each length = steps + 1). */
  samplePaths: z.array(z.array(z.number())),
  endValues: z.object({
    p5: z.number(),
    p25: z.number(),
    p50: z.number(),
    p75: z.number(),
    p95: z.number(),
    mean: z.number(),
  }),
  /** Fraction of paths ending ≥ targetValue, or null if no target set. */
  probabilityOfTarget: z.number().min(0).max(1).nullable(),
  /** startingCapital + monthlyContribution × steps. */
  totalContributed: z.number(),
  /** Median end value ÷ total contributed. */
  medianMultiple: z.number(),
  seed: z.number().int(),
  generatedAt: z.string(),
  summary: z.string(),
});
export type MonteCarloResult = z.infer<typeof monteCarloResultSchema>;
