import { z } from 'zod';

/**
 * Candlestick Intelligence contract — the canonical output of the deterministic
 * candlestick analysis engine in `@repo/signals`.
 *
 * Design principles (see docs/candlestick-intelligence.md):
 * - Every score is in [-1, 1]; every confidence is in [0, 1].
 * - `confidence` describes the STRENGTH/QUALITY OF THE DETECTED EVIDENCE, never
 *   a probability that a trade will succeed. Pattern detection is a geometric
 *   fact; predictive power is a separate empirical question.
 * - `direction`/`bias` is contextual evidence, not a Buy/Sell instruction.
 * - Output must be reproducible: no randomness, no ambient time.
 */

export const candleDirectionSchema = z.enum(['bullish', 'bearish', 'neutral']);
export type CandleDirection = z.infer<typeof candleDirectionSchema>;

export const evidenceStrengthSchema = z.enum(['weak', 'moderate', 'strong']);
export type EvidenceStrength = z.infer<typeof evidenceStrengthSchema>;

export const marketRegimeSchema = z.enum([
  'uptrend',
  'downtrend',
  'range',
  'transition',
  'unknown',
]);
export type MarketRegime = z.infer<typeof marketRegimeSchema>;

export const candlePatternNameSchema = z.enum([
  'doji',
  'long_legged_doji',
  'hammer',
  'inverted_hammer',
  'shooting_star',
  'bullish_engulfing',
  'bearish_engulfing',
  'morning_star',
  'evening_star',
  'inside_bar',
  'outside_bar',
  'bullish_marubozu',
  'bearish_marubozu',
]);
export type CandlePatternName = z.infer<typeof candlePatternNameSchema>;

/**
 * Per-candle derived geometry. All ratios are of the candle's own range/body so
 * they are scale-free and comparable across assets and price levels.
 */
export const candleFeaturesSchema = z.object({
  timestamp: z.string(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number().nullable(),
  direction: candleDirectionSchema,
  /** |close - open| */
  bodySize: z.number().min(0),
  /** high - low (0 for a zero-range candle) */
  range: z.number().min(0),
  upperWick: z.number().min(0),
  lowerWick: z.number().min(0),
  /** bodySize / range, in [0,1]; 0 when range is 0 */
  bodyToRangeRatio: z.number().min(0).max(1),
  /** upperWick / range, in [0,1] */
  upperWickRatio: z.number().min(0).max(1),
  /** lowerWick / range, in [0,1] */
  lowerWickRatio: z.number().min(0).max(1),
  /** where the close sits in [low,high]: 0 = at low, 1 = at high; 0.5 if zero-range */
  closePositionInRange: z.number().min(0).max(1),
  /** range vs the trailing average range (ATR-like); null if insufficient history */
  relativeRange: z.number().nullable(),
  /** volume vs trailing average volume; null if volume unavailable */
  relativeVolume: z.number().nullable(),
  /** (open - prevClose) / prevClose; null for the first bar */
  gap: z.number().nullable(),
});
export type CandleFeatures = z.infer<typeof candleFeaturesSchema>;

export const detectedPatternSchema = z.object({
  pattern: candlePatternNameSchema,
  direction: candleDirectionSchema,
  strength: evidenceStrengthSchema,
  /** quality of the geometric evidence, [0,1] — NOT a success probability */
  confidence: z.number().min(0).max(1),
  /** short factual description of the geometry that matched */
  explanation: z.string(),
  /** indices into the analyzed bar series that form the pattern */
  candleIndexes: z.array(z.number().int().nonnegative()),
});
export type DetectedPattern = z.infer<typeof detectedPatternSchema>;

export const structureLevelSchema = z.object({
  price: z.number(),
  /** number of touches / swings supporting this level */
  touches: z.number().int().nonnegative(),
  /** distance from latest close as a fraction of price, signed */
  distancePct: z.number(),
});
export type StructureLevel = z.infer<typeof structureLevelSchema>;

export const marketStructureSchema = z.object({
  regime: marketRegimeSchema,
  trend: candleDirectionSchema,
  /** [0,1] — how strongly the swing sequence supports the regime */
  strength: z.number().min(0).max(1),
  lastSwingHigh: z.number().nullable(),
  lastSwingLow: z.number().nullable(),
  higherHighs: z.boolean(),
  higherLows: z.boolean(),
  lowerHighs: z.boolean(),
  lowerLows: z.boolean(),
  /** true if the latest close broke the most recent swing high (up) or low (down) */
  structureBreak: candleDirectionSchema,
  nearestSupport: structureLevelSchema.nullable(),
  nearestResistance: structureLevelSchema.nullable(),
  /** confirmed breakout direction, or neutral if none */
  breakout: candleDirectionSchema,
  failedBreakout: z.boolean(),
});
export type MarketStructure = z.infer<typeof marketStructureSchema>;

export const candlePressureSchema = z.object({
  /** [0,1] cumulative buying pressure over the recent window */
  buyingPressure: z.number().min(0).max(1),
  /** [0,1] cumulative selling pressure over the recent window */
  sellingPressure: z.number().min(0).max(1),
  /** [0,1] evidence that the prevailing move is exhausting */
  exhaustion: z.number().min(0).max(1),
});
export type CandlePressure = z.infer<typeof candlePressureSchema>;

export const confirmationChannelSchema = z.object({
  key: z.enum(['trend', 'momentum', 'volume', 'volatility']),
  /** [-1,1] agreement with the candle bias; sign = direction */
  score: z.number().min(-1).max(1),
  label: candleDirectionSchema,
  explanation: z.string(),
});
export type ConfirmationChannel = z.infer<typeof confirmationChannelSchema>;

export const candleTimeframeSchema = z.enum(['daily', 'weekly', 'monthly']);
export type CandleTimeframe = z.infer<typeof candleTimeframeSchema>;

export const timeframeBiasSchema = z.object({
  timeframe: candleTimeframeSchema,
  direction: candleDirectionSchema,
  regime: marketRegimeSchema,
  confidence: z.number().min(0).max(1),
});
export type TimeframeBias = z.infer<typeof timeframeBiasSchema>;

/**
 * The full candlestick intelligence result for a single asset/timeframe.
 * `hasInsufficientData` MUST be honored by the UI — when true, score is 0 and
 * confidence is 0 and the layer should render an "insufficient data" state.
 */
export const candleIntelligenceSchema = z.object({
  symbol: z.string(),
  assetClass: z.enum(['stock', 'etf', 'crypto', 'fx', 'index']),
  timeframe: candleTimeframeSchema,
  generatedAt: z.string(),
  hasInsufficientData: z.boolean(),
  barsAnalyzed: z.number().int().nonnegative(),

  direction: candleDirectionSchema,
  /** [-1,1] contextual evidence score */
  score: z.number().min(-1).max(1),
  /** [0,1] quality of the evidence */
  confidence: z.number().min(0).max(1),

  structure: marketStructureSchema,
  pressure: candlePressureSchema,
  recentSequence: z.array(candleFeaturesSchema),
  detectedPatterns: z.array(detectedPatternSchema),
  confirmation: z.array(confirmationChannelSchema),
  multiTimeframe: z.array(timeframeBiasSchema),

  /** supporting evidence, most material first */
  reasons: z.array(z.string()),
  /** counter-evidence / caveats */
  warnings: z.array(z.string()),
  /** conditions that would invalidate the current bias */
  invalidation: z.array(z.string()),
});
export type CandleIntelligence = z.infer<typeof candleIntelligenceSchema>;
