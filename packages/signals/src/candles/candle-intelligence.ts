import type {
  CandleDirection,
  CandleFeatures,
  CandleIntelligence,
  CandlePressure,
  CandleTimeframe,
  ConfirmationChannel,
  DetectedPattern,
  MarketStructure,
  TimeframeBias,
} from '@repo/api-contracts';
import { clamp, isFiniteNumber } from '../util/clamp';
import { emaSeries } from '../indicators/ema';
import { computeRSI } from '../indicators/rsi';
import { computeATR } from '../indicators/atr';
import { deriveCandleFeatures } from './candle-features';
import { analyzeMarketStructure } from './market-structure';
import { detectPatterns } from './patterns';
import { resampleBars } from './resample';
import type { CandleBar } from './types';
import { CANDLE_MIN_BARS, RECENT_SEQUENCE_LENGTH } from './types';

export interface CandleIntelligenceInput {
  symbol: string;
  assetClass: 'stock' | 'etf' | 'crypto' | 'fx' | 'index';
  /** Passed in — the engine never reads ambient time (determinism). */
  generatedAt: string;
  /** DAILY OHLCV bars, ascending by time. Higher timeframes are derived. */
  bars: CandleBar[];
}

// Confluence weights. Chosen to keep candle patterns as CONTEXTUAL evidence
// rather than letting them dominate. Trend/momentum/structure carry the base.
const WEIGHTS = { trend: 0.28, momentum: 0.22, pattern: 0.3, breakout: 0.1, volume: 0.1 } as const;

const NEUTRAL_BAND = 0.12;

const BULLISH_REVERSALS: DetectedPattern['pattern'][] = ['hammer', 'inverted_hammer', 'morning_star', 'bullish_engulfing'];
const BEARISH_REVERSALS: DetectedPattern['pattern'][] = ['shooting_star', 'evening_star', 'bearish_engulfing'];
const CONTINUATIONS: DetectedPattern['pattern'][] = ['bullish_marubozu', 'bearish_marubozu', 'outside_bar'];

function nearLevelPct(assetClass: CandleIntelligenceInput['assetClass']): number {
  return assetClass === 'crypto' ? 0.04 : assetClass === 'fx' ? 0.015 : 0.025;
}

function directionFromScore(score: number): CandleDirection {
  if (score > NEUTRAL_BAND) return 'bullish';
  if (score < -NEUTRAL_BAND) return 'bearish';
  return 'neutral';
}

function sign(direction: CandleDirection): number {
  return direction === 'bullish' ? 1 : direction === 'bearish' ? -1 : 0;
}

/** Combined structure+EMA trend channel in [-1,1]. */
function trendChannel(closes: number[], structure: MarketStructure): ConfirmationChannel {
  const fast = emaSeries(closes, 10);
  const slow = emaSeries(closes, 30);
  const fastVal = fast[fast.length - 1];
  const slowVal = slow[slow.length - 1];
  let emaScore = 0;
  if (isFiniteNumber(fastVal) && isFiniteNumber(slowVal) && slowVal !== 0) {
    emaScore = clamp(((fastVal - slowVal) / slowVal) * 12, -1, 1);
  }
  const structScore = sign(structure.trend) * structure.strength;
  // Average corroborating views (they share underlying price info — averaging
  // rather than summing prevents double-counting the same trend).
  const score = clamp((emaScore + structScore) / 2, -1, 1);
  const label = directionFromScore(score);
  const emaText = isFiniteNumber(fastVal) && isFiniteNumber(slowVal)
    ? `EMA10 ${fastVal >= slowVal ? 'above' : 'below'} EMA30`
    : 'EMA trend unavailable';
  return {
    key: 'trend',
    score,
    label,
    explanation: `${emaText}; market structure ${structure.regime}.`,
  };
}

function momentumChannel(closes: number[]): ConfirmationChannel {
  const rsi = computeRSI(closes, 14);
  if (rsi === null) {
    return { key: 'momentum', score: 0, label: 'neutral', explanation: 'RSI unavailable (insufficient data).' };
  }
  const score = clamp((rsi - 50) / 50, -1, 1);
  return {
    key: 'momentum',
    score,
    label: directionFromScore(score),
    explanation: `RSI(14) = ${rsi.toFixed(1)} (${rsi >= 55 ? 'positive' : rsi <= 45 ? 'negative' : 'neutral'} momentum).`,
  };
}

