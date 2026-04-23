import type { AccountUser, AuthSession } from '@repo/api-contracts';
import { authenticatedSessionSchema } from '@repo/api-contracts';
import { findSessionByToken, touchAuthSession } from '@repo/db';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { AUTH_SESSION_COOKIE_NAME, buildAuthenticatedRedirect, buildLoginRedirect } from './routing';
import { parseSignedSessionValue } from './session-token';

export type CurrentAuthSession = {
  user: AccountUser;
  session: AuthSession;
};

export const getOptionalCurrentSession = cache(async (): Promise<CurrentAuthSession | null> => {
  const cookieStore = await cookies();
  const rawCookie = cookieStore.get(AUTH_SESSION_COOKIE_NAME)?.value;
  const token = await parseSignedSessionValue(rawCookie);

  if (!token) {
    return null;
  }

  const record = await findSessionByToken(token);

  if (!record) {
    return null;
  }

  await touchAuthSession(record.session.id);

  return authenticatedSessionSchema.parse({
    user: {
      id: record.user.id,
      email: record.user.email,
      name: record.user.name,
      role: record.user.role,
      avatarUrl: record.user.avatarUrl,
      createdAt: record.user.createdAt,
      updatedAt: record.user.updatedAt,
    },
    session: {
      id: record.session.id,
      userId: record.session.userId,
      createdAt: record.session.createdAt,
      expiresAt: record.session.expiresAt,
      lastSeenAt: record.session.lastSeenAt,
    },
  });
});

export const getOptionalCurrentUser = cache(async (): Promise<AccountUser | null> => {
  const session = await getOptionalCurrentSession();
  return session?.user ?? null;
});

export async function requireCurrentSession(nextPath?: string) {
  const session = await getOptionalCurrentSession();

  if (!session) {
    redirect(buildLoginRedirect(nextPath));
  }

  return session;
}

export async function requireCurrentUser(nextPath?: string) {
  const session = await requireCurrentSession(nextPath);
  return session.user;
}

export async function redirectIfAuthenticated(nextPath?: string) {
  const session = await getOptionalCurrentSession();

  if (session) {
    redirect(buildAuthenticatedRedirect(nextPath));
  }
}
