import { describe, expect, it } from 'vitest';
import type { ReturnDistributionParams } from '@repo/api-contracts';
import { runReturnDistributionStudy } from './return-distribution';

const GENERATED_AT = '2026-01-01T00:00:00.000Z';

function params(overrides: Partial<ReturnDistributionParams> = {}): ReturnDistributionParams {
  return { scenario: 'normal', horizonDays: 1, baseVolPct: 20, annualDriftPct: 8, samples: 6000, seed: 7, ...overrides };
}

describe('runReturnDistributionStudy', () => {
  it('is deterministic: same params + seed → identical result', () => {
    const a = runReturnDistributionStudy(params(), GENERATED_AT);
    const b = runReturnDistributionStudy(params(), GENERATED_AT);
    expect(b).toEqual(a);
  });

  it('changes with a different seed', () => {
    const a = runReturnDistributionStudy(params({ seed: 1 }), GENERATED_AT);
    const b = runReturnDistributionStudy(params({ seed: 2 }), GENERATED_AT);
    expect(b.stats.mean).not.toEqual(a.stats.mean);
  });

  it('a normal scenario is near-normal: low excess kurtosis and empirical≈gaussian VaR', () => {
    const r = runReturnDistributionStudy(params({ scenario: 'normal' }), GENERATED_AT);
    expect(Math.abs(r.stats.excessKurtosis)).toBeLessThan(0.6);
    expect(Math.abs(r.stats.skewness)).toBeLessThan(0.3);
    const v99 = r.varEstimates.find((v) => v.confidence === 0.99)!;
    // Empirical and Gaussian tail should agree within ~15% for a normal process.
    expect(Math.abs(v99.varUnderstatement!)).toBeLessThan(0.15);
  });

  it('a fat-tailed scenario has high excess kurtosis and normal understates the deep tail', () => {
    const r = runReturnDistributionStudy(params({ scenario: 'fat_tailed' }), GENERATED_AT);
    expect(r.stats.excessKurtosis).toBeGreaterThan(2);
    const v99 = r.varEstimates.find((v) => v.confidence === 0.99)!;
    expect(v99.empiricalVar).toBeGreaterThan(v99.gaussianVar);
    expect(v99.varUnderstatement!).toBeGreaterThan(0.1);
  });

  it('a crash-skew scenario is left-skewed with a heavy downside tail', () => {
    const r = runReturnDistributionStudy(params({ scenario: 'crash_skew' }), GENERATED_AT);
    expect(r.stats.skewness).toBeLessThan(-0.5);
    const v99 = r.varEstimates.find((v) => v.confidence === 0.99)!;
    // CVaR (expected shortfall) must be at least as severe as VaR.
    expect(v99.empiricalCVar).toBeGreaterThanOrEqual(v99.empiricalVar);
    expect(v99.empiricalVar).toBeGreaterThan(v99.gaussianVar);
  });

  it('a volatile scenario has wider dispersion than a calm one', () => {
    const calm = runReturnDistributionStudy(params({ scenario: 'calm' }), GENERATED_AT);
    const volatile = runReturnDistributionStudy(params({ scenario: 'volatile' }), GENERATED_AT);
    expect(volatile.stats.stdev).toBeGreaterThan(calm.stats.stdev);
  });

  it('CVaR ≥ VaR and confidences are ascending for every scenario', () => {
    for (const scenario of ['normal', 'calm', 'volatile', 'fat_tailed', 'crash_skew'] as const) {
      const r = runReturnDistributionStudy(params({ scenario }), GENERATED_AT);
      expect(r.varEstimates.map((v) => v.confidence)).toEqual([0.95, 0.99]);
      for (const v of r.varEstimates) {
        expect(v.empiricalCVar).toBeGreaterThanOrEqual(v.empiricalVar - 1e-9);
        expect(v.empiricalVar).toBeGreaterThanOrEqual(0);
        expect(v.gaussianVar).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('histogram counts sum to the sample size and density sums to 1', () => {
    const r = runReturnDistributionStudy(params({ samples: 4000 }), GENERATED_AT);
    const totalCount = r.histogram.reduce((s, b) => s + b.count, 0);
    expect(totalCount).toBe(4000);
    const totalDensity = r.histogram.reduce((s, b) => s + b.density, 0);
    expect(totalDensity).toBeCloseTo(1, 6);
  });

  it('aggregates over the holding horizon (longer horizon → wider dispersion)', () => {
    const oneDay = runReturnDistributionStudy(params({ horizonDays: 1 }), GENERATED_AT);
    const tenDay = runReturnDistributionStudy(params({ horizonDays: 10 }), GENERATED_AT);
    expect(tenDay.stats.stdev).toBeGreaterThan(oneDay.stats.stdev);
  });
});
