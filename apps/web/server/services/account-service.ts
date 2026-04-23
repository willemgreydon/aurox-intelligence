import { accountOverviewSchema, type AccountOverview } from '@repo/api-contracts';
import { countActiveAuthSessionsForUser, getUserDashboardPreset, listRecentAuthSessionsForUser } from '@repo/db';
import { formatDateTimeLabel } from '../../lib/formatters';
import type { CurrentAuthSession } from '../auth/session';

export type AccountOverviewViewModel = Omit<AccountOverview, 'recentSessions'> & {
  memberSinceLabel: string;
  sessionExpiresLabel: string;
  recentSessions: Array<
    AccountOverview['recentSessions'][number] & {
      createdAtLabel: string;
      expiresAtLabel: string;
      lastSeenLabel: string;
    }
  >;
};

function formatDateTime(value: string) {
  return formatDateTimeLabel(value);
}

export async function getAccountOverviewData(auth: CurrentAuthSession): Promise<AccountOverviewViewModel> {
  const [activeSessionCount, recentSessions, preferences] = await Promise.all([
    countActiveAuthSessionsForUser(auth.user.id),
    listRecentAuthSessionsForUser(auth.user.id, auth.session.id),
    getUserDashboardPreset(auth.user.id),
  ]);

  const overview = accountOverviewSchema.parse({
    user: auth.user,
    currentSession: auth.session,
    activeSessionCount,
    recentSessions,
    preferences,
  });

  return {
    ...overview,
    memberSinceLabel: formatDateTime(overview.user.createdAt),
    sessionExpiresLabel: formatDateTime(overview.currentSession.expiresAt),
    recentSessions: overview.recentSessions.map((session) => ({
      ...session,
      createdAtLabel: formatDateTime(session.createdAt),
      expiresAtLabel: formatDateTime(session.expiresAt),
      lastSeenLabel: session.lastSeenAt ? formatDateTime(session.lastSeenAt) : 'Pending activity',
    })),
  };
}
