'use server';

import { loginInputSchema, registerInputSchema } from '@repo/api-contracts';
import { EmailAlreadyInUseError } from '@repo/db';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { errorFormState, type FormState, formStateFromZodError } from '../auth/forms';
import { clearSessionCookie, setSessionCookie } from '../auth/cookies';
import { AUTH_SESSION_COOKIE_NAME, buildAuthenticatedRedirect, normalizeNextPath } from '../auth/routing';
import {
  AuthenticationError,
  loginWithEmailPassword,
  logoutWithSessionToken,
  registerWithEmailPassword,
} from '../auth/service';
import { parseSignedSessionValue } from '../auth/session-token';
import { consumeRateLimit, extractIpFromHeaders, type RateLimitOptions } from '../lib/rate-limit';

// Mirror the limits enforced by the /api/auth/login and /api/auth/register route
// handlers so both entry points share one limit per client IP (same default
// store + `rl:<route>:<ip>` key convention).
const LOGIN_RATE_LIMIT: RateLimitOptions = { max: 10, windowMs: 60_000 };
const REGISTER_RATE_LIMIT: RateLimitOptions = { max: 10, windowMs: 60_000 };

async function getRequestMetadata() {
  const headerList = await headers();

  return {
    userAgent: headerList.get('user-agent'),
    ipAddress: headerList.get('x-forwarded-for') ?? headerList.get('x-real-ip'),
  };
}

// Returns a typed error FormState when the caller has exceeded the limit, or null
// when the request may proceed. Fail-open only on the limiter, never on auth.
async function enforceAuthActionRateLimit(route: string, options: RateLimitOptions): Promise<FormState | null> {
  const headerList = await headers();
  const ip = extractIpFromHeaders(headerList);
  const { limited } = await consumeRateLimit(ip, route, options);
  if (limited) {
    return errorFormState('Too many attempts. Please wait a moment before trying again.');
  }
  return null;
}

export async function loginAction(_: FormState, formData: FormData): Promise<FormState> {
  const rateLimited = await enforceAuthActionRateLimit('auth:login', LOGIN_RATE_LIMIT);
  if (rateLimited) {
    return rateLimited;
  }

  const parsed = loginInputSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return formStateFromZodError(parsed.error);
  }

  const nextPath = normalizeNextPath(formData.get('next')?.toString());

  try {
    const result = await loginWithEmailPassword(parsed.data, await getRequestMetadata());
    const cookieStore = await cookies();
    await setSessionCookie(cookieStore, result.sessionToken, result.sessionExpiresAt);
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return errorFormState(error.message);
    }

    throw error;
  }

  redirect(buildAuthenticatedRedirect(nextPath));
}

export async function registerAction(_: FormState, formData: FormData): Promise<FormState> {
  const rateLimited = await enforceAuthActionRateLimit('auth:register', REGISTER_RATE_LIMIT);
  if (rateLimited) {
    return rateLimited;
  }

  const parsed = registerInputSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!parsed.success) {
    return formStateFromZodError(parsed.error);
  }

  const nextPath = normalizeNextPath(formData.get('next')?.toString());

  try {
    const result = await registerWithEmailPassword(
      {
        email: parsed.data.email,
        name: parsed.data.name,
        password: parsed.data.password,
      },
      await getRequestMetadata(),
    );

    const cookieStore = await cookies();
    await setSessionCookie(cookieStore, result.sessionToken, result.sessionExpiresAt);
  } catch (error) {
    if (error instanceof EmailAlreadyInUseError) {
      return errorFormState('That email is already registered.', {
        email: 'Use a different email or sign in instead.',
      });
    }

    throw error;
  }

  redirect(buildAuthenticatedRedirect(nextPath));
}

export async function signOutAction() {
  const cookieStore = await cookies();
  const rawCookie = cookieStore.get(AUTH_SESSION_COOKIE_NAME)?.value;
  const token = await parseSignedSessionValue(rawCookie);

  if (token) {
    await logoutWithSessionToken(token);
  }

  clearSessionCookie(cookieStore);
  redirect('/');
}
