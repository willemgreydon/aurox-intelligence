import { z } from 'zod';

/**
 * Evidence-chain evaluation contracts: the shapes that answer
 * "how accurate / calibrated was the intelligence after its horizon matured?".
 * Backed by app.signal_outcomes / app.forecast_evaluations and the
 * app.signal_calibration / app.forecast_calibration views.
 */

const directionSchema = z.enum(['bullish', 'bearish', 'neutral']);

export const signalOutcomeSchema = z.object({
  signalId: z.string(),
  assetId: z.string(),
  symbol: z.string(),
  signalGeneratedAt: z.string(),
  horizonDays: z.number().int().positive(),
  evaluatedAt: z.string(),
  entryPrice: z.number(),
  exitPrice: z.number(),
  forwardReturn: z.number(),
  mfe: z.number().nullable(),
  mae: z.number().nullable(),
  predictedDirection: directionSchema,
  realizedDirection: directionSchema,
  directionCorrect: z.boolean(),
  signalScore: z.number().min(-1).max(1),
  signalConfidence: z.number().min(0).max(1),
  methodVersion: z.string(),
});
export type SignalOutcome = z.infer<typeof signalOutcomeSchema>;

export const forecastEvaluationSchema = z.object({
  forecastId: z.string(),
  assetId: z.string(),
  symbol: z.string().nullable(),
  producedAt: z.string(),
  horizon: z.string(),
  horizonDays: z.number().int().positive(),
  evaluatedAt: z.string(),
  referencePrice: z.number(),
  realizedPrice: z.number(),
  forwardReturn: z.number(),
  directionalBias: directionSchema,
  realizedDirection: directionSchema,
  directionCorrect: z.boolean(),
  brierScore: z.number().nullable(),
  confidenceScore: z.number().min(0).max(1),
  status: z.enum(['pending', 'matured', 'evaluated', 'insufficient_data']),
  methodVersion: z.string(),
});
export type ForecastEvaluation = z.infer<typeof forecastEvaluationSchema>;

/** One confidence-bucket × direction reliability row (from a calibration view). */
export const calibrationBucketSchema = z.object({
  /** 1..10 via width_bucket over [0,1]. */
  confidenceBucket: z.number().int(),
  direction: directionSchema,
  sampleSize: z.number().int().nonnegative(),
  /** Fraction of outcomes that moved in the predicted direction, [0,1]. */
  hitRate: z.number().min(0).max(1),
  avgForwardReturn: z.number(),
  avgConfidence: z.number().min(0).max(1).nullable(),
  /** Mean Brier score — forecast calibration only. */
  avgBrier: z.number().nullable(),
});
export type CalibrationBucket = z.infer<typeof calibrationBucketSchema>;
