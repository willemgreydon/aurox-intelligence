import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  AUTH_SESSION_COOKIE_NAME,
  buildAuthenticatedRedirect,
  buildLoginRedirect,
  isGuestOnlyPath,
  isProtectedPath,
} from './server/auth/routing';
import { parseSignedSessionValue } from './server/auth/session-token';

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!isProtectedPath(pathname) && !isGuestOnlyPath(pathname)) {
    return NextResponse.next();
  }

  const rawSession = request.cookies.get(AUTH_SESSION_COOKIE_NAME)?.value;
  const sessionToken = await parseSignedSessionValue(rawSession);
  const hasSignedSession = Boolean(sessionToken);

  if (isProtectedPath(pathname) && !hasSignedSession) {
    const redirectUrl = new URL(buildLoginRedirect(`${pathname}${search}`), request.url);
    return NextResponse.redirect(redirectUrl);
  }

  if (isGuestOnlyPath(pathname) && hasSignedSession) {
    const requestedNext = request.nextUrl.searchParams.get('next');
    const redirectUrl = new URL(buildAuthenticatedRedirect(requestedNext), request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/account/:path*', '/login', '/signup'],
};
