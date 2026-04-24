import { getDashboardReadModel, type DashboardOperationalReadModel } from '@repo/db';

export async function getDashboardSnapshot(): Promise<DashboardOperationalReadModel> {
  const dev = process.env.NODE_ENV === 'development';
  const t0 = dev ? performance.now() : 0;
  const result = await getDashboardReadModel();
  if (dev) {
    console.debug(`[dashboard-query] read-model: ${(performance.now() - t0).toFixed(0)}ms`);
  }
  return result;
}
