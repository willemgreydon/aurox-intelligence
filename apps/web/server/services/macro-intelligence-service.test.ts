import { describe, expect, it, vi } from 'vitest';
import { assertSerializableProps } from '../../lib/assert-serializable-props';

const fetchMacroSnapshotMock = vi.fn();

vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

vi.mock('@repo/providers', () => ({
  fetchMacroSnapshot: (...args: unknown[]) => fetchMacroSnapshotMock(...args),
}));

describe('macro intelligence service', () => {
  it('returns serializable simulation-safe macro context', async () => {
    fetchMacroSnapshotMock.mockResolvedValue({
      series: [
        {
          provider: 'fred',
          seriesId: 'FEDFUNDS',
          title: 'Policy rate',
          frequency: 'monthly',
          points: [{ provider: 'fred', seriesId: 'FEDFUNDS', normalizedSeriesId: 'policy_rate', title: 'Policy rate', value: 4.25, frequency: 'monthly', period: '2026-03-01', observedAt: '2026-03-01T00:00:00.000Z' }],
          lastUpdated: '2026-03-01T00:00:00.000Z',
          freshnessState: 'partial',
        },
      ],
      points: [],
      providerStatus: [],
      generatedAt: '2026-03-01T00:00:00.000Z',
    });
    const mod = await import('./macro-intelligence-service');
    const result = await mod.getMacroIntelligenceViewModel();
    expect(result.simulationOnlyLabel).toContain('Simulation context only');
    assertSerializableProps('macro.service.result', result);
  });
});
