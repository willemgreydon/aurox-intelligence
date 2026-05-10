import { afterEach, describe, expect, it, vi } from 'vitest';

// Mock all Next.js server module dependencies before importing the module
// under test — they are not available in the Vitest environment.
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
  headers: vi.fn(),
}));

vi.mock('../auth/session', () => ({
  getOptionalCurrentSession: vi.fn(),
}));

vi.mock('@repo/db', () => ({
  getUserDashboardPreset: vi.fn(),
}));

// React cache() must be a pass-through in tests so the function is callable
// without a React rendering context.
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return { ...actual, cache: (fn: unknown) => fn };
});

import { cookies, headers } from 'next/headers';
import { getOptionalCurrentSession } from '../auth/session';
import { getUserDashboardPreset } from '@repo/db';

const mockCookies = cookies as ReturnType<typeof vi.fn>;
const mockHeaders = headers as ReturnType<typeof vi.fn>;
const mockGetSession = getOptionalCurrentSession as ReturnType<typeof vi.fn>;
const mockGetPreset = getUserDashboardPreset as ReturnType<typeof vi.fn>;

function makeCookieStore(map: Record<string, string> = {}) {
  return {
    get: (key: string) => (map[key] ? { value: map[key] } : undefined),
  };
}

function makeHeaderStore(acceptLanguage = '') {
  return { get: (key: string) => (key === 'accept-language' ? acceptLanguage : null) };
}

describe('getRequestLocale', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    // Reset the module so React cache() doesn't serve stale cached values
    // between tests.
    vi.resetModules();
  });

  it('returns the locale from the cookie when present', async () => {
    mockCookies.mockResolvedValue(makeCookieStore({ 'aurox-locale': 'de' }));
    mockHeaders.mockResolvedValue(makeHeaderStore());
    mockGetSession.mockResolvedValue(null);

    // Re-import after resetModules to get a fresh cache() wrapper.
    const { getRequestLocale } = await import('./locale');
    const locale = await getRequestLocale();
    expect(locale).toBe('de');
    // DB should not be consulted when the cookie satisfies the lookup.
    expect(mockGetPreset).not.toHaveBeenCalled();
  });

  it('falls back to Accept-Language when no cookie and no session', async () => {
    mockCookies.mockResolvedValue(makeCookieStore());
    mockHeaders.mockResolvedValue(makeHeaderStore('fr-FR,fr;q=0.9'));
    mockGetSession.mockResolvedValue(null);

    const { getRequestLocale } = await import('./locale');
    const locale = await getRequestLocale();
    expect(locale).toBe('fr');
  });

  it('falls back to "en" when Accept-Language is unsupported', async () => {
    mockCookies.mockResolvedValue(makeCookieStore());
    mockHeaders.mockResolvedValue(makeHeaderStore('xx-XX'));
    mockGetSession.mockResolvedValue(null);

    const { getRequestLocale } = await import('./locale');
    const locale = await getRequestLocale();
    expect(locale).toBe('en');
  });

  it('uses DB locale when authenticated and cookie is absent', async () => {
    mockCookies.mockResolvedValue(makeCookieStore());
    mockHeaders.mockResolvedValue(makeHeaderStore('en'));
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockGetPreset.mockResolvedValue({ locale: 'ja' });

    const { getRequestLocale } = await import('./locale');
    const locale = await getRequestLocale();
    expect(locale).toBe('ja');
  });

  it('falls back to Accept-Language when DB locale lookup exceeds timeout', async () => {
    vi.useFakeTimers();
    mockCookies.mockResolvedValue(makeCookieStore());
    mockHeaders.mockResolvedValue(makeHeaderStore('es'));
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    // DB call that never resolves — simulates a stalled connection.
    mockGetPreset.mockReturnValue(new Promise(() => { /* never */ }));

    const { getRequestLocale } = await import('./locale');
    const localePromise = getRequestLocale();

    // Advance past the 1500ms DB locale timeout.
    await vi.advanceTimersByTimeAsync(1_600);

    const locale = await localePromise;
    // Must not block on the DB — should fall back to Accept-Language.
    expect(locale).toBe('es');
  });

  it('falls back to Accept-Language when DB preset is null', async () => {
    mockCookies.mockResolvedValue(makeCookieStore());
    mockHeaders.mockResolvedValue(makeHeaderStore('pt'));
    mockGetSession.mockResolvedValue({ user: { id: 'user-2' } });
    mockGetPreset.mockResolvedValue(null);

    const { getRequestLocale } = await import('./locale');
    const locale = await getRequestLocale();
    expect(locale).toBe('pt');
  });
});
