import { getDashboardReadModel, type DashboardOperationalReadModel } from '@repo/db';

export async function getDashboardSnapshot(): Promise<DashboardOperationalReadModel> {
  return getDashboardReadModel();
}
