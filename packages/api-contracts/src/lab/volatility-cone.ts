import { z } from 'zod';

/**
 * Volatility Cone "Lab" contracts.
 *
 * A deterministic, seeded study of how ANNUALIZED realized volatility is
 * distributed across different rolling window lengths. It has NO data
 * dependency (no DB, no provider) — it runs on a clearly-labelled synthetic,
 * seeded price path — so it renders at any time, including during a database
 * outage. Determinism (scenario + seed in → identical cone out) is a
 * first-class requirement, matching Aurox's deterministic-first doctrine.
 *
 * The cone is the classic "does current volatility look high or low relative to
 * its own history at each horizon?" view: for each window we plot the historical
 * min / p10 / p25 / median / p75 / p90 / max of overlapping realized-vol samples,
 * then overlay the most recent realized vol so its position in that distribution
 * is legible.
 */
export const volatilityScenarioSchema = z.enum([
  'calm',
  'steady',
  'clustered',
  'shock',
  'trending',
]);
export type VolatilityScenario = z.infer<typeof volatilityScenarioSchema>;

export const volatilityConeParamsSchema = z.object({
  /** Synthetic volatility regime to generate the illustrative price path. */
  scenario: volatilityScenarioSchema.default('steady'),
  /** History length in years of daily bars to generate and study. */
  years: z.number().int().min(1).max(10).default(3),
  /** Baseline annualized volatility, in percent (e.g. 20 → 20%/yr). */
  baseVolPct: z.number().min(1).max(120).default(20),
  /** PRNG seed — identical seed + params reproduce identical output. */
  seed: z.number().int().nonnegative().default(1),
});
export type VolatilityConeParams = z.infer<typeof volatilityConeParamsSchema>;

/** Historical distribution of annualized realized vol for one rolling window. */
export const volatilityConeBandSchema = z.object({
  /** Rolling window length in trading days. */
  window: z.number().int().positive(),
  /** Human label for the window (e.g. "1M", "3M", "1Y"). */
  label: z.string(),
  /** Annualized realized vol as a fraction (0.2 = 20%). */
  min: z.number().min(0),
  p10: z.number().min(0),
  p25: z.number().min(0),
  median: z.number().min(0),
  p75: z.number().min(0),
  p90: z.number().min(0),
  max: z.number().min(0),
  /** Most recent (latest complete window) realized vol, annualized fraction. */
  current: z.number().min(0).nullable(),
  /** Where `current` sits within the historical distribution, in [0,1]. */
  currentPercentile: z.number().min(0).max(1).nullable(),
  /** Number of overlapping rolling samples behind this distribution. */
  sampleSize: z.number().int().nonnegative(),
});
export type VolatilityConeBand = z.infer<typeof volatilityConeBandSchema>;

export const volatilityConeResultSchema = z.object({
  scenario: volatilityScenarioSchema,
  seed: z.number().int(),
  generatedAt: z.string(),
  /** Trading days per year used to annualize (typically 252). */
  tradingDaysPerYear: z.number().int().positive(),
  /** Number of daily bars generated and studied. */
  sampleBars: z.number().int().nonnegative(),
  /** Per-window historical distributions + current overlay, short window first. */
  bands: z.array(volatilityConeBandSchema),
  /** Downsampled synthetic close path for a small context chart. */
  path: z.array(z.number()),
  /** Headline: latest realized vol at the shortest window (annualized fraction). */
  currentShortVol: z.number().min(0).nullable(),
  /** Latest realized vol at the longest window (annualized fraction). */
  currentLongVol: z.number().min(0).nullable(),
  /** Plain-language summary of the current vol regime vs its history. */
  summary: z.string(),
});
export type VolatilityConeResult = z.infer<typeof volatilityConeResultSchema>;
