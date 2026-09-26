import { computeCandleIntelligence } from '@repo/signals';
import type {
  CandleDirection,
  CandleIntelligence,
  CandlePatternName,
  DetectedPattern,
} from '@repo/api-contracts';

/**
 * Maps the pure `CandleIntelligence` engine output into a display-ready view
 * model for the asset-detail Candle Intelligence panel.
 *
 * Boundary note: this is a route-side mapper. The only computation it performs
 * is calling the PURE, deterministic `computeCandleIntelligence` engine and
 * formatting its result for display — no financial math lives here or in the
 * component. Language is deliberately evidence-based ("bullish evidence"),
 * never advice ("Buy").
 */

export type Tone = 'positive' | 'negative' | 'neutral' | 'muted';

export type CandleSummaryRow = { label: string; value: string; tone: Tone };
export type CandlePatternRow = { label: string; direction: 'Bullish' | 'Bearish' | 'Neutral'; strength: string; detail: string };
export type CandleTimeframeRow = { label: string; value: string; tone: Tone };

export type CandleIntelligenceViewModel = {
  available: boolean;
  headline: string;
  directionLabel: 'Bullish' | 'Bearish' | 'Neutral';
  directionTone: Tone;
  scoreDisplay: string;
  confidenceDisplay: string;
  confidencePct: number;
  hasLowConfidence: boolean;
  summaryRows: CandleSummaryRow[];
  patterns: CandlePatternRow[];
  multiTimeframe: CandleTimeframeRow[];
  reasons: string[];
  warnings: string[];
  invalidation: string[];
  disclaimer: string;
  insufficientMessage: string | null;
};

const PATTERN_LABELS: Record<CandlePatternName, string> = {
  doji: 'Doji',
  long_legged_doji: 'Long-legged Doji',
  hammer: 'Hammer',
  inverted_hammer: 'Inverted Hammer',
  shooting_star: 'Shooting Star',
  bullish_engulfing: 'Bullish Engulfing',
  bearish_engulfing: 'Bearish Engulfing',
  morning_star: 'Morning Star',
  evening_star: 'Evening Star',
  inside_bar: 'Inside Bar',
  outside_bar: 'Outside Bar',
  bullish_marubozu: 'Bullish Marubozu',
  bearish_marubozu: 'Bearish Marubozu',
};

const REGIME_LABELS: Record<CandleIntelligence['structure']['regime'], string> = {
  uptrend: 'Uptrend (higher highs & lows)',
  downtrend: 'Downtrend (lower highs & lows)',
  range: 'Range-bound',
  transition: 'Transition (trend unclear)',
  unknown: 'Undetermined',
};

function toneForDirection(direction: CandleDirection): Tone {
  return direction === 'bullish' ? 'positive' : direction === 'bearish' ? 'negative' : 'neutral';
}

function directionWord(direction: CandleDirection): 'Bullish' | 'Bearish' | 'Neutral' {
  return direction === 'bullish' ? 'Bullish' : direction === 'bearish' ? 'Bearish' : 'Neutral';
}

function strengthWord(strength: DetectedPattern['strength']): string {
  return strength.charAt(0).toUpperCase() + strength.slice(1);
}

function buildHeadline(direction: CandleDirection, score: number, confidence: number): string {
  if (direction === 'neutral') return 'Mixed / neutral evidence';
  const magnitude = Math.abs(score);
  const band = magnitude >= 0.45 && confidence >= 0.6 ? 'Strong' : magnitude >= 0.25 ? 'Moderate' : 'Weak';
  return `${band} ${direction} evidence`;
}

function pressureRow(intel: CandleIntelligence): CandleSummaryRow {
  const { buyingPressure, sellingPressure, exhaustion } = intel.pressure;
  let value: string;
  let tone: Tone;
  if (Math.abs(buyingPressure - sellingPressure) < 0.1) {
    value = 'Balanced';
    tone = 'neutral';
  } else if (buyingPressure > sellingPressure) {
    value = 'Buyers in control';
    tone = 'positive';
  } else {
    value = 'Sellers in control';
    tone = 'negative';
  }
  if (exhaustion > 0.5) value += ' — move may be tiring';
  return { label: 'Candle pressure', value, tone };
}

