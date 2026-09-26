import type { CandleDirection, CandleFeatures } from '@repo/api-contracts';
import { isFiniteNumber } from '../util/clamp';
import type { CandleBar } from './types';
import { RELATIVE_LOOKBACK } from './types';

/**
 * Sanitize raw OHLCV: keep only bars with finite O/H/L/C and enforce OHLC
 * consistency (high >= max(open,close), low <= min(open,close)). Malformed bars
 * are dropped rather than fabricated. Returns bars in the given order.
 */
export function sanitizeBars(bars: readonly CandleBar[]): CandleBar[] {
  const out: CandleBar[] = [];
  for (const bar of bars) {
    if (
      !isFiniteNumber(bar.open) ||
      !isFiniteNumber(bar.high) ||
      !isFiniteNumber(bar.low) ||
      !isFiniteNumber(bar.close)
    ) {
      continue;
    }
    const high = Math.max(bar.high, bar.open, bar.close);
    const low = Math.min(bar.low, bar.open, bar.close);
    out.push({
      timestamp: bar.timestamp,
      open: bar.open,
      high,
      low,
      close: bar.close,
      volume: isFiniteNumber(bar.volume) ? bar.volume : null,
    });
  }
  return out;
}

function directionOf(open: number, close: number): CandleDirection {
  if (close > open) return 'bullish';
  if (close < open) return 'bearish';
  return 'neutral';
}

/**
 * Derive scale-free geometric features for every (sanitized) bar. Deterministic
 * and pure. Zero-range candles are handled explicitly (ratios default to 0, and
 * closePositionInRange to 0.5). `relativeRange`/`relativeVolume` use a trailing
 * baseline and are null until enough history exists.
 */
export function deriveCandleFeatures(bars: readonly CandleBar[]): CandleFeatures[] {
  const clean = sanitizeBars(bars);
  const features: CandleFeatures[] = [];

  for (let i = 0; i < clean.length; i += 1) {
    const bar = clean[i]!;
    const range = bar.high - bar.low;
    const bodySize = Math.abs(bar.close - bar.open);
    const upperWick = bar.high - Math.max(bar.open, bar.close);
    const lowerWick = Math.min(bar.open, bar.close) - bar.low;

    const hasRange = range > 0;
    const bodyToRangeRatio = hasRange ? bodySize / range : 0;
    const upperWickRatio = hasRange ? upperWick / range : 0;
    const lowerWickRatio = hasRange ? lowerWick / range : 0;
    const closePositionInRange = hasRange ? (bar.close - bar.low) / range : 0.5;

    // Trailing baselines over the prior RELATIVE_LOOKBACK bars (exclusive).
    const windowStart = Math.max(0, i - RELATIVE_LOOKBACK);
    const priorRanges: number[] = [];
    const priorVolumes: number[] = [];
    for (let j = windowStart; j < i; j += 1) {
      const prior = clean[j]!;
      priorRanges.push(prior.high - prior.low);
      if (isFiniteNumber(prior.volume)) priorVolumes.push(prior.volume);
    }
    const avgRange = priorRanges.length > 0 ? priorRanges.reduce((a, b) => a + b, 0) / priorRanges.length : 0;
    const relativeRange = priorRanges.length >= 3 && avgRange > 0 ? range / avgRange : null;

    const avgVolume = priorVolumes.length > 0 ? priorVolumes.reduce((a, b) => a + b, 0) / priorVolumes.length : 0;
    const relativeVolume =
      isFiniteNumber(bar.volume) && priorVolumes.length >= 3 && avgVolume > 0 ? bar.volume / avgVolume : null;

    const prevClose = i > 0 ? clean[i - 1]!.close : null;
    const gap = prevClose !== null && prevClose !== 0 ? (bar.open - prevClose) / prevClose : null;

    features.push({
      timestamp: bar.timestamp,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      volume: bar.volume,
      direction: directionOf(bar.open, bar.close),
      bodySize,
      range,
      upperWick,
      lowerWick,
      bodyToRangeRatio,
      upperWickRatio,
      lowerWickRatio,
      closePositionInRange,
      relativeRange,
      relativeVolume,
      gap,
    });
  }

  return features;
}