function volumeChannel(features: CandleFeatures[]): ConfirmationChannel {
  const last = features[features.length - 1]!;
  if (!isFiniteNumber(last.relativeVolume)) {
    return { key: 'volume', score: 0, label: 'neutral', explanation: 'Volume unavailable — no participation confirmation.' };
  }
  const participation = clamp(last.relativeVolume - 1, -1, 1);
  const score = clamp(sign(last.direction) * Math.max(0, participation), -1, 1);
  const label = directionFromScore(score);
  return {
    key: 'volume',
    score,
    label,
    explanation: `Latest bar volume ${last.relativeVolume.toFixed(2)}× its recent average (${last.relativeVolume >= 1.2 ? 'above-average participation' : 'unremarkable participation'}).`,
  };
}

function volatilityChannel(bars: CandleBar[], features: CandleFeatures[]): ConfirmationChannel {
  const atr = computeATR(bars.map((b) => ({ high: b.high, low: b.low, close: b.close })), 14);
  const last = features[features.length - 1]!;
  const expanding = isFiniteNumber(last.relativeRange) && last.relativeRange > 1.3;
  const contracting = isFiniteNumber(last.relativeRange) && last.relativeRange < 0.7;
  // Volatility confirms the direction of the latest move when range is expanding.
  const score = expanding ? clamp(sign(last.direction) * 0.5, -1, 1) : 0;
  const atrText = atr !== null && last.close !== 0 ? `ATR(14) ≈ ${((atr / last.close) * 100).toFixed(1)}% of price` : 'ATR unavailable';
  return {
    key: 'volatility',
    score,
    label: directionFromScore(score),
    explanation: `${atrText}; range ${expanding ? 'expanding' : contracting ? 'contracting' : 'normal'}.`,
  };
}

function computePressure(features: CandleFeatures[], structure: MarketStructure): CandlePressure {
  const window = features.slice(-Math.min(10, features.length));
  let buy = 0;
  let sell = 0;
  for (const f of window) {
    const vol = isFiniteNumber(f.relativeVolume) ? clamp(f.relativeVolume, 0.5, 2) : 1;
    if (f.direction === 'bullish') buy += f.bodyToRangeRatio * vol;
    if (f.direction === 'bearish') sell += f.bodyToRangeRatio * vol;
    buy += f.lowerWickRatio * 0.4; // rejection of lows = latent buying
    sell += f.upperWickRatio * 0.4; // rejection of highs = latent selling
  }
  const total = buy + sell;
  const buyingPressure = total > 0 ? clamp(buy / total, 0, 1) : 0.5;
  const sellingPressure = total > 0 ? clamp(sell / total, 0, 1) : 0.5;

  // Exhaustion: in a trend, shrinking bodies in the trend direction + growing
  // counter-wicks suggest the move is tiring.
  let exhaustion = 0;
  if ((structure.trend === 'bullish' || structure.trend === 'bearish') && window.length >= 4) {
    const half = Math.floor(window.length / 2);
    const early = window.slice(0, half);
    const late = window.slice(half);
    const avg = (arr: CandleFeatures[], pick: (f: CandleFeatures) => number) =>
      arr.length > 0 ? arr.reduce((s, f) => s + pick(f), 0) / arr.length : 0;
    const earlyBody = avg(early, (f) => f.bodySize);
    const lateBody = avg(late, (f) => f.bodySize);
    const counterWick = structure.trend === 'bullish' ? avg(late, (f) => f.upperWickRatio) : avg(late, (f) => f.lowerWickRatio);
    const shrinking = earlyBody > 0 ? clamp((earlyBody - lateBody) / earlyBody, 0, 1) : 0;
    exhaustion = clamp(shrinking * 0.6 + counterWick * 0.4, 0, 1);
  }

  return { buyingPressure, sellingPressure, exhaustion };
}

