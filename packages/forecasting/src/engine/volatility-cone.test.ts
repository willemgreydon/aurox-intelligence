import { describe, expect, it } from 'vitest';
import type { VolatilityConeParams } from '@repo/api-contracts';
import { runVolatilityConeStudy } from './volatility-cone';

const GENERATED_AT = '2026-01-01T00:00:00.000Z';

function params(overrides: Partial<VolatilityConeParams> = {}): VolatilityConeParams {
  return { scenario: 'steady', years: 3, baseVolPct: 20, seed: 7, ...overrides };
}

describe('runVolatilityConeStudy', () => {
  it('is deterministic: same params + seed → identical result', () => {
    const a = runVolatilityConeStudy(params(), GENERATED_AT);
    const b = runVolatilityConeStudy(params(), GENERATED_AT);
    expect(b).toEqual(a);
  });

  it('changes with a different seed', () => {
    const a = runVolatilityConeStudy(params({ seed: 1 }), GENERATED_AT);
    const b = runVolatilityConeStudy(params({ seed: 2 }), GENERATED_AT);
    expect(b.currentShortVol).not.toEqual(a.currentShortVol);
  });

  it('recovers the base volatility on a steady regime (annualization is correct)', () => {
    const r = runVolatilityConeStudy(params({ scenario: 'steady', baseVolPct: 20 }), GENERATED_AT);
    const longBand = r.bands[r.bands.length - 1]!;
    // The longest-window median realized vol should track the 20% base input.
    expect(longBand.median).toBeCloseTo(0.2, 1);
  });

  it('a calm regime has materially lower vol than a steady one', () => {
    const calm = runVolatilityConeStudy(params({ scenario: 'calm' }), GENERATED_AT);
    const steady = runVolatilityConeStudy(params({ scenario: 'steady' }), GENERATED_AT);
    expect(calm.bands[0]!.median).toBeLessThan(steady.bands[0]!.median);
  });

  it('a shock regime pushes the latest short-window vol to an elevated percentile', () => {
    const r = runVolatilityConeStudy(params({ scenario: 'shock' }), GENERATED_AT);
    expect(r.bands[0]!.currentPercentile).not.toBeNull();
    expect(r.bands[0]!.currentPercentile!).toBeGreaterThanOrEqual(0.8);
    expect(r.currentShortVol!).toBeGreaterThan(r.bands[0]!.median);
  });

  it('produces ordered percentiles and in-bounds values for every band', () => {
    for (const scenario of ['calm', 'steady', 'clustered', 'shock', 'trending'] as const) {
      const r = runVolatilityConeStudy(params({ scenario }), GENERATED_AT);
      expect(r.bands.length).toBeGreaterThan(0);
      for (const b of r.bands) {
        expect(b.min).toBeLessThanOrEqual(b.p10);
        expect(b.p10).toBeLessThanOrEqual(b.p25);
        expect(b.p25).toBeLessThanOrEqual(b.median);
        expect(b.median).toBeLessThanOrEqual(b.p75);
        expect(b.p75).toBeLessThanOrEqual(b.p90);
        expect(b.p90).toBeLessThanOrEqual(b.max);
        expect(b.min).toBeGreaterThanOrEqual(0);
        expect(b.sampleSize).toBeGreaterThanOrEqual(12);
        if (b.currentPercentile != null) {
          expect(b.currentPercentile).toBeGreaterThanOrEqual(0);
          expect(b.currentPercentile).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('drops windows without enough history on a short sample', () => {
    const short = runVolatilityConeStudy(params({ years: 1 }), GENERATED_AT);
    const long = runVolatilityConeStudy(params({ years: 3 }), GENERATED_AT);
    // 1Y window needs > 252 daily returns, which a 1-year sample cannot supply.
    expect(short.bands.length).toBeLessThan(long.bands.length);
    expect(short.bands.some((b) => b.window === 252)).toBe(false);
  });

  it('downsamples the context path to a bounded length', () => {
    const r = runVolatilityConeStudy(params({ years: 5 }), GENERATED_AT);
    expect(r.path.length).toBeLessThanOrEqual(180);
    expect(r.path.length).toBeGreaterThan(1);
  });
});
