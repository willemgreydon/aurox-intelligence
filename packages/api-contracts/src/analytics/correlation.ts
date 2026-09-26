import { z } from 'zod';

/**
 * Cross-asset correlation contracts.
 *
 * Correlation is computed from SYNCHRONIZED daily RETURNS (never raw price
 * levels), pairwise, so assets with different trading calendars (e.g. crypto
 * vs. equities) use their own maximal overlap. A pair with insufficient
 * overlapping observations, or a constant return series, yields
 * `correlation: null` with a reason — never a fabricated `0`.
 */

export const CORRELATION_METHODS = ['pearson'] as const;
export const CorrelationMethodSchema = z.enum(CORRELATION_METHODS);
export type CorrelationMethod = z.infer<typeof CorrelationMethodSchema>;

export const CORRELATION_RETURN_KINDS = ['log', 'simple'] as const;
export const CorrelationReturnKindSchema = z.enum(CORRELATION_RETURN_KINDS);
export type CorrelationReturnKind = z.infer<typeof CorrelationReturnKindSchema>;

export const CorrelationUnavailableReasonSchema = z.enum([
  'insufficient_overlap',
  'constant_series',
]);
export type CorrelationUnavailableReason = z.infer<typeof CorrelationUnavailableReasonSchema>;

/** A single ordered pair (a,b) with its computed correlation and provenance. */
export const CorrelationPairSchema = z.object({
  a: z.string(),
  b: z.string(),
  /** Pearson r in [-1, 1], or null when the pair could not be computed. */
  correlation: z.number().min(-1).max(1).nullable(),
  /** Number of overlapping return observations actually used. */
  observations: z.number().int().min(0),
  available: z.boolean(),
  reason: CorrelationUnavailableReasonSchema.nullable(),
});
export type CorrelationPair = z.infer<typeof CorrelationPairSchema>;

export const CorrelationMatrixSchema = z.object({
  assetIds: z.array(z.string()),
  /**
   * Symmetric matrix aligned to `assetIds`. Diagonal is 1. Off-diagonal cells
   * are the Pearson r, or null where the pair was not computable.
   */
  matrix: z.array(z.array(z.number().min(-1).max(1).nullable())),
  /** Every unique unordered pair, for heatmap tooltips and network edges. */
  pairs: z.array(CorrelationPairSchema),
  method: CorrelationMethodSchema,
  returnKind: CorrelationReturnKindSchema,
  /** Max most-recent aligned returns considered per pair. */
  window: z.number().int().positive(),
  /** Minimum overlapping observations required for a pair to be computed. */
  minObservations: z.number().int().positive(),
  coverage: z.object({
    totalPairs: z.number().int().min(0),
    computedPairs: z.number().int().min(0),
    blockedPairs: z.number().int().min(0),
  }),
  /** Injected timestamp (ISO). The engine never reads the clock. */
  generatedAt: z.string(),
});
export type CorrelationMatrix = z.infer<typeof CorrelationMatrixSchema>;
