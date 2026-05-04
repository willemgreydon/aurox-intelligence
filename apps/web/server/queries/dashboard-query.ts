import { getDashboardReadModel, type DashboardOperationalReadModel } from '@repo/db';
import { withDbReadFallback } from '../lib/db-runtime';

export async function getDashboardSnapshot(): Promise<DashboardOperationalReadModel> {
  const dev = process.env.NODE_ENV === 'development';
  const t0 = dev ? performance.now() : 0;
  const fallback: DashboardOperationalReadModel = {
    dataSource: { configured: false, mode: 'stub' },
    assetCount: 0,
    latestObservationAt: null,
    latestForecastAt: null,
    latestIngestionCompletedAt: null,
    latestSuccessfulSyncAt: null,
    forecasts: [],
    ingestionRuns: [],
    providerSyncs: [],
  };
  const result = (await withDbReadFallback('dashboard-query:getDashboardReadModel', fallback, () => getDashboardReadModel())).value;
  if (dev) {
    console.debug(`[dashboard-query] read-model: ${(performance.now() - t0).toFixed(0)}ms`);
  }
  return result;
}
