export const AUTH_SESSION_COOKIE_NAME = 'aurox-session';
export const AUTH_PROTECTED_PREFIXES = ['/account'];
export const AUTH_GUEST_ONLY_ROUTES = ['/login', '/signup'];

export function normalizeNextPath(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  if (!value.startsWith('/') || value.startsWith('//')) {
    return null;
  }

  return value;
}

export function buildLoginRedirect(nextPath?: string | null) {
  const normalized = normalizeNextPath(nextPath);

  if (!normalized) {
    return '/login';
  }

  return `/login?next=${encodeURIComponent(normalized)}`;
}

export function buildAuthenticatedRedirect(nextPath?: string | null) {
  return normalizeNextPath(nextPath) ?? '/account';
}

export function isProtectedPath(pathname: string) {
  return AUTH_PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function isGuestOnlyPath(pathname: string) {
  return AUTH_GUEST_ONLY_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}
