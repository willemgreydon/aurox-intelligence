import { NextResponse } from 'next/server';
import { clearSessionCookie } from '../../../../server/auth/cookies';
import { AUTH_SESSION_COOKIE_NAME } from '../../../../server/auth/routing';
import { logoutWithSessionToken } from '../../../../server/auth/service';
import { parseSignedSessionValue } from '../../../../server/auth/session-token';

export async function POST(request: Request) {
  const cookieHeader = request.headers.get('cookie') ?? '';
  const rawCookie = cookieHeader
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${AUTH_SESSION_COOKIE_NAME}=`))
    ?.slice(AUTH_SESSION_COOKIE_NAME.length + 1);
  const token = await parseSignedSessionValue(rawCookie);

  if (token) {
    await logoutWithSessionToken(token);
  }

  const response = NextResponse.json({ success: true });
  clearSessionCookie(response.cookies);
  return response;
}
