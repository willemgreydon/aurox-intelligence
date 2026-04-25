import { mapDashboardMarketAnalytics, type DashboardMarketAnalyticsViewModel } from '../mappers/dashboard-market-mapper';
import { perfLog, perfNow } from '../lib/perf';
import { getDashboardMarketReadModel } from '../queries/dashboard-market-query';

export async function getDashboardMarketAnalyticsData(): Promise<DashboardMarketAnalyticsViewModel> {
  const t0 = perfNow();
  const readModel = await getDashboardMarketReadModel();
  perfLog('dashboard-market-service:query', t0);
  const tMapper = perfNow();
  const mapped = mapDashboardMarketAnalytics(readModel);
  perfLog('dashboard-market-service:mapper', tMapper);
  perfLog('dashboard-market-service:total', t0);
  return mapped;
}
