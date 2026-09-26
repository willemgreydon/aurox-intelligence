import { describe, expect, it } from 'vitest';
import { computeDrawdownAnalytics, type EquityPoint } from './portfolio-drawdown';

function pts(values: number[]): EquityPoint[] {
  return values.map((v, i) => ({ date: `2026-01-${String(i + 1).padStart(2, '0')}`, accountValue: v }));
}

describe('computeDrawdownAnalytics', () => {
  it('returns no-data for < 2 points', () => {
    expect(computeDrawdownAnalytics(pts([100])).hasData).toBe(false);
    expect(computeDrawdownAnalytics([]).hasData).toBe(false);
  });

  it('is flat at zero for a monotonically rising series', () => {
    const dd = computeDrawdownAnalytics(pts([100, 110, 120, 130]));
    expect(dd.hasData).toBe(true);
    expect(dd.maxDrawdownPct).toBe(0);
    expect(dd.currentDrawdownPct).toBe(0);
    expect(dd.atPeak).toBe(true);
    expect(dd.series.every((p) => p.drawdownPct === 0)).toBe(true);
  });

  it('computes a single drawdown and its trough', () => {
    // peak 100 → 80 is -20%, then partial recovery to 90 (-10%).
    const dd = computeDrawdownAnalytics(pts([100, 80, 90]));
    expect(dd.maxDrawdownPct).toBeCloseTo(-20, 6);
    expect(dd.currentDrawdownPct).toBeCloseTo(-10, 6);
    expect(dd.troughDate).toBe('2026-01-02');
    expect(dd.peakDate).toBe('2026-01-01');
    expect(dd.atPeak).toBe(false);
  });

  it('recovers to zero when a prior peak is reclaimed', () => {
    const dd = computeDrawdownAnalytics(pts([100, 70, 120]));
    expect(dd.maxDrawdownPct).toBeCloseTo(-30, 6);
    expect(dd.currentDrawdownPct).toBe(0);
    expect(dd.atPeak).toBe(true);
    expect(dd.series.at(-1)!.isPeak).toBe(true);
  });

  it('tracks the deeper of two separate drawdowns', () => {
    // -10% then recover, then -25% (deeper).
    const dd = computeDrawdownAnalytics(pts([100, 90, 100, 75, 80]));
    expect(dd.maxDrawdownPct).toBeCloseTo(-25, 6);
    expect(dd.troughDate).toBe('2026-01-04');
  });

  it('ignores non-finite equity values', () => {
    const dd = computeDrawdownAnalytics([
      { date: 'a', accountValue: 100 },
      { date: 'b', accountValue: Number.NaN },
      { date: 'c', accountValue: 80 },
    ]);
    expect(dd.hasData).toBe(true);
    expect(dd.maxDrawdownPct).toBeCloseTo(-20, 6);
  });
});
