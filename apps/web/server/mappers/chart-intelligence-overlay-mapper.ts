import {
  computeCandleIntelligence,
  deriveCandleFeatures,
  sanitizeBars,
} from '@repo/signals';
import type {
  CandleDirection,
  CandleFeatures,
  CandleIntelligence,
  CandlePatternName,
  DetectedPattern,
  MarketStructure,
} from '@repo/api-contracts';

/**
 * Maps the pure `CandleIntelligence` engine output into a COORDINATE-INDEPENDENT
 * overlay view model for the market chart. Every primitive is anchored by price
 * and/or bar timestamp — never by a pixel or a chart-viewport index — so the
 * client can project it onto whatever timeframe/zoom/mode it is currently
 * rendering (see `apps/web/lib/chart-intelligence-projection.ts`).
 *
 * Boundary note: this is a route-side mapper. The only computation it performs is
 * calling the PURE, deterministic engine (`computeCandleIntelligence`) plus the
 * pure `sanitizeBars`/`deriveCandleFeatures` helpers — SOLELY to resolve the
 * pattern `candleIndexes` back to their bar timestamps. It runs the exact same
 * `sanitize → deriveCandleFeatures` pipeline the engine runs internally, so the
 * indexes align deterministically. No second analysis, no financial math lives
 * here or in the chart component. Language is evidence-based, never advice.
 */

export type OverlayDirection = CandleDirection;

export type ChartOverlayLevelKind = 'support' | 'resistance';

export type ChartOverlayLevel = {
  kind: ChartOverlayLevelKind;
  /** Absolute price of the level. */
  price: number;
  /** Compact on-chart tag, e.g. 'S' / 'R'. */
  label: string;
  /** Number of swing touches supporting the level. */
  touches: number;
  /** Signed distance from the latest close, as a fraction of price. */
  distancePct: number;
};

export type ChartOverlaySwingKind = 'high' | 'low';

export type ChartOverlaySwing = {
  kind: ChartOverlaySwingKind;
  /** Absolute price of the swing. */
  price: number;
  /** Compact structure tag: HH / HL / LH / LL / SH / SL. */
  label: string;
  /** Human-readable description, e.g. 'Higher high'. */
  description: string;
};

export type ChartOverlayPattern = {
  /** Stable, deterministic id for React keys and de-dup. */
  key: string;
  pattern: CandlePatternName;
  /** Full display name, e.g. 'Bullish Engulfing'. */
  label: string;
  /** Compact glyph rendered on the chart, e.g. 'BE'. */
  glyph: string;
  direction: OverlayDirection;
  strength: DetectedPattern['strength'];
  /** Capitalised strength word, e.g. 'Strong'. */
  strengthLabel: string;
  /** [0,1] geometric evidence quality — NOT a probability of profit. */
  confidence: number;
  /** Timestamp of the confirming (last) candle — the X anchor. */
  anchorTimestamp: string;
  /** Timestamps of every candle that forms the pattern (for highlight). */
  candleTimestamps: string[];
  /** Price to anchor the marker to (the confirming candle high or low). */
  anchorPrice: number;
  /** Whether the marker sits above the high or below the low. */
  placement: 'above' | 'below';
  /** Short factual description of the matched geometry. */
  explanation: string;
  /** Contextual note, e.g. 'Formed near established support', or null. */
  context: string | null;
  /** Evidence that supports the interpretation. */
  supporting: string[];
  /** Evidence that argues against it. */
  counter: string[];
};

export type ChartOverlayEventKind = 'breakout' | 'failed_breakout' | 'structure_break';

export type ChartOverlayEvent = {
  kind: ChartOverlayEventKind;
  direction: OverlayDirection;
  /** Compact label, e.g. 'Breakout ↑', 'BOS ↓', 'Failed breakout'. */
  label: string;
  /** Latest close — the price anchor. */
  price: number;
  /** Latest bar timestamp — the X anchor. */
  anchorTimestamp: string;
  explanation: string;
};

