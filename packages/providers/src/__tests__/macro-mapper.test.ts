import { describe, expect, it } from 'vitest';
import { mapEcbSdmxToSeries, mapFredResponseToSeries, mapWorldBankResponseToSeries } from '../macro/mapper';

describe('macro mappers', () => {
  it('maps world bank response', () => {
    const series = mapWorldBankResponseToSeries(
      [{ page: 1 }, [{ date: '2024', value: 2.4, country: { id: 'US', value: 'United States' } }]],
      { provider: 'world-bank', seriesId: 'FP.CPI.TOTL.ZG', normalizedSeriesId: 'inflation_cpi', title: 'Inflation', frequency: 'annual' },
    );
    expect(series.points.length).toBe(1);
    expect(series.points[0]?.value).toBe(2.4);
  });

  it('maps ecb simplified fixture', () => {
    const series = mapEcbSdmxToSeries(
      [{ period: '2026-03', value: 2.2 }],
      { provider: 'ecb', seriesId: 'ICP.M.U2.N.000000.4.ANR', normalizedSeriesId: 'ea_hicp', title: 'HICP', frequency: 'monthly' },
    );
    expect(series.points[0]?.period).toBe('2026-03');
  });

  it('maps fred observations', () => {
    const series = mapFredResponseToSeries(
      { observations: [{ date: '2026-03-01', value: '4.25', realtime_start: '2026-03-01', realtime_end: '2026-03-02' }] },
      { provider: 'fred', seriesId: 'FEDFUNDS', normalizedSeriesId: 'policy_rate', title: 'Policy rate', frequency: 'monthly' },
    );
    expect(series.points[0]?.value).toBe(4.25);
  });
});
