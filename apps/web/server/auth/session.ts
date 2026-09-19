import type { AccountUser, AuthSession, Capability } from '@repo/api-contracts';
import { authenticatedSessionSchema, roleHasCapability } from '@repo/api-contracts';
import { findSessionByToken, touchAuthSession } from '@repo/db';
import { cookies } from 'next/headers';
import { redirect, unstable_rethrow } from 'next/navigation';
import { cache } from 'react';
import { AUTH_SESSION_COOKIE_NAME, buildAuthenticatedRedirect, buildLoginRedirect } from './routing';
import { parseSignedSessionValue } from './session-token';

export type CurrentAuthSession = {
  user: AccountUser;
  session: AuthSession;
};

export const getOptionalCurrentSession = cache(async (): Promise<CurrentAuthSession | null> => {
  try {
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

    // Best-effort last-seen update — a write failure must never drop an
    // otherwise valid, readable session.
    try {
      await touchAuthSession(record.session.id);
    } catch (error) {
      console.warn('[auth] touchAuthSession failed (non-fatal)', error);
    }

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
  } catch (error) {
    // Never swallow Next.js control-flow signals (dynamic-server usage from
    // cookies(), redirect(), notFound()) — re-throw them so static/dynamic
    // detection and per-user rendering stay correct.
    unstable_rethrow(error);

    // Session store unreachable (DB outage / Neon data-transfer quota exceeded)
    // or token unparseable. Fail CLOSED: treat the viewer as anonymous rather
    // than throwing. This is the OPTIONAL session getter, called at the root
    // layout level (Header + getRequestLocale); a throw here has no nearer error
    // boundary and renders global-error on every route, taking down the whole
    // app shell. Returning null never grants access it shouldn't.
    console.warn('[auth] session lookup failed; treating viewer as anonymous', error);
    return null;
  }
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

/**
 * Capability-based authorization guard for server actions (RBAC-lite). Redirects
 * to login if unauthenticated, then throws a stable, non-spoofable error if the
 * verified session's role does not grant the required capability. Prefer this
 * over raw `role === 'admin'` checks so authorization evolves in one place
 * (the role→capability map in @repo/api-contracts).
 */
export async function requireCapability(
  capability: Capability,
  nextPath?: string,
): Promise<CurrentAuthSession> {
  const session = await requireCurrentSession(nextPath);
  if (!roleHasCapability(session.user.role, capability)) {
    throw new Error(`authorization_required: capability "${capability}" is required`);
  }
  return session;
}

/**
 * Admin console access guard. Thin wrapper over the `access_admin` capability.
 * The `/admin` layout keeps its own render-time guard (renders a 403 rather
 * than throwing).
 */
export async function requireAdmin(nextPath?: string): Promise<CurrentAuthSession> {
  return requireCapability('access_admin', nextPath);
}

export async function redirectIfAuthenticated(nextPath?: string) {
  const session = await getOptionalCurrentSession();

  if (session) {
    redirect(buildAuthenticatedRedirect(nextPath));
  }
}
