'use server';

import {
  normalizeTrackedSymbolsInput,
  passwordChangeInputSchema,
  preferencesUpdateInputSchema,
  profileUpdateInputSchema,
} from '@repo/api-contracts';
import {
  countActiveAuthSessionsForUser,
  createSession,
  deleteAllAuthSessionsForUser,
  EmailAlreadyInUseError,
  findAuthUserById,
  saveUserDashboardPreset,
  updateAuthUserPassword,
  updateAuthUserProfile,
} from '@repo/db';
import { revalidatePath } from 'next/cache';
import { cookies, headers } from 'next/headers';
import { getSessionExpiryDate } from '../auth/config';
import { setSessionCookie } from '../auth/cookies';
import { errorFormState, type FormState, formStateFromZodError, successFormState } from '../auth/forms';
import { hashPassword, verifyPassword } from '../auth/password';
import { requireCurrentSession } from '../auth/session';
import { generateOpaqueToken } from '../auth/session-token';

async function establishReplacementSession(userId: string) {
  const headerList = await headers();
  const token = generateOpaqueToken();
  const expiresAt = getSessionExpiryDate();

  await createSession({
    id: crypto.randomUUID(),
    userId,
    token,
    expiresAt: expiresAt.toISOString(),
    userAgent: headerList.get('user-agent'),
    ipAddress: headerList.get('x-forwarded-for') ?? headerList.get('x-real-ip'),
  });

  const cookieStore = await cookies();
  await setSessionCookie(cookieStore, token, expiresAt);
}

export async function updateProfileAction(_: FormState, formData: FormData): Promise<FormState> {
  const auth = await requireCurrentSession('/account/profile');
  const parsed = profileUpdateInputSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    avatarUrl: formData.get('avatarUrl'),
  });

  if (!parsed.success) {
    return formStateFromZodError(parsed.error);
  }

  try {
    await updateAuthUserProfile(auth.user.id, parsed.data);
  } catch (error) {
    if (error instanceof EmailAlreadyInUseError) {
      return errorFormState('That email is already associated with another account.', {
        email: 'Choose a different email address.',
      });
    }

    throw error;
  }

  revalidatePath('/account');
  revalidatePath('/account/profile');
  return successFormState('Profile updated successfully.');
}

export async function changePasswordAction(_: FormState, formData: FormData): Promise<FormState> {
  const auth = await requireCurrentSession('/account/settings');
  const fullUser = await findAuthUserById(auth.user.id);
  const parsed = passwordChangeInputSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    nextPassword: formData.get('nextPassword'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!parsed.success) {
    return formStateFromZodError(parsed.error);
  }

  if (!fullUser) {
    return errorFormState('Your account could not be loaded. Please sign in again.');
  }

  if (!fullUser.passwordHash) {
    return errorFormState('Password updates are unavailable for this account.');
  }

  const currentPasswordValid = await verifyPassword(parsed.data.currentPassword, fullUser.passwordHash);

  if (!currentPasswordValid) {
    return errorFormState('Your current password was incorrect.', {
      currentPassword: 'Enter your current password to continue.',
    });
  }

  await updateAuthUserPassword(auth.user.id, await hashPassword(parsed.data.nextPassword));
  await deleteAllAuthSessionsForUser(auth.user.id);
  await establishReplacementSession(auth.user.id);

  const activeSessionCount = await countActiveAuthSessionsForUser(auth.user.id);

  revalidatePath('/account');
  revalidatePath('/account/settings');
  return successFormState(
    activeSessionCount > 0
      ? 'Password updated and your session was refreshed.'
      : 'Password updated successfully.',
  );
}

export async function updateWorkspacePreferencesAction(_: FormState, formData: FormData): Promise<FormState> {
  const auth = await requireCurrentSession('/account/settings');
  const parsed = preferencesUpdateInputSchema.safeParse({
    locale: formData.get('locale'),
    defaultChartType: formData.get('defaultChartType'),
    defaultTimePeriod: formData.get('defaultTimePeriod'),
    trackedSymbols: normalizeTrackedSymbolsInput(String(formData.get('trackedSymbols') ?? '')),
    visibleModules: formData.getAll('visibleModules'),
    simulationPreferences: {
      preferredBrokerMode: formData.get('preferredBrokerMode'),
      brokerModeCapitalLimitUsd: Number(formData.get('brokerModeCapitalLimitUsd') ?? 0),
      microTradeAllocationPercent: Number(formData.get('microTradeAllocationPercent') ?? 0),
      defaultAssetScope: formData.get('defaultAssetScope'),
    },
    activityPreferences: {
      orderActivityDigest: String(formData.get('orderActivityDigest') ?? 'off') === 'on',
      laneStatusAlerts: String(formData.get('laneStatusAlerts') ?? 'off') === 'on',
    },
  });

  if (!parsed.success) {
    return formStateFromZodError(parsed.error);
  }

  await saveUserDashboardPreset(auth.user.id, parsed.data);

  const cookieStore = await cookies();
  cookieStore.set('aurox-locale', parsed.data.locale, {
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 31536000,
  });

  revalidatePath('/account');
  revalidatePath('/account/settings');
  revalidatePath('/dashboard');
  revalidatePath('/stocks');
  revalidatePath('/fx');
  revalidatePath('/invest');
  return successFormState('Workspace preferences saved.');
}
