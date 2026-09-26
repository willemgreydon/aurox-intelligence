import { describe, expect, it } from 'vitest';
import { mapMarketStateConstellation } from './market-state-constellation-mapper';
import type {
  ConstellationPoint,
  MarketStateConstellationResult,
} from '../services/market-state-constellation-service';

const AS_OF = '2026-01-15T12:00:00.000Z';

function point(overrides: Partial<ConstellationPoint>): ConstellationPoint {
  return {
    assetId: 'stock-aapl',
    symbol: 'AAPL',
    name: 'Apple',
    assetClass: 'stock',
    momentumPct: 5,
    volatilityPct: 20,
    compositeScore: 0.4,
    confidence: 0.7,
    direction: 'bullish',
    latestPrice: 200,
    barsAnalyzed: 90,
    ...overrides,
  };
}

function result(points: ConstellationPoint[]): MarketStateConstellationResult {
  const momenta = points.map((p) => p.momentumPct);
  const vols = points.map((p) => p.volatilityPct);
  const sortedVols = [...vols].sort((a, b) => a - b);
  const mid = Math.floor(sortedVols.length / 2);
  const medianVolatilityPct = sortedVols.length === 0 ? 0 : sortedVols.length % 2 === 0 ? (sortedVols[mid - 1]! + sortedVols[mid]!) / 2 : sortedVols[mid]!;
  return {
    points,
    meta: {
      asOf: AS_OF,
      pointCount: points.length,
      universeCount: points.length,
      momentumRange: { min: Math.min(...momenta, 0), max: Math.max(...momenta, 0) },
      volatilityRange: { min: Math.min(...vols, 0), max: Math.max(...vols, 0) },
      medianVolatilityPct,
    },
  };
}

describe('mapMarketStateConstellation', () => {
  it('returns an unavailable model with a reason when there are no points', () => {
    const vm = mapMarketStateConstellation({
      points: [],
      meta: {
        asOf: AS_OF,
        pointCount: 0,
        universeCount: 0,
        momentumRange: { min: 0, max: 0 },
        volatilityRange: { min: 0, max: 0 },
        medianVolatilityPct: 0,
      },
    });
    expect(vm.available).toBe(false);
    expect(vm.emptyReason).toMatch(/no tradable universe/i);
    expect(vm.nodes).toHaveLength(0);
  });

  it('distinguishes insufficient-history from empty-universe', () => {
    const vm = mapMarketStateConstellation({
      points: [],
      meta: {
        asOf: AS_OF,
        pointCount: 0,
        universeCount: 12,
        momentumRange: { min: 0, max: 0 },
        volatilityRange: { min: 0, max: 0 },
        medianVolatilityPct: 0,
      },
    });
    expect(vm.available).toBe(false);
    expect(vm.emptyReason).toMatch(/insufficient price history/i);
  });

  it('maps zero momentum to the centre (nx = 0.5) with a symmetric domain', () => {
    const vm = mapMarketStateConstellation(
      result([
        point({ symbol: 'UP', momentumPct: 10 }),
        point({ symbol: 'FLAT', momentumPct: 0 }),
        point({ symbol: 'DOWN', momentumPct: -10 }),
      ]),
    );
    expect(vm.available).toBe(true);
    const flat = vm.nodes.find((n) => n.symbol === 'FLAT')!;
    const up = vm.nodes.find((n) => n.symbol === 'UP')!;
    const down = vm.nodes.find((n) => n.symbol === 'DOWN')!;
    expect(flat.nx).toBeCloseTo(0.5, 6);
    expect(up.nx).toBeCloseTo(1, 6);
    expect(down.nx).toBeCloseTo(0, 6);
    expect(vm.zeroMomentumX).toBe(0.5);
  });

  it('places higher volatility higher on the axis (ny larger)', () => {
    const vm = mapMarketStateConstellation(
      result([
        point({ symbol: 'LOWVOL', volatilityPct: 10 }),
        point({ symbol: 'HIVOL', volatilityPct: 40 }),
      ]),
    );
    const low = vm.nodes.find((n) => n.symbol === 'LOWVOL')!;
    const high = vm.nodes.find((n) => n.symbol === 'HIVOL')!;
    expect(high.ny).toBeGreaterThan(low.ny);
  });

  it('formats labels, tone class, and confidence-driven size', () => {
    const vm = mapMarketStateConstellation(
      result([
        point({ symbol: 'AAPL', momentumPct: 8.37, volatilityPct: 22.44, confidence: 0.74, direction: 'bullish' }),
        point({ symbol: 'XYZ', momentumPct: -3.1, volatilityPct: 15, confidence: 0.3, direction: 'bearish' }),
      ]),
    );
    const a = vm.nodes.find((n) => n.symbol === 'AAPL')!;
    expect(a.momentumLabel).toBe('+8.4%');
    expect(a.volatilityLabel).toBe('22.4%');
    expect(a.confidenceLabel).toBe('74%');
    expect(a.directionLabel).toBe('Bullish');
    expect(a.toneClass).toBe('constellation-node--bullish');
    expect(a.sizeScale).toBeCloseTo(0.74, 6);
    expect(a.href).toContain('AAPL');

    const x = vm.nodes.find((n) => n.symbol === 'XYZ')!;
    expect(x.momentumLabel).toBe('-3.1%');
    expect(x.toneClass).toBe('constellation-node--bearish');
  });

  it('summarizes direction counts', () => {
    const vm = mapMarketStateConstellation(
      result([
        point({ symbol: 'A', direction: 'bullish' }),
        point({ symbol: 'B', direction: 'bearish' }),
        point({ symbol: 'C', direction: 'neutral' }),
        point({ symbol: 'D', direction: 'bullish' }),
      ]),
    );
    expect(vm.pointCountLabel).toBe('4 assets');
    expect(vm.summary).toMatch(/2 bullish, 1 bearish, 1 neutral/);
  });
});
