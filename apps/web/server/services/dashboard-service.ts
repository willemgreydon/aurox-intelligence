import { mapDashboardSnapshot, mapDashboardViewModel } from '../mappers/dashboard-mapper';
import { getDashboardSnapshot } from '../queries/dashboard-query';

export async function getDashboardData() {
  const readModel = await getDashboardSnapshot();
  const snapshot = mapDashboardSnapshot(readModel);
  return mapDashboardViewModel(snapshot);
}
