import {
  countActiveAuthSessionsForUser,
  getSimulationWorkspace,
  getUserDashboardPreset,
  getUserWatchlist,
  listRecentAuthSessionsForUser,
} from '@repo/db';

/** Raw account/session reads used by account-facing services. */
export async function getAccountOverviewSources(userId: string, currentSessionId: string) {
  const [activeSessionCount, recentSessions, preferences] = await Promise.all([
    countActiveAuthSessionsForUser(userId),
    listRecentAuthSessionsForUser(userId, currentSessionId),
    getUserDashboardPreset(userId),
  ]);

  return { activeSessionCount, recentSessions, preferences };
}

/** Simulation and watchlist sources for the account intelligence read model. */
export async function getAccountIntelligenceSources(userId: string) {
  const [workspace, watchlist] = await Promise.all([
    getSimulationWorkspace(userId).catch(() => null),
    getUserWatchlist(userId).catch(() => []),
  ]);

  return { workspace, watchlist };
}