/** Context multiplier applied to a pattern's directional contribution. */
function contextMultiplier(
  pattern: DetectedPattern,
  structure: MarketStructure,
  assetClass: CandleIntelligenceInput['assetClass'],
): { multiplier: number; note: string | null } {
  const near = nearLevelPct(assetClass);
  const supportDist = structure.nearestSupport ? Math.abs(structure.nearestSupport.distancePct) : Infinity;
  const resistanceDist = structure.nearestResistance ? Math.abs(structure.nearestResistance.distancePct) : Infinity;
  const nearSupport = supportDist <= near;
  const nearResistance = resistanceDist <= near;

  if (BULLISH_REVERSALS.includes(pattern.pattern)) {
    if (structure.regime === 'downtrend' && nearSupport) {
      return { multiplier: 1.4, note: 'bullish reversal candle formed after a decline at established support' };
    }
    if (structure.regime === 'uptrend' && nearResistance) {
      return { multiplier: 0.6, note: 'bullish candle appearing directly beneath resistance — weaker as continuation' };
    }
    if (structure.regime === 'range') {
      return { multiplier: 0.8, note: 'bullish candle inside a range — treat as range-bound, not a trend signal' };
    }
    return { multiplier: 1, note: null };
  }

  if (BEARISH_REVERSALS.includes(pattern.pattern)) {
    if (structure.regime === 'uptrend' && nearResistance) {
      return { multiplier: 1.4, note: 'bearish reversal candle formed after an advance at established resistance' };
    }
    if (structure.regime === 'downtrend' && nearSupport) {
      return { multiplier: 0.6, note: 'bearish candle appearing at support — weaker as continuation' };
    }
    if (structure.regime === 'range') {
      return { multiplier: 0.8, note: 'bearish candle inside a range — treat as range-bound' };
    }
    return { multiplier: 1, note: null };
  }

  if (CONTINUATIONS.includes(pattern.pattern)) {
    const aligned = sign(pattern.direction) === sign(structure.trend) && structure.trend !== 'neutral';
    return aligned
      ? { multiplier: 1.2, note: 'continuation candle aligned with the prevailing trend' }
      : { multiplier: 0.7, note: 'continuation candle against the prevailing trend — discounted' };
  }

  // Neutral patterns (doji, inside, long-legged) contribute ~0 directionally.
  return { multiplier: 0, note: null };
}

interface SingleResult {
  direction: CandleDirection;
  score: number;
  confidence: number;
  structure: MarketStructure;
  pressure: CandlePressure;
  recentSequence: CandleFeatures[];
  detectedPatterns: DetectedPattern[];
  confirmation: ConfirmationChannel[];
  reasons: string[];
  warnings: string[];
  invalidation: string[];
  barsAnalyzed: number;
}

/** Lower bar floor for derived higher-timeframe bias reads (weekly/monthly). */
const MTF_MIN_BARS = 8;

