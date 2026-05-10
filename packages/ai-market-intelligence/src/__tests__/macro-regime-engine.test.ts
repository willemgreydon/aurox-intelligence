import { describe, expect, it } from 'vitest';
import { computeMacroRegimeModel } from '../macro/regime-engine';

describe('computeMacroRegimeModel', () => {
  it('produces deterministic bounded scores', () => {
    const model = computeMacroRegimeModel([
      {
        provider: 'fred',
        seriesId: 'FEDFUNDS',
        title: 'Policy rate',
        frequency: 'monthly',
        points: [{ provider: 'fred', seriesId: 'FEDFUNDS', normalizedSeriesId: 'policy_rate', title: 'Policy', value: 5, frequency: 'monthly', period: '2026-03-01', observedAt: '2026-03-01T00:00:00.000Z' }],
        lastUpdated: '2026-03-01T00:00:00.000Z',
        freshnessState: 'partial',
      },
    ]);
    expect(model.overallMacroScore).toBeGreaterThanOrEqual(-1);
    expect(model.overallMacroScore).toBeLessThanOrEqual(1);
    expect(model.confidence).toBeGreaterThanOrEqual(0);
    expect(model.confidence).toBeLessThanOrEqual(1);
  });
});
