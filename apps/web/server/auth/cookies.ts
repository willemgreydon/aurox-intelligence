import { AUTH_SESSION_COOKIE_NAME } from './routing';
import { createSignedSessionValue } from './session-token';
import { isProductionAuth } from './config';

type CookieStoreLike = {
  set: (name: string, value: string, options: {
    httpOnly: boolean;
    sameSite: 'lax';
    secure: boolean;
    path: string;
    expires?: Date;
    maxAge?: number;
  }) => unknown;
};

function getBaseCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isProductionAuth(),
    path: '/',
  };
}

export async function setSessionCookie(
  cookieStore: CookieStoreLike,
  token: string,
  expiresAt: Date,
) {
  cookieStore.set(
    AUTH_SESSION_COOKIE_NAME,
    await createSignedSessionValue(token),
    {
      ...getBaseCookieOptions(),
      expires: expiresAt,
    },
  );
}

export function clearSessionCookie(cookieStore: CookieStoreLike) {
  cookieStore.set(AUTH_SESSION_COOKIE_NAME, '', {
    ...getBaseCookieOptions(),
    expires: new Date(0),
    maxAge: 0,
  });
}
