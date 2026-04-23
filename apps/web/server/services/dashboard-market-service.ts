import { mapDashboardMarketAnalytics, type DashboardMarketAnalyticsViewModel } from '../mappers/dashboard-market-mapper';
import { getDashboardMarketReadModel } from '../queries/dashboard-market-query';

export async function getDashboardMarketAnalyticsData(): Promise<DashboardMarketAnalyticsViewModel> {
  const readModel = await getDashboardMarketReadModel();
  return mapDashboardMarketAnalytics(readModel);
}
