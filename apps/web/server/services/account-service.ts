import { accountOverviewSchema, type AccountOverview } from '@repo/api-contracts';
import { formatDateTimeLabel } from '../../lib/formatters';
import type { Locale } from '@repo/api-contracts';
import type { CurrentAuthSession } from '../auth/session';
import { getAccountOverviewSources } from '../queries/account-query';

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

function formatDateTime(value: string, locale: Locale) {
  return formatDateTimeLabel(value, locale);
}

export async function getAccountOverviewData(auth: CurrentAuthSession, locale: Locale = 'en'): Promise<AccountOverviewViewModel> {
  const { activeSessionCount, recentSessions, preferences } = await getAccountOverviewSources(auth.user.id, auth.session.id);

  const overview = accountOverviewSchema.parse({
    user: auth.user,
    currentSession: auth.session,
    activeSessionCount,
    recentSessions,
    preferences,
  });

  return {
    ...overview,
    memberSinceLabel: formatDateTime(overview.user.createdAt, locale),
    sessionExpiresLabel: formatDateTime(overview.currentSession.expiresAt, locale),
    recentSessions: overview.recentSessions.map((session) => ({
      ...session,
      createdAtLabel: formatDateTime(session.createdAt, locale),
      expiresAtLabel: formatDateTime(session.expiresAt, locale),
      lastSeenLabel: session.lastSeenAt ? formatDateTime(session.lastSeenAt, locale) : 'Pending activity',
    })),
  };
}
