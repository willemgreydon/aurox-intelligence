import type { CandleFeatures, DetectedPattern, EvidenceStrength, CandleDirection } from '@repo/api-contracts';
import { clamp } from '../util/clamp';

/**
 * Deterministic single/multi-bar candlestick pattern detection.
 *
 * Each detector encodes an explicit geometric definition and evaluates the most
 * recent candle(s) of the series. Detection is a GEOMETRIC FACT — the returned
 * `confidence` reflects how cleanly the geometry matches the definition, NOT the
 * probability that a trade will succeed. Directional bias here is the pattern's
 * conventional shape; whether that bias is meaningful depends on trend/structure
 * context, which is applied later by the confluence engine (never here).
 */

// Thresholds — explicit and documented; not fitted to any dataset.
const DOJI_BODY_MAX = 0.1;
const LONG_WICK_MIN = 0.3;
const SMALL_BODY_MAX = 0.35;
const DOMINANT_WICK_MIN = 0.5;
const OPPOSITE_WICK_MAX = 0.2;
const MARUBOZU_BODY_MIN = 0.9;

function strengthFrom(confidence: number): EvidenceStrength {
  if (confidence < 0.4) return 'weak';
  if (confidence < 0.7) return 'moderate';
  return 'strong';
}

function make(
  pattern: DetectedPattern['pattern'],
  direction: CandleDirection,
  confidence: number,
  explanation: string,
  candleIndexes: number[],
): DetectedPattern {
  const c = clamp(confidence, 0, 1);
  return { pattern, direction, strength: strengthFrom(c), confidence: c, explanation, candleIndexes };
}

function detectDoji(bar: CandleFeatures, index: number): DetectedPattern | null {
  if (bar.range <= 0 || bar.bodyToRangeRatio > DOJI_BODY_MAX) return null;
  const quality = clamp(1 - bar.bodyToRangeRatio / DOJI_BODY_MAX, 0, 1) * 0.6 + 0.3;
  if (bar.upperWickRatio >= LONG_WICK_MIN && bar.lowerWickRatio >= LONG_WICK_MIN) {
    return make(
      'long_legged_doji',
      'neutral',
      quality,
      `Indecision: tiny body (${(bar.bodyToRangeRatio * 100).toFixed(0)}% of range) with long wicks on both sides.`,
      [index],
    );
  }
  return make(
    'doji',
    'neutral',
    quality,
    `Doji: open and close nearly equal (body ${(bar.bodyToRangeRatio * 100).toFixed(0)}% of range) — indecision.`,
    [index],
  );
}

function detectHammerFamily(bar: CandleFeatures, index: number): DetectedPattern | null {
  if (bar.range <= 0 || bar.bodyToRangeRatio > SMALL_BODY_MAX) return null;

  // Lower-wick dominant → hammer (bullish shape).
  if (bar.lowerWickRatio >= DOMINANT_WICK_MIN && bar.upperWickRatio <= OPPOSITE_WICK_MAX) {
    const quality = clamp(bar.lowerWickRatio, 0, 1);
    return make(
      'hammer',
      'bullish',
      quality,
      `Hammer: long lower wick (${(bar.lowerWickRatio * 100).toFixed(0)}% of range) rejecting lower prices.`,
      [index],
    );
  }

  // Upper-wick dominant → inverted hammer (bullish body) or shooting star (bearish body).
  if (bar.upperWickRatio >= DOMINANT_WICK_MIN && bar.lowerWickRatio <= OPPOSITE_WICK_MAX) {
    const quality = clamp(bar.upperWickRatio, 0, 1);
    if (bar.direction === 'bearish') {
      return make(
        'shooting_star',
        'bearish',
        quality,
        `Shooting star: long upper wick (${(bar.upperWickRatio * 100).toFixed(0)}% of range) with a bearish close.`,
        [index],
      );
    }
    return make(
      'inverted_hammer',
      'bullish',
      quality,
      `Inverted hammer: long upper wick (${(bar.upperWickRatio * 100).toFixed(0)}% of range) probing higher.`,
      [index],
    );
  }

  return null;
}

function detectMarubozu(bar: CandleFeatures, index: number): DetectedPattern | null {
  if (bar.range <= 0 || bar.bodyToRangeRatio < MARUBOZU_BODY_MIN || bar.direction === 'neutral') return null;
  const quality = clamp(bar.bodyToRangeRatio, 0, 1);
  if (bar.direction === 'bullish') {
    return make('bullish_marubozu', 'bullish', quality, 'Bullish marubozu: full-body up candle with negligible wicks.', [index]);
  }
  return make('bearish_marubozu', 'bearish', quality, 'Bearish marubozu: full-body down candle with negligible wicks.', [index]);
}