function analyzeSingle(
  bars: CandleBar[],
  assetClass: CandleIntelligenceInput['assetClass'],
  minBars: number = CANDLE_MIN_BARS,
): SingleResult | null {
  const features = deriveCandleFeatures(bars);
  if (features.length < minBars) return null;

  const cleanBars: CandleBar[] = features.map((f) => ({
    timestamp: f.timestamp,
    open: f.open,
    high: f.high,
    low: f.low,
    close: f.close,
    volume: f.volume,
  }));
  const closes = features.map((f) => f.close);
  const structure = analyzeMarketStructure(features);
  const patterns = detectPatterns(features);
  const pressure = computePressure(features, structure);

  const trend = trendChannel(closes, structure);
  const momentum = momentumChannel(closes);
  const volume = volumeChannel(features);
  const volatility = volatilityChannel(cleanBars, features);
  const confirmation = [trend, momentum, volume, volatility];

  // Pattern net contribution with contextual weighting.
  const reasons: string[] = [];
  const warnings: string[] = [];
  const invalidation: string[] = [];
  let patternNet = 0;
  for (const p of patterns) {
    const { multiplier, note } = contextMultiplier(p, structure, assetClass);
    patternNet += sign(p.direction) * p.confidence * multiplier;
    if (sign(p.direction) !== 0 && multiplier > 0) {
      reasons.push(`${p.explanation}${note ? ` — ${note}.` : ''}`);
    } else if (p.direction === 'neutral') {
      warnings.push(p.explanation);
    } else if (multiplier > 0 && multiplier < 1 && note) {
      warnings.push(`${p.explanation} — ${note}.`);
    }
  }
  const patternScore = clamp(patternNet, -1, 1);

  const breakoutScore = structure.failedBreakout
    ? -sign(structure.breakout === 'neutral' ? structure.structureBreak : structure.breakout) * 0.4
    : sign(structure.breakout) * (structure.breakout !== 'neutral' ? 0.7 : 0) + sign(structure.structureBreak) * 0.3;

  const rawScore =
    WEIGHTS.trend * trend.score +
    WEIGHTS.momentum * momentum.score +
    WEIGHTS.pattern * patternScore +
    WEIGHTS.breakout * clamp(breakoutScore, -1, 1) +
    WEIGHTS.volume * volume.score;
  const score = clamp(rawScore, -1, 1);
  const direction = directionFromScore(score);

  // ---- Evidence narrative -------------------------------------------------
  if (structure.regime === 'uptrend') reasons.unshift('Market structure is an uptrend (higher highs and higher lows).');
  else if (structure.regime === 'downtrend') reasons.unshift('Market structure is a downtrend (lower highs and lower lows).');
  else if (structure.regime === 'range') reasons.push('Price is range-bound with no clear trend.');
  else if (structure.regime === 'transition') warnings.push('Structure is transitioning — trend direction is ambiguous.');

  if (Math.abs(trend.score) > 0.2) reasons.push(trend.explanation);
  if (Math.abs(momentum.score) > 0.2) reasons.push(momentum.explanation);
  if (volume.score > 0.1) reasons.push(volume.explanation);
  else if (!isFiniteNumber(features[features.length - 1]!.relativeVolume)) warnings.push('Volume data unavailable — participation cannot be confirmed.');

  if (structure.breakout === 'bullish') reasons.push('Price broke above the prior swing high and held (bullish breakout).');
  if (structure.breakout === 'bearish') reasons.push('Price broke below the prior swing low and held (bearish breakout).');
  if (structure.failedBreakout) warnings.push('A breakout was attempted but price closed back inside the range (failed breakout).');

  if (pressure.exhaustion > 0.5) {
    warnings.push(
      `Trend may be exhausting — ${structure.trend === 'bullish' ? 'up' : 'down'}-candle bodies are contracting with growing counter-wicks.`,
    );
  }

  // Counter-evidence vs the chosen bias.
  if (direction === 'bullish') {
    if (momentum.score < -0.1) warnings.push('Momentum (RSI) is not yet confirming the bullish read.');
    if (structure.nearestResistance && Math.abs(structure.nearestResistance.distancePct) <= nearLevelPct(assetClass)) {
      warnings.push('Resistance is nearby, capping immediate upside.');
    }
    if (trend.score < 0) warnings.push('Price remains below its medium-term trend — this is early/counter-trend evidence.');
    if (structure.nearestSupport) invalidation.push(`A decisive close below support (~${structure.nearestSupport.price.toFixed(2)}) would negate the bullish read.`);
  } else if (direction === 'bearish') {
    if (momentum.score > 0.1) warnings.push('Momentum (RSI) is not yet confirming the bearish read.');
    if (structure.nearestSupport && Math.abs(structure.nearestSupport.distancePct) <= nearLevelPct(assetClass)) {
      warnings.push('Support is nearby, cushioning immediate downside.');
    }
    if (trend.score > 0) warnings.push('Price remains above its medium-term trend — this is early/counter-trend evidence.');
    if (structure.nearestResistance) invalidation.push(`A decisive close above resistance (~${structure.nearestResistance.price.toFixed(2)}) would negate the bearish read.`);
  } else {
    reasons.push('Evidence is mixed — no directional bias is currently justified.');
  }
  if (structure.failedBreakout && structure.nearestResistance) {
    invalidation.push(`A close back above ~${structure.nearestResistance.price.toFixed(2)} would revive the breakout case.`);
  }

  // ---- Confidence: quality of the evidence, not P(success) ---------------
  const channels = [trend.score, momentum.score, volume.score, patternScore];
  const dirSign = sign(direction);
  const agreeing = dirSign === 0 ? 0 : channels.filter((c) => Math.sign(c) === dirSign && Math.abs(c) > 0.05).length;
  const conflicting = dirSign === 0 ? 0 : channels.filter((c) => Math.sign(c) === -dirSign && Math.abs(c) > 0.25).length;
  const maxPattern = patterns.reduce((m, p) => Math.max(m, p.confidence), 0);
  const dataSufficiency = clamp(features.length / 120, 0, 1);

  let confidence =
    0.3 +
    (agreeing / channels.length) * 0.35 +
    dataSufficiency * 0.15 +
    maxPattern * 0.1 -
    conflicting * 0.1;
  if (!isFiniteNumber(features[features.length - 1]!.relativeVolume)) confidence -= 0.05;
  confidence = clamp(confidence, 0, 0.9);
  if (direction === 'neutral') confidence = Math.min(confidence, 0.5);

  const recentSequence = features.slice(-Math.min(RECENT_SEQUENCE_LENGTH, features.length));

  return {
    direction,
    score,
    confidence,
    structure,
    pressure,
    recentSequence,
    detectedPatterns: patterns,
    confirmation,
    reasons,
    warnings,
    invalidation,
    barsAnalyzed: features.length,
  };
}

