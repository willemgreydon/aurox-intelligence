export {};
import type { MacroFrequency, MacroSeries, MacroSeriesPoint } from '@repo/api-contracts';
import { fredResponseSchema, worldBankPointSchema } from './schemas';
import type { MacroSeriesConfig } from './types';

function normalizeFrequency(value: string | undefined, fallback: MacroFrequency = 'unknown'): MacroFrequency {
  const normalized = (value ?? '').trim().toLowerCase();
  if (normalized === 'd' || normalized === 'daily') return 'daily';
  if (normalized === 'w' || normalized === 'weekly') return 'weekly';
  if (normalized === 'm' || normalized === 'monthly') return 'monthly';
  if (normalized === 'q' || normalized === 'quarterly') return 'quarterly';
  if (normalized === 'a' || normalized === 'annual' || normalized === 'yearly') return 'annual';
  return fallback;
}

function inferObservedAt(period: string, frequency: MacroFrequency): string {
  if (/^\d{4}$/.test(period)) return `${period}-12-31T00:00:00.000Z`;
  if (/^\d{4}-\d{2}$/.test(period)) return `${period}-01T00:00:00.000Z`;
  if (/^\d{4}-Q[1-4]$/.test(period)) {
    const [year, quarter] = period.split('-Q');
    const month = Number(quarter) * 3;
    return `${year}-${String(month).padStart(2, '0')}-01T00:00:00.000Z`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(period)) return `${period}T00:00:00.000Z`;
  return frequency === 'unknown' ? new Date().toISOString() : `${period}T00:00:00.000Z`;
}

export function mapWorldBankResponseToSeries(
  payload: unknown,
  config: MacroSeriesConfig,
): MacroSeries {
  const rows = Array.isArray(payload) && Array.isArray(payload[1]) ? payload[1] : [];
  const points: MacroSeriesPoint[] = rows
    .map((row) => worldBankPointSchema.safeParse(row))
    .filter((row): row is { success: true; data: { date: string; value: number | null; indicator?: { id?: string; value?: string }; country?: { id?: string; value?: string } } } => row.success)
    .map((row) => row.data)
    .filter((row) => typeof row.value === 'number' && Number.isFinite(row.value))
    .map((row) => ({
      provider: 'world-bank',
      seriesId: config.seriesId,
      normalizedSeriesId: config.normalizedSeriesId,
      countryCode: config.countryCode ?? row.country?.id,
      region: row.country?.value,
      title: config.title,
      value: row.value as number,
      unit: config.unit,
      frequency: config.frequency ?? 'annual',
      period: row.date,
      observedAt: inferObservedAt(row.date, config.frequency ?? 'annual'),
      sourceUrl: config.sourceUrl,
      raw: row,
    }));

  return {
    provider: 'world-bank',
    seriesId: config.seriesId,
    title: config.title,
    unit: config.unit,
    frequency: config.frequency ?? 'annual',
    geography: config.geography,
    points: points.sort((a, b) => a.period.localeCompare(b.period)),
    lastUpdated: new Date().toISOString(),
    freshnessState: points.length > 0 ? 'partial' : 'unavailable',
  };
}

export function mapFredResponseToSeries(payload: unknown, config: MacroSeriesConfig): MacroSeries {
  const parsed = fredResponseSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      provider: 'fred',
      seriesId: config.seriesId,
      title: config.title,
      unit: config.unit,
      frequency: config.frequency ?? 'monthly',
      geography: config.geography,
      points: [],
      lastUpdated: new Date().toISOString(),
      freshnessState: 'unavailable',
    };
  }

  const points: MacroSeriesPoint[] = parsed.data.observations
    .flatMap((row) => {
      const parsedValue = Number(row.value);
      if (!Number.isFinite(parsedValue)) return [];
      return [{
        provider: 'fred' as const,
        seriesId: config.seriesId,
        normalizedSeriesId: config.normalizedSeriesId,
        title: config.title,
        value: parsedValue,
        unit: config.unit,
        frequency: config.frequency ?? 'monthly',
        period: row.date,
        observedAt: inferObservedAt(row.date, config.frequency ?? 'monthly'),
        revisedAt: row.realtime_end ? `${row.realtime_end}T00:00:00.000Z` : undefined,
        publishedAt: row.realtime_start ? `${row.realtime_start}T00:00:00.000Z` : undefined,
        sourceUrl: config.sourceUrl,
        raw: row,
      }];
    })
    ;

  return {
    provider: 'fred',
    seriesId: config.seriesId,
    title: config.title,
    unit: config.unit,
    frequency: config.frequency ?? 'monthly',
    geography: config.geography,
    points: points.sort((a, b) => a.period.localeCompare(b.period)),
    lastUpdated: new Date().toISOString(),
    freshnessState: points.length > 0 ? 'delayed' : 'unavailable',
  };
}

export function mapEcbSdmxToSeries(payload: unknown, config: MacroSeriesConfig): MacroSeries {
  const rawRows = Array.isArray(payload) ? payload : [];
  const frequency = config.frequency ?? normalizeFrequency(config.seriesId.split('.')[0], 'monthly');
  const points: MacroSeriesPoint[] = rawRows
    .flatMap((row) => {
      if (!row || typeof row !== 'object') return [];
      const period = typeof (row as { period?: unknown }).period === 'string' ? (row as { period: string }).period : null;
      const value = Number((row as { value?: unknown }).value);
      if (!period || !Number.isFinite(value)) return [];
      return [{
        provider: 'ecb' as const,
        seriesId: config.seriesId,
        normalizedSeriesId: config.normalizedSeriesId,
        title: config.title,
        value,
        unit: config.unit,
        frequency,
        period,
        observedAt: inferObservedAt(period, frequency),
        sourceUrl: config.sourceUrl,
        raw: row,
      }];
    })
    ;

  return {
    provider: 'ecb',
    seriesId: config.seriesId,
    title: config.title,
    unit: config.unit,
    frequency,
    geography: config.geography,
    points: points.sort((a, b) => a.period.localeCompare(b.period)),
    lastUpdated: new Date().toISOString(),
    freshnessState: points.length > 0 ? 'partial' : 'unavailable',
  };
}
