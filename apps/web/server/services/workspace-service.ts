import { getUserDashboardPreset } from '@repo/db';
import type { DashboardPreset } from '@repo/api-contracts';
import { getOptionalCurrentSession } from '../auth/session';

export async function getWorkspacePreferences(): Promise<{ userId: string | null; preset: DashboardPreset | null }> {
  const session = await getOptionalCurrentSession();

  if (!session) {
    return {
      userId: null,
      preset: null,
    };
  }

  return {
    userId: session.user.id,
    preset: await getUserDashboardPreset(session.user.id),
  };
}