function detectEngulfing(prev: CandleFeatures, curr: CandleFeatures, prevIdx: number, currIdx: number): DetectedPattern | null {
  if (prev.range <= 0 || curr.range <= 0) return null;
  const currBodyTop = Math.max(curr.open, curr.close);
  const currBodyBottom = Math.min(curr.open, curr.close);
  const prevBodyTop = Math.max(prev.open, prev.close);
  const prevBodyBottom = Math.min(prev.open, prev.close);
  const engulfs = currBodyTop >= prevBodyTop && currBodyBottom <= prevBodyBottom && curr.bodySize > prev.bodySize;
  if (!engulfs) return null;

  if (prev.direction === 'bearish' && curr.direction === 'bullish') {
    const quality = clamp(0.5 + (curr.bodySize - prev.bodySize) / (curr.range || 1), 0, 1);
    return make('bullish_engulfing', 'bullish', quality, "Bullish engulfing: up-candle body fully engulfs the prior down-candle.", [prevIdx, currIdx]);
  }
  if (prev.direction === 'bullish' && curr.direction === 'bearish') {
    const quality = clamp(0.5 + (curr.bodySize - prev.bodySize) / (curr.range || 1), 0, 1);
    return make('bearish_engulfing', 'bearish', quality, 'Bearish engulfing: down-candle body fully engulfs the prior up-candle.', [prevIdx, currIdx]);
  }
  return null;
}

function detectInsideOutside(prev: CandleFeatures, curr: CandleFeatures, prevIdx: number, currIdx: number): DetectedPattern | null {
  const inside = curr.high <= prev.high && curr.low >= prev.low;
  if (inside) {
    return make('inside_bar', 'neutral', 0.45, 'Inside bar: range contained within the prior bar — consolidation/compression.', [prevIdx, currIdx]);
  }
  const outside = curr.high >= prev.high && curr.low <= prev.low && curr.range > prev.range;
  if (outside) {
    const dir: CandleDirection = curr.direction;
    return make('outside_bar', dir, 0.5, `Outside bar: engulfs the prior range and closes ${dir}.`, [prevIdx, currIdx]);
  }
  return null;
}

function detectStar(
  a: CandleFeatures,
  b: CandleFeatures,
  c: CandleFeatures,
  aIdx: number,
  bIdx: number,
  cIdx: number,
): DetectedPattern | null {
  if (a.range <= 0 || c.range <= 0) return null;
  const aMid = (a.open + a.close) / 2;
  const starIsSmall = b.bodyToRangeRatio <= SMALL_BODY_MAX;
  if (!starIsSmall) return null;

  // Morning star: down, small star, strong up closing above the midpoint of bar A.
  if (a.direction === 'bearish' && a.bodyToRangeRatio >= 0.5 && c.direction === 'bullish' && c.close > aMid) {
    const quality = clamp(0.5 + (c.close - aMid) / (a.range || 1), 0, 1);
    return make('morning_star', 'bullish', quality, 'Morning star: decline, indecision, then a strong up-close reclaiming ground.', [aIdx, bIdx, cIdx]);
  }
  // Evening star: up, small star, strong down closing below the midpoint of bar A.
  if (a.direction === 'bullish' && a.bodyToRangeRatio >= 0.5 && c.direction === 'bearish' && c.close < aMid) {
    const quality = clamp(0.5 + (aMid - c.close) / (a.range || 1), 0, 1);
    return make('evening_star', 'bearish', quality, 'Evening star: advance, indecision, then a strong down-close giving back ground.', [aIdx, bIdx, cIdx]);
  }
  return null;
}

/**
 * Detect patterns forming at the most recent candle of the series. Returns all
 * matches (a bar may satisfy multiple definitions, e.g. doji + inside bar).
 */
export function detectPatterns(features: readonly CandleFeatures[]): DetectedPattern[] {
  const n = features.length;
  if (n === 0) return [];
  const patterns: DetectedPattern[] = [];
  const last = features[n - 1]!;
  const lastIdx = n - 1;

  const doji = detectDoji(last, lastIdx);
  if (doji) patterns.push(doji);
  const hammer = detectHammerFamily(last, lastIdx);
  if (hammer) patterns.push(hammer);
  const maru = detectMarubozu(last, lastIdx);
  if (maru) patterns.push(maru);

  if (n >= 2) {
    const prev = features[n - 2]!;
    const eng = detectEngulfing(prev, last, n - 2, lastIdx);
    if (eng) patterns.push(eng);
    const io = detectInsideOutside(prev, last, n - 2, lastIdx);
    if (io) patterns.push(io);
  }

  if (n >= 3) {
    const a = features[n - 3]!;
    const b = features[n - 2]!;
    const star = detectStar(a, b, last, n - 3, n - 2, lastIdx);
    if (star) patterns.push(star);
  }

  return patterns;
}
