import type { Locale } from '@repo/api-contracts';
import { cookies, headers } from 'next/headers';
import { cache } from 'react';
import { getOptionalCurrentSession } from '../auth/session';
import { getUserDashboardPreset } from '@repo/db';

export const LOCALE_COOKIE_KEY = 'aurox-locale';

function normalizeLocale(value: string | null | undefined): Locale | null {
  if (!value) {
    return null;
  }

  const normalized = value.toLowerCase();
  if (normalized.startsWith('de')) {
    return 'de';
  }
  if (normalized.startsWith('fr')) {
    return 'fr';
  }
  if (normalized.startsWith('en')) {
    return 'en';
  }

  return null;
}

export const getRequestLocale = cache(async (): Promise<Locale> => {
  const session = await getOptionalCurrentSession();

  if (session) {
    const preset = await getUserDashboardPreset(session.user.id);
    if (preset.locale) {
      return preset.locale;
    }
  }

  const cookieStore = await cookies();
  const cookieLocale = normalizeLocale(cookieStore.get(LOCALE_COOKIE_KEY)?.value);

  if (cookieLocale) {
    return cookieLocale;
  }

  const headerStore = await headers();
  const preferred = headerStore.get('accept-language')?.split(',')[0];
  return normalizeLocale(preferred) ?? 'en';
});
