import { describe, expect, it } from 'vitest';
import type { MonteCarloParams } from '@repo/api-contracts';
import { runMonteCarloSimulation } from './monte-carlo';

const GENERATED_AT = '2026-01-01T00:00:00.000Z';

function params(overrides: Partial<MonteCarloParams> = {}): MonteCarloParams {
  return {
    startingCapital: 10_000,
    annualReturnPct: 7,
    annualVolatilityPct: 15,
    years: 10,
    monthlyContribution: 0,
    paths: 500,
    seed: 42,
    targetValue: null,
    ...overrides,
  };
}

describe('runMonteCarloSimulation', () => {
  it('is deterministic: same params + seed → identical result', () => {
    const a = runMonteCarloSimulation(params(), GENERATED_AT);
    const b = runMonteCarloSimulation(params(), GENERATED_AT);
    expect(b).toEqual(a);
  });

  it('changes with a different seed', () => {
    const a = runMonteCarloSimulation(params({ seed: 1 }), GENERATED_AT);
    const b = runMonteCarloSimulation(params({ seed: 2 }), GENERATED_AT);
    expect(b.endValues.p50).not.toEqual(a.endValues.p50);
  });

  it('with zero volatility collapses to the closed-form deterministic growth', () => {
    // sigma = 0 → every path identical → bands collapse (p5 == p50 == p95).
    const r = runMonteCarloSimulation(
      params({ annualVolatilityPct: 0, monthlyContribution: 0, years: 1, annualReturnPct: 10 }),
      GENERATED_AT,
    );
    const expected = 10_000 * Math.exp(0.1); // ≈ 11051.71
    expect(r.endValues.p50).toBeCloseTo(expected, 2);
    expect(r.endValues.p5).toBeCloseTo(r.endValues.p95, 6);
  });

  it('produces steps+1 bands starting at the initial capital', () => {
    const r = runMonteCarloSimulation(params({ years: 5 }), GENERATED_AT);
    expect(r.steps).toBe(60);
    expect(r.bands).toHaveLength(61);
    expect(r.bands[0]!.p50).toBeCloseTo(10_000, 6);
  });

  it('orders percentile bands p5 ≤ p25 ≤ p50 ≤ p75 ≤ p95', () => {
    const r = runMonteCarloSimulation(params(), GENERATED_AT);
    for (const band of r.bands) {
      expect(band.p5).toBeLessThanOrEqual(band.p25 + 1e-6);
      expect(band.p25).toBeLessThanOrEqual(band.p50 + 1e-6);
      expect(band.p50).toBeLessThanOrEqual(band.p75 + 1e-6);
      expect(band.p75).toBeLessThanOrEqual(band.p95 + 1e-6);
    }
  });

  it('computes probability of reaching a target in [0, 1]', () => {
    const r = runMonteCarloSimulation(params({ targetValue: 20_000 }), GENERATED_AT);
    expect(r.probabilityOfTarget).not.toBeNull();
    expect(r.probabilityOfTarget!).toBeGreaterThanOrEqual(0);
    expect(r.probabilityOfTarget!).toBeLessThanOrEqual(1);
  });

  it('accounts for monthly contributions in total contributed', () => {
    const r = runMonteCarloSimulation(
      params({ startingCapital: 1_000, monthlyContribution: 100, years: 2 }),
      GENERATED_AT,
    );
    expect(r.totalContributed).toBe(1_000 + 100 * 24);
  });
});
