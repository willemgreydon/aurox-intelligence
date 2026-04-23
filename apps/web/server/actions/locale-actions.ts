'use server';

import { localeSchema } from '@repo/api-contracts';
import { getUserDashboardPreset, saveUserDashboardPreset } from '@repo/db';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { getOptionalCurrentSession } from '../auth/session';
import { LOCALE_COOKIE_KEY } from '../i18n/locale';

export async function setLocalePreferenceAction(input: string) {
  const locale = localeSchema.parse(input);
  const session = await getOptionalCurrentSession();

  if (session) {
    try {
      const preset = await getUserDashboardPreset(session.user.id);
      await saveUserDashboardPreset(session.user.id, {
        ...preset,
        locale,
      });
    } catch (error) {
      console.error('Failed to persist locale preference. Falling back to cookie-only locale.', error);
    }
  }

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE_KEY, locale, {
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 31536000,
  });

  revalidatePath('/', 'layout');
  revalidatePath('/');
  revalidatePath('/dashboard');
  revalidatePath('/market');
  revalidatePath('/stocks');
  revalidatePath('/invest');
  revalidatePath('/signals');
  revalidatePath('/forecasts');
  revalidatePath('/fx');
  revalidatePath('/admin');
  revalidatePath('/account');
}