function channelRow(intel: CandleIntelligence, key: 'trend' | 'momentum' | 'volume' | 'volatility', label: string): CandleSummaryRow {
  const ch = intel.confirmation.find((c) => c.key === key);
  if (!ch) return { label, value: 'Unavailable', tone: 'muted' };
  const value = ch.label === 'neutral' ? 'Neutral' : ch.label === 'bullish' ? 'Supportive (bullish)' : 'Supportive (bearish)';
  return { label, value, tone: toneForDirection(ch.label) };
}

export interface CandleIntelligenceMapperInput {
  symbol: string;
  assetClass: 'stock' | 'etf' | 'crypto';
  /** Full daily OHLCV history, ascending. */
  bars: { timestamp: string; open: number; high: number; low: number; close: number; volume: number | null }[];
  /** Passed-in ISO timestamp — the engine never reads ambient time. */
  generatedAt: string;
}

export function buildCandleIntelligenceViewModel(input: CandleIntelligenceMapperInput): CandleIntelligenceViewModel {
  const intel = computeCandleIntelligence({
    symbol: input.symbol,
    assetClass: input.assetClass,
    generatedAt: input.generatedAt,
    bars: input.bars,
  });

  const disclaimer = 'Candlestick evidence is contextual and deterministic — not a prediction or financial advice.';

  if (intel.hasInsufficientData) {
    return {
      available: false,
      headline: 'Insufficient data',
      directionLabel: 'Neutral',
      directionTone: 'muted',
      scoreDisplay: '—',
      confidenceDisplay: '—',
      confidencePct: 0,
      hasLowConfidence: true,
      summaryRows: [],
      patterns: [],
      multiTimeframe: [],
      reasons: [],
      warnings: intel.warnings,
      invalidation: [],
      disclaimer,
      insufficientMessage: intel.warnings[0] ?? 'Not enough price history for candlestick analysis.',
    };
  }

  const summaryRows: CandleSummaryRow[] = [
    { label: 'Market structure', value: REGIME_LABELS[intel.structure.regime], tone: toneForDirection(intel.structure.trend) },
    pressureRow(intel),
    channelRow(intel, 'momentum', 'Momentum'),
    channelRow(intel, 'volume', 'Volume'),
    channelRow(intel, 'volatility', 'Volatility'),
    { label: 'Overall evidence', value: buildHeadline(intel.direction, intel.score, intel.confidence), tone: toneForDirection(intel.direction) },
  ];

  const patterns: CandlePatternRow[] = intel.detectedPatterns.map((p) => ({
    label: PATTERN_LABELS[p.pattern],
    direction: directionWord(p.direction),
    strength: strengthWord(p.strength),
    detail: p.explanation,
  }));

  const multiTimeframe: CandleTimeframeRow[] = intel.multiTimeframe.map((b) => ({
    label: b.timeframe.charAt(0).toUpperCase() + b.timeframe.slice(1),
    value: directionWord(b.direction),
    tone: toneForDirection(b.direction),
  }));

  return {
    available: true,
    headline: buildHeadline(intel.direction, intel.score, intel.confidence),
    directionLabel: directionWord(intel.direction),
    directionTone: toneForDirection(intel.direction),
    scoreDisplay: `${intel.score >= 0 ? '+' : ''}${intel.score.toFixed(2)}`,
    confidenceDisplay: intel.confidence.toFixed(2),
    confidencePct: Math.round(intel.confidence * 100),
    hasLowConfidence: intel.confidence < 0.4,
    summaryRows,
    patterns,
    multiTimeframe,
    reasons: intel.reasons,
    warnings: intel.warnings,
    invalidation: intel.invalidation,
    disclaimer,
    insufficientMessage: null,
  };
}