function timeframeBias(bars: CandleBar[], timeframe: CandleTimeframe, assetClass: CandleIntelligenceInput['assetClass']): TimeframeBias | null {
  const result = analyzeSingle(bars, assetClass, timeframe === 'daily' ? CANDLE_MIN_BARS : MTF_MIN_BARS);
  if (!result) return null;
  return {
    timeframe,
    direction: result.direction,
    regime: result.structure.regime,
    confidence: result.confidence,
  };
}

function insufficient(input: CandleIntelligenceInput, barsAnalyzed: number): CandleIntelligence {
  return {
    symbol: input.symbol,
    assetClass: input.assetClass,
    timeframe: 'daily',
    generatedAt: input.generatedAt,
    hasInsufficientData: true,
    barsAnalyzed,
    direction: 'neutral',
    score: 0,
    confidence: 0,
    structure: {
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
    },
    pressure: { buyingPressure: 0.5, sellingPressure: 0.5, exhaustion: 0 },
    recentSequence: [],
    detectedPatterns: [],
    confirmation: [],
    multiTimeframe: [],
    reasons: [],
    warnings: [`Insufficient history for candlestick analysis (need ≥ ${CANDLE_MIN_BARS} valid bars, have ${barsAnalyzed}).`],
    invalidation: [],
  };
}

/**
 * Compute the full candlestick intelligence for an asset from DAILY bars.
 * Higher timeframes (weekly, monthly) are derived by resampling. Pure and
 * deterministic: identical input + generatedAt → identical output.
 */
export function computeCandleIntelligence(input: CandleIntelligenceInput): CandleIntelligence {
  const daily = analyzeSingle(input.bars, input.assetClass);
  if (!daily) {
    const valid = deriveCandleFeatures(input.bars).length;
    return insufficient(input, valid);
  }

  const multiTimeframe: TimeframeBias[] = [];
  const dailyBias = timeframeBias(input.bars, 'daily', input.assetClass);
  if (dailyBias) multiTimeframe.push(dailyBias);
  const weeklyBias = timeframeBias(resampleBars(input.bars, 'weekly'), 'weekly', input.assetClass);
  if (weeklyBias) multiTimeframe.push(weeklyBias);
  const monthlyBias = timeframeBias(resampleBars(input.bars, 'monthly'), 'monthly', input.assetClass);
  if (monthlyBias) multiTimeframe.push(monthlyBias);

  // Multi-timeframe disagreement is explicit counter-evidence. Compare against
  // the higher-timeframe read, falling back to its structural regime when its
  // net direction is neutral (regime is the more stable trend indicator).
  const warnings = [...daily.warnings];
  const regimeDirection = (regime: string): CandleDirection =>
    regime === 'uptrend' ? 'bullish' : regime === 'downtrend' ? 'bearish' : 'neutral';
  const higher = multiTimeframe.filter((b) => b.timeframe !== 'daily');
  for (const b of higher) {
    const higherDir = b.direction !== 'neutral' ? b.direction : regimeDirection(b.regime);
    if (higherDir !== 'neutral' && daily.direction !== 'neutral' && higherDir !== daily.direction) {
      warnings.push(`Timeframe disagreement: the daily read is ${daily.direction} but the ${b.timeframe} trend is ${higherDir}.`);
    }
  }

  return {
    symbol: input.symbol,
    assetClass: input.assetClass,
    timeframe: 'daily',
    generatedAt: input.generatedAt,
    hasInsufficientData: false,
    barsAnalyzed: daily.barsAnalyzed,
    direction: daily.direction,
    score: daily.score,
    confidence: daily.confidence,
    structure: daily.structure,
    pressure: daily.pressure,
    recentSequence: daily.recentSequence,
    detectedPatterns: daily.detectedPatterns,
    confirmation: daily.confirmation,
    multiTimeframe,
    reasons: daily.reasons,
    warnings,
    invalidation: daily.invalidation,
  };
}
