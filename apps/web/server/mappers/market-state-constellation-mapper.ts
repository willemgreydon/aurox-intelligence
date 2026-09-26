import { clamp, normalizeUnit } from '../../lib/charts/chart-geometry';
import { getAssetInspectHref } from '../../lib/market-routes';
import type {
  ConstellationPoint,
  ConstellationSignalDirection,
  MarketStateConstellationResult,
} from '../services/market-state-constellation-service';

/**
 * PURE mapper: turns the constellation service result into a display-ready view
 * model. All financial normalization (domain → [0,1] plot space) happens here,
 * so the component only scales [0,1] to its own pixel viewBox. No I/O.
 *
 * Axes:
 *   x — momentum %, symmetric around 0 (zero return sits dead-centre; positive
 *       momentum right, negative left).
 *   y — realized volatility %, padded [min,max]; the median is the horizontal
 *       reference line. (Volatility has no meaningful universal zero, so the
 *       median is the reference rather than 0.)
 */

export type ConstellationNodeViewModel = {
  assetId: string;
  symbol: string;
  name: string;
  assetClass: 'stock' | 'etf' | 'crypto';
  /** 0..1 across the momentum axis (0.5 = zero momentum). */
  nx: number;
  /** 0..1 across the volatility axis (0 = lowest risk, 1 = highest risk). */
  ny: number;
  /** 0..1 confidence-driven node size. */
  sizeScale: number;
  direction: ConstellationSignalDirection;
  toneClass: string;
  momentumLabel: string;
  volatilityLabel: string;
  confidenceLabel: string;
  directionLabel: string;
  quadrantLabel: string;
  /** One-line accessible / tooltip description. */
  ariaLabel: string;
  href: string;
};

export type MarketStateConstellationViewModel = {
  available: boolean;
  emptyReason: string | null;
  nodes: ConstellationNodeViewModel[];
  /** 0..1 x of the zero-momentum vertical reference line. */
  zeroMomentumX: number;
  /** 0..1 y of the median-volatility horizontal reference line. */
  medianVolatilityY: number;
  quadrants: {
    topRight: string;
    topLeft: string;
    bottomRight: string;
    bottomLeft: string;
  };
  asOfLabel: string;
  pointCountLabel: string;
  summary: string;
};

function directionLabel(direction: ConstellationSignalDirection): string {
  return direction === 'bullish' ? 'Bullish' : direction === 'bearish' ? 'Bearish' : 'Neutral';
}

function signedPct(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function quadrantFor(momentumPct: number, volatilityPct: number, medianVol: number): string {
  const advancing = momentumPct >= 0 ? 'Advancing' : 'Declining';
  const risk = volatilityPct >= medianVol ? 'Volatile' : 'Calm';
  return `${advancing} · ${risk}`;
}

function nodeFor(
  point: ConstellationPoint,
  momentumMaxAbs: number,
  volMin: number,
  volMax: number,
  medianVol: number,
): ConstellationNodeViewModel {
  // Symmetric momentum domain → zero maps to exactly 0.5.
  const nx = momentumMaxAbs > 0 ? clamp(0.5 + point.momentumPct / (2 * momentumMaxAbs), 0, 1) : 0.5;
  const ny = normalizeUnit(point.volatilityPct, volMin, volMax);
  const sizeScale = clamp(point.confidence, 0, 1);

  return {
    assetId: point.assetId,
    symbol: point.symbol,
    name: point.name,
    assetClass: point.assetClass,
    nx,
    ny,
    sizeScale,
    direction: point.direction,
    toneClass: `constellation-node--${point.direction}`,
    momentumLabel: signedPct(point.momentumPct),
    volatilityLabel: `${point.volatilityPct.toFixed(1)}%`,
    confidenceLabel: `${Math.round(point.confidence * 100)}%`,
    directionLabel: directionLabel(point.direction),
    quadrantLabel: quadrantFor(point.momentumPct, point.volatilityPct, medianVol),
    ariaLabel: `${point.symbol} — ${directionLabel(point.direction)} signal, momentum ${signedPct(point.momentumPct)}, volatility ${point.volatilityPct.toFixed(1)}%, confidence ${Math.round(point.confidence * 100)}%`,
    href: getAssetInspectHref({ symbol: point.symbol, assetClass: point.assetClass }),
  };
}

function formatAsOf(iso: string): string {
  // Deterministic UTC short label (SSR-safe; no locale-dependent formatting).
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'unknown';
  return `${date.toUTCString().slice(5, 22)} UTC`;
}

export function mapMarketStateConstellation(
  result: MarketStateConstellationResult,
): MarketStateConstellationViewModel {
  const quadrants = {
    topRight: 'Advancing · Volatile',
    topLeft: 'Declining · Volatile',
    bottomRight: 'Advancing · Calm',
    bottomLeft: 'Declining · Calm',
  };

  if (result.points.length === 0) {
    return {
      available: false,
      emptyReason:
        result.meta.universeCount === 0
          ? 'No tradable universe available.'
          : 'Insufficient price history to plot the market state yet.',
      nodes: [],
      zeroMomentumX: 0.5,
      medianVolatilityY: 0.5,
      quadrants,
      asOfLabel: formatAsOf(result.meta.asOf),
      pointCountLabel: '0 assets',
      summary: 'Market state constellation is unavailable — not enough historical data.',
    };
  }

  const momentumMaxAbs = Math.max(
    Math.abs(result.meta.momentumRange.min),
    Math.abs(result.meta.momentumRange.max),
    1e-6,
  );
  // Pad the volatility domain slightly so points don't sit on the frame edge.
  const volSpan = Math.max(1e-6, result.meta.volatilityRange.max - result.meta.volatilityRange.min);
  const volMin = result.meta.volatilityRange.min - volSpan * 0.08;
  const volMax = result.meta.volatilityRange.max + volSpan * 0.08;

  const nodes = result.points.map((point) =>
    nodeFor(point, momentumMaxAbs, volMin, volMax, result.meta.medianVolatilityPct),
  );

  const bullish = nodes.filter((node) => node.direction === 'bullish').length;
  const bearish = nodes.filter((node) => node.direction === 'bearish').length;
  const neutral = nodes.length - bullish - bearish;

  return {
    available: true,
    emptyReason: null,
    nodes,
    zeroMomentumX: 0.5,
    medianVolatilityY: normalizeUnit(result.meta.medianVolatilityPct, volMin, volMax),
    quadrants,
    asOfLabel: formatAsOf(result.meta.asOf),
    pointCountLabel: `${nodes.length} assets`,
    summary: `${nodes.length} tradable assets mapped by momentum and volatility: ${bullish} bullish, ${bearish} bearish, ${neutral} neutral. Horizontal line marks median volatility; vertical line marks zero momentum.`,
  };
}