export type ChartIntelligenceOverlay = {
  /** True when there is a meaningful overlay to render. */
  available: boolean;
  hasInsufficientData: boolean;
  symbol: string;
  generatedAt: string;
  direction: OverlayDirection;
  /** Short evidence headline, e.g. 'Moderate bullish evidence'. */
  headline: string;
  /** [0,1] evidence quality. */
  confidence: number;
  levels: ChartOverlayLevel[];
  swings: ChartOverlaySwing[];
  patterns: ChartOverlayPattern[];
  events: ChartOverlayEvent[];
  disclaimer: string;
  /** Populated only when `available` is false. */
  unavailableReason: string | null;
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

/** Compact 1–2 char glyphs kept legible at small chart scale. */
const PATTERN_GLYPHS: Record<CandlePatternName, string> = {
  doji: 'DJ',
  long_legged_doji: 'DJ',
  hammer: 'HM',
  inverted_hammer: 'IH',
  shooting_star: 'SS',
  bullish_engulfing: 'BE',
  bearish_engulfing: 'BE',
  morning_star: 'MS',
  evening_star: 'ES',
  inside_bar: 'IB',
  outside_bar: 'OB',
  bullish_marubozu: 'MB',
  bearish_marubozu: 'MB',
};

const DISCLAIMER =
  'Candlestick evidence is contextual and deterministic — not a prediction or financial advice.';

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function regimeWord(regime: MarketStructure['regime']): string {
  switch (regime) {
    case 'uptrend':
      return 'uptrend';
    case 'downtrend':
      return 'downtrend';
    case 'range':
      return 'range-bound structure';
    case 'transition':
      return 'transitioning structure';
    default:
      return 'undetermined structure';
  }
}

function buildHeadline(direction: CandleDirection, score: number, confidence: number): string {
  if (direction === 'neutral') return 'Mixed / neutral evidence';
  const magnitude = Math.abs(score);
  const band = magnitude >= 0.45 && confidence >= 0.6 ? 'Strong' : magnitude >= 0.25 ? 'Moderate' : 'Weak';
  return `${band} ${direction} evidence`;
}

function swingHighLabel(structure: MarketStructure): { label: string; description: string } {
  if (structure.higherHighs) return { label: 'HH', description: 'Higher high' };
  if (structure.lowerHighs) return { label: 'LH', description: 'Lower high' };
  return { label: 'SH', description: 'Swing high' };
}

function swingLowLabel(structure: MarketStructure): { label: string; description: string } {
  if (structure.higherLows) return { label: 'HL', description: 'Higher low' };
  if (structure.lowerLows) return { label: 'LL', description: 'Lower low' };
  return { label: 'SL', description: 'Swing low' };
}

/** Asset-class aware "near a level" band, mirroring the engine's thresholds. */
function nearLevelPct(assetClass: ChartIntelligenceOverlayInput['assetClass']): number {
  return assetClass === 'crypto' ? 0.04 : 0.025;
}

function buildLevels(structure: MarketStructure): ChartOverlayLevel[] {
  const levels: ChartOverlayLevel[] = [];
  if (structure.nearestSupport) {
    levels.push({
      kind: 'support',
      price: structure.nearestSupport.price,
      label: 'S',
      touches: structure.nearestSupport.touches,
      distancePct: structure.nearestSupport.distancePct,
    });
  }
  if (structure.nearestResistance) {
    levels.push({
      kind: 'resistance',
      price: structure.nearestResistance.price,
      label: 'R',
      touches: structure.nearestResistance.touches,
      distancePct: structure.nearestResistance.distancePct,
    });
  }
  return levels;
}

function buildSwings(structure: MarketStructure): ChartOverlaySwing[] {
  const swings: ChartOverlaySwing[] = [];
  if (structure.lastSwingHigh !== null) {
    const { label, description } = swingHighLabel(structure);
    swings.push({ kind: 'high', price: structure.lastSwingHigh, label, description });
  }
  if (structure.lastSwingLow !== null) {
    const { label, description } = swingLowLabel(structure);
    swings.push({ kind: 'low', price: structure.lastSwingLow, label, description });
  }
  return swings;
}

function buildEvents(structure: MarketStructure, latest: CandleFeatures): ChartOverlayEvent[] {
  const events: ChartOverlayEvent[] = [];
  const price = latest.close;
  const anchorTimestamp = latest.timestamp;

  if (structure.breakout === 'bullish') {
    events.push({
      kind: 'breakout',
      direction: 'bullish',
      label: 'Breakout ↑',
      price,
      anchorTimestamp,
      explanation: 'Latest close held above the prior swing high.',
    });
  } else if (structure.breakout === 'bearish') {
    events.push({
      kind: 'breakout',
      direction: 'bearish',
      label: 'Breakout ↓',
      price,
      anchorTimestamp,
      explanation: 'Latest close held below the prior swing low.',
    });
  } else if (structure.failedBreakout) {
    events.push({
      kind: 'failed_breakout',
      direction: 'neutral',
      label: 'Failed breakout',
      price,
      anchorTimestamp,
      explanation: 'Price pierced a prior swing level intrabar but closed back inside.',
    });
  }

  // Only surface a standalone structure break when there was no clean breakout,
  // to keep the overlay from stacking near-identical markers on one candle.
  if (structure.breakout === 'neutral' && !structure.failedBreakout && structure.structureBreak !== 'neutral') {
    events.push({
      kind: 'structure_break',
      direction: structure.structureBreak,
      label: structure.structureBreak === 'bullish' ? 'BOS ↑' : 'BOS ↓',
      price,
      anchorTimestamp,
      explanation:
        structure.structureBreak === 'bullish'
          ? 'Latest close broke the most recent prior swing high.'
          : 'Latest close broke the most recent prior swing low.',
    });
  }

  return events;
}

function buildPatterns(
  intel: CandleIntelligence,
  features: readonly CandleFeatures[],
  assetClass: ChartIntelligenceOverlayInput['assetClass'],
): ChartOverlayPattern[] {
  const nearPct = nearLevelPct(assetClass);
  const { structure } = intel;
  const out: ChartOverlayPattern[] = [];

  for (const pattern of intel.detectedPatterns) {
    const indexes = pattern.candleIndexes.filter((i) => i >= 0 && i < features.length);
    if (indexes.length === 0) continue;
    const confirmingIndex = Math.max(...indexes);
    const confirming = features[confirmingIndex];
    if (!confirming) continue;

    const candleTimestamps = indexes.map((i) => features[i]!.timestamp);
    const placement: 'above' | 'below' = pattern.direction === 'bullish' ? 'below' : 'above';
    const anchorPrice = placement === 'below' ? confirming.low : confirming.high;

    // Context: did the pattern form near a known S/R level? Levels are absolute
    // prices, so this statement holds regardless of the pattern's recency.
    let context: string | null = null;
    if (
      structure.nearestSupport &&
      Math.abs(confirming.close - structure.nearestSupport.price) / confirming.close <= nearPct
    ) {
      context = 'Formed near established support';
    } else if (
      structure.nearestResistance &&
      Math.abs(confirming.close - structure.nearestResistance.price) / confirming.close <= nearPct
    ) {
      context = 'Formed near established resistance';
    }

    const supporting: string[] = [];
    const counter: string[] = [];

    const relVol = confirming.relativeVolume;
    if (relVol !== null && relVol >= 1.2) {
      supporting.push(`Relative volume elevated (${relVol.toFixed(1)}x average)`);
    } else if (relVol !== null && relVol < 0.8) {
      counter.push('Below-average volume on the confirming candle');
    }

    if (pattern.direction !== 'neutral' && pattern.direction === structure.trend) {
      supporting.push(`Aligns with the prevailing ${regimeWord(structure.regime)}`);
    } else if (pattern.direction !== 'neutral' && structure.trend !== 'neutral' && pattern.direction !== structure.trend) {
      counter.push(`Runs against the medium-term ${regimeWord(structure.regime)}`);
    }

    if (context === 'Formed near established support' && pattern.direction === 'bullish') {
      supporting.push('Reversal candle sitting on support');
    }
    if (context === 'Formed near established resistance' && pattern.direction === 'bearish') {
      supporting.push('Reversal candle capping at resistance');
    }

    if (pattern.strength === 'weak') {
      counter.push('Weak geometric evidence');
    }

    out.push({
      key: `${pattern.pattern}-${confirming.timestamp}`,
      pattern: pattern.pattern,
      label: PATTERN_LABELS[pattern.pattern],
      glyph: PATTERN_GLYPHS[pattern.pattern],
      direction: pattern.direction,
      strength: pattern.strength,
      strengthLabel: capitalize(pattern.strength),
      confidence: pattern.confidence,
      anchorTimestamp: confirming.timestamp,
      candleTimestamps,
      anchorPrice,
      placement,
      explanation: pattern.explanation,
      context,
      supporting,
      counter,
    });
  }

  return out;
}

export interface ChartIntelligenceOverlayInput {
  symbol: string;
  assetClass: 'stock' | 'etf' | 'crypto';
  /** Full daily OHLCV history, ascending. */
  bars: { timestamp: string; open: number; high: number; low: number; close: number; volume: number | null }[];
  /** Passed-in ISO timestamp — the engine never reads ambient time. */
  generatedAt: string;
}

function unavailableOverlay(
  input: ChartIntelligenceOverlayInput,
  reason: string,
): ChartIntelligenceOverlay {
  return {
    available: false,
    hasInsufficientData: true,
    symbol: input.symbol,
    generatedAt: input.generatedAt,
    direction: 'neutral',
    headline: 'Insufficient data',
    confidence: 0,
    levels: [],
    swings: [],
    patterns: [],
    events: [],
    disclaimer: DISCLAIMER,
    unavailableReason: reason,
  };
}

export function buildChartIntelligenceOverlay(
  input: ChartIntelligenceOverlayInput,
): ChartIntelligenceOverlay {
  const intel = computeCandleIntelligence({
    symbol: input.symbol,
    assetClass: input.assetClass,
    generatedAt: input.generatedAt,
    bars: input.bars,
  });

  if (intel.hasInsufficientData) {
    return unavailableOverlay(
      input,
      intel.warnings[0] ?? 'Not enough price history for candlestick analysis.',
    );
  }

  // Recompute features via the SAME pure pipeline the engine runs internally, so
  // detected-pattern indexes resolve to bar timestamps deterministically.
  const features = deriveCandleFeatures(sanitizeBars(input.bars));
  const latest = features[features.length - 1];
  if (!latest) {
    return unavailableOverlay(input, 'No valid bars after sanitisation.');
  }

  const levels = buildLevels(intel.structure);
  const swings = buildSwings(intel.structure);
  const patterns = buildPatterns(intel, features, input.assetClass);
  const events = buildEvents(intel.structure, latest);

  const available =
    levels.length > 0 || swings.length > 0 || patterns.length > 0 || events.length > 0;

  return {
    available,
    hasInsufficientData: false,
    symbol: input.symbol,
    generatedAt: input.generatedAt,
    direction: intel.direction,
    headline: buildHeadline(intel.direction, intel.score, intel.confidence),
    confidence: intel.confidence,
    levels,
    swings,
    patterns,
    events,
    disclaimer: DISCLAIMER,
    unavailableReason: available ? null : 'No structural levels or patterns detected in this window.',
  };
}
