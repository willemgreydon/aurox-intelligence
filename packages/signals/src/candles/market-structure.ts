import type { CandleDirection, MarketStructure, StructureLevel } from '@repo/api-contracts';
import { clamp } from '../util/clamp';
import type { CandleFeatures } from '@repo/api-contracts';

/**
 * Deterministic market-structure analysis from candle features.
 *
 * Swing detection uses a symmetric fractal window: a bar is a swing HIGH if its
 * high is >= every high within SWING_WINDOW bars on each side (and strictly >
 * at least one neighbour), and symmetrically for swing LOWs. This is an
 * explicit, documented rule — no fitted parameters.
 */
const SWING_WINDOW = 2;
/** Fraction of price within which swing levels are treated as the same S/R zone. */
const LEVEL_TOLERANCE = 0.015;
/** Min swing points needed before we assert a directional regime. */
const MIN_SWINGS = 3;

interface Swing {
  index: number;
  price: number;
  kind: 'high' | 'low';
}

function findSwings(features: readonly CandleFeatures[]): Swing[] {
  const swings: Swing[] = [];
  for (let i = SWING_WINDOW; i < features.length - SWING_WINDOW; i += 1) {
    const bar = features[i]!;
    let isHigh = true;
    let isLow = true;
    let strictHigh = false;
    let strictLow = false;
    for (let j = i - SWING_WINDOW; j <= i + SWING_WINDOW; j += 1) {
      if (j === i) continue;
      const other = features[j]!;
      if (bar.high < other.high) isHigh = false;
      if (bar.high > other.high) strictHigh = true;
      if (bar.low > other.low) isLow = false;
      if (bar.low < other.low) strictLow = true;
    }
    if (isHigh && strictHigh) swings.push({ index: i, price: bar.high, kind: 'high' });
    if (isLow && strictLow) swings.push({ index: i, price: bar.low, kind: 'low' });
  }
  return swings;
}

function clusterLevels(prices: number[]): StructureLevel[] {
  const sorted = [...prices].sort((a, b) => a - b);
  const clusters: { sum: number; count: number; anchor: number }[] = [];
  for (const price of sorted) {
    const last = clusters[clusters.length - 1];
    if (last && Math.abs(price - last.anchor) <= last.anchor * LEVEL_TOLERANCE) {
      last.sum += price;
      last.count += 1;
    } else {
      clusters.push({ sum: price, count: 1, anchor: price });
    }
  }
  return clusters.map((c) => ({ price: c.sum / c.count, touches: c.count, distancePct: 0 }));
}

export function analyzeMarketStructure(features: readonly CandleFeatures[]): MarketStructure {
  const empty: MarketStructure = {
    regime: 'unknown',
    trend: 'neutral',
    strength: 0,
    lastSwingHigh: null,
    lastSwingLow: null,
    higherHighs: false,
    higherLows: false,
    lowerHighs: false,
    lowerLows: false,
    structureBreak: 'neutral',
    nearestSupport: null,
    nearestResistance: null,
    breakout: 'neutral',
    failedBreakout: false,
  };

  if (features.length < SWING_WINDOW * 2 + 2) return empty;

  const swings = findSwings(features);
  const highs = swings.filter((s) => s.kind === 'high');
  const lows = swings.filter((s) => s.kind === 'low');
  const latest = features[features.length - 1]!;

  const lastSwingHigh = highs.length > 0 ? highs[highs.length - 1]!.price : null;
  const lastSwingLow = lows.length > 0 ? lows[lows.length - 1]!.price : null;

  const higherHighs = highs.length >= 2 && highs[highs.length - 1]!.price > highs[highs.length - 2]!.price;
  const lowerHighs = highs.length >= 2 && highs[highs.length - 1]!.price < highs[highs.length - 2]!.price;
  const higherLows = lows.length >= 2 && lows[lows.length - 1]!.price > lows[lows.length - 2]!.price;
  const lowerLows = lows.length >= 2 && lows[lows.length - 1]!.price < lows[lows.length - 2]!.price;

  // Regime from the swing sequence.
  let regime: MarketStructure['regime'] = 'unknown';
  let trend: CandleDirection = 'neutral';
  if (swings.length >= MIN_SWINGS) {
    if (higherHighs && higherLows) {
      regime = 'uptrend';
      trend = 'bullish';
    } else if (lowerHighs && lowerLows) {
      regime = 'downtrend';
      trend = 'bearish';
    } else if ((higherHighs && lowerLows) || (lowerHighs && higherLows)) {
      regime = 'transition';
    } else {
      regime = 'range';
    }
  }

  // Strength: consistency of the last few swings with the regime direction.
  let strength = 0;
  if (regime === 'uptrend' || regime === 'downtrend') {
    const alignedHighs = higherHighs === (regime === 'uptrend');
    const alignedLows = higherLows === (regime === 'uptrend');
    strength = clamp((Number(alignedHighs) + Number(alignedLows)) / 2 + Math.min(swings.length, 6) / 20, 0, 1);
  } else if (regime === 'range') {
    strength = 0.4;
  } else if (regime === 'transition') {
    strength = 0.3;
  }

  // Support/resistance from clustered swing levels relative to the latest close.
  const supportLevels = clusterLevels(lows.map((s) => s.price))
    .map((lvl) => ({ ...lvl, distancePct: (lvl.price - latest.close) / latest.close }))
    .filter((lvl) => lvl.price <= latest.close)
    .sort((a, b) => b.price - a.price);
  const resistanceLevels = clusterLevels(highs.map((s) => s.price))
    .map((lvl) => ({ ...lvl, distancePct: (lvl.price - latest.close) / latest.close }))
    .filter((lvl) => lvl.price >= latest.close)
    .sort((a, b) => a.price - b.price);

  const nearestSupport = supportLevels[0] ?? null;
  const nearestResistance = resistanceLevels[0] ?? null;

  // Structure break: latest close beyond the most recent prior swing.
  // Use the swing that formed before the confirmation window (index < len - SWING_WINDOW).
  const priorHigh = [...highs].reverse().find((s) => s.index <= features.length - 1 - SWING_WINDOW);
  const priorLow = [...lows].reverse().find((s) => s.index <= features.length - 1 - SWING_WINDOW);
  let structureBreak: CandleDirection = 'neutral';
  if (priorHigh && latest.close > priorHigh.price) structureBreak = 'bullish';
  else if (priorLow && latest.close < priorLow.price) structureBreak = 'bearish';

  // Breakout vs failed breakout: did price pierce a level and hold, or reject?
  let breakout: CandleDirection = 'neutral';
  let failedBreakout = false;
  if (priorHigh) {
    const pierced = latest.high > priorHigh.price;
    const held = latest.close > priorHigh.price;
    if (pierced && held) breakout = 'bullish';
    else if (pierced && !held) failedBreakout = true;
  }
  if (breakout === 'neutral' && priorLow) {
    const pierced = latest.low < priorLow.price;
    const held = latest.close < priorLow.price;
    if (pierced && held) breakout = 'bearish';
    else if (pierced && !held) failedBreakout = true;
  }

  return {
    regime,
    trend,
    strength,
    lastSwingHigh,
    lastSwingLow,
    higherHighs,
    higherLows,
    lowerHighs,
    lowerLows,
    structureBreak,
    nearestSupport,
    nearestResistance,
    breakout,
    failedBreakout,
  };
}
