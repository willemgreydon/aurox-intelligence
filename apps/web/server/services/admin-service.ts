import { mapAdminMonitoring, mapAdminMonitoringViewModel, type AdminMonitoringViewModel } from '../mappers/admin-mapper';
import { getAdminReadModel } from '../queries/admin-query';

export async function getAdminMonitoringData(): Promise<AdminMonitoringViewModel> {
  const readModel = await getAdminReadModel();
  const snapshot = mapAdminMonitoring(readModel);
  return mapAdminMonitoringViewModel(snapshot, readModel);
}
