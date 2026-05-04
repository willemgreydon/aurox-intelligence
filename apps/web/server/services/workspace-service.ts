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

export async function getWorkspaceTrackedSymbols(limit = 24): Promise<string[]> {
  const { preset } = await getWorkspacePreferences();
  if (!preset) {
    return [];
  }

  return [...new Set(preset.trackedSymbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))].slice(0, limit);
}
