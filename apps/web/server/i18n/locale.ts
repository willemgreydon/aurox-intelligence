import type { Locale } from '@repo/api-contracts';
import { cookies, headers } from 'next/headers';
import { cache } from 'react';
import { getOptionalCurrentSession } from '../auth/session';
import { getUserDashboardPreset } from '@repo/db';
import { supportedLocales } from '../../lib/i18n/locale-options';

export const LOCALE_COOKIE_KEY = 'aurox-locale';

// How long to wait for a DB locale preference before falling back to Accept-Language.
const LOCALE_DB_TIMEOUT_MS = 1_500;

function normalizeLocale(value: string | null | undefined): Locale | null {
  if (!value) {
    return null;
  }

  const normalized = value.toLowerCase();
  for (const locale of supportedLocales) {
    if (normalized.startsWith(locale)) {
      return locale;
    }
  }

  return null;
}

async function getDbLocale(userId: string): Promise<Locale | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), LOCALE_DB_TIMEOUT_MS);
  });
  try {
    const preset = await Promise.race([
      getUserDashboardPreset(userId),
      timeout,
    ]);
    if (!preset) return null;
    return (preset as { locale?: string }).locale
      ? normalizeLocale((preset as { locale?: string }).locale)
      : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export const getRequestLocale = cache(async (): Promise<Locale> => {
  const cookieStore = await cookies();
  const cookieLocale = normalizeLocale(cookieStore.get(LOCALE_COOKIE_KEY)?.value);

  // Cookie is fastest path — no DB hit needed.
  if (cookieLocale) {
    return cookieLocale;
  }

  // Only hit DB if authenticated. Apply a tight timeout so a slow DB does not
  // block page render for every unauthenticated visitor.
  const session = await getOptionalCurrentSession();
  if (session) {
    const dbLocale = await getDbLocale(session.user.id);
    if (dbLocale) {
      return dbLocale;
    }
  }

  const headerStore = await headers();
  const preferred = headerStore.get('accept-language')?.split(',')[0];
  return normalizeLocale(preferred) ?? 'en';
});
