import { describe, expect, it } from 'vitest';
import { computeVolatilityPulse } from './volatility-pulse';
import type { OhlcvBar } from './market-pulse';

function bars(closes: number[]): OhlcvBar[] {
  return closes.map((close, i) => ({
    timestamp: `2026-01-${String(i + 1).padStart(2, '0')}`,
    open: close,
    high: close,
    low: close,
    close,
    volume: 1000,
  }));
}

/** Deterministic pseudo-random walk via a fixed multiplier sequence. */
function walk(n: number, seedReturns: number[]): number[] {
  const closes = [100];
  for (let i = 0; i < n; i += 1) {
    closes.push(closes[closes.length - 1]! * (1 + seedReturns[i % seedReturns.length]!));
  }
  return closes;
}

describe('computeVolatilityPulse', () => {
  it('returns no-data below the minimum bar count', () => {
    expect(computeVolatilityPulse(bars([100, 101, 102])).hasData).toBe(false);
    expect(computeVolatilityPulse([]).hasData).toBe(false);
  });

  it('reports (near) zero volatility for a flat series', () => {
    const pulse = computeVolatilityPulse(bars(Array(40).fill(100)));
    expect(pulse.hasData).toBe(true);
    expect(pulse.currentVolPct).toBeCloseTo(0, 6);
    expect(pulse.maxVolPct).toBeCloseTo(0, 6);
  });

  it('produces a rolling series and positive volatility for a moving series', () => {
    const pulse = computeVolatilityPulse(bars(walk(60, [0.01, -0.015, 0.02, -0.005, 0.012])));
    expect(pulse.hasData).toBe(true);
    expect(pulse.series.length).toBeGreaterThan(0);
    expect(pulse.currentVolPct).toBeGreaterThan(0);
    expect(pulse.medianVolPct).toBeGreaterThan(0);
    expect(pulse.percentile).toBeGreaterThanOrEqual(0);
    expect(pulse.percentile).toBeLessThanOrEqual(1);
  });

  it('classifies a volatility spike at the end as elevated/extreme (high percentile)', () => {
    // 40 calm bars (~0.2% moves) then 6 violent bars (~6% moves).
    const calm = walk(40, [0.002, -0.002]);
    const spikeReturns = [0.06, -0.06, 0.06, -0.06, 0.06, -0.06];
    const closes = [...calm];
    for (const r of spikeReturns) closes.push(closes[closes.length - 1]! * (1 + r));
    const pulse = computeVolatilityPulse(bars(closes));
    expect(pulse.percentile).toBeGreaterThan(0.85);
    expect(pulse.band).toBe('extreme');
    expect(pulse.currentVolPct).toBeGreaterThan(pulse.medianVolPct);
  });

  it('band reflects the current reading within its own history', () => {
    const pulse = computeVolatilityPulse(bars(walk(60, [0.01, -0.01])));
    expect(['quiet', 'normal', 'elevated', 'extreme']).toContain(pulse.band);
    expect(pulse.currentVolPct).toBeGreaterThanOrEqual(pulse.minVolPct);
    expect(pulse.currentVolPct).toBeLessThanOrEqual(pulse.maxVolPct);
  });
});
