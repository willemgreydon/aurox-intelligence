import { describe, it, expect, vi, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// config.ts validates the auth environment at module-evaluation time, so each
// case re-imports the module after stubbing process.env and resetting the
// module registry. This mirrors the next.config.test.ts pattern in this app.
// ---------------------------------------------------------------------------

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function importConfigWithEnv(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      vi.stubEnv(key, '');
    } else {
      vi.stubEnv(key, value);
    }
  }
  return import('./config');
}

const VALID_SECRET = 'a'.repeat(40);

describe('auth/config.ts — environment validation', () => {
  it('loads a valid AUTH_SECRET', async () => {
    const mod = await importConfigWithEnv({
      AUTH_SECRET: VALID_SECRET,
      AUTH_SESSION_DAYS: '30',
      NODE_ENV: 'test',
    });
    expect(mod.getAuthSecret()).toBe(VALID_SECRET);
    expect(mod.getSessionDurationDays()).toBe(30);
  });

  it('throws a developer-friendly error when AUTH_SECRET is missing', async () => {
    await expect(
      importConfigWithEnv({
        AUTH_SECRET: undefined,
        AUTH_SESSION_DAYS: '30',
        NODE_ENV: 'test',
      }),
    ).rejects.toThrow(/AUTH_SECRET/);
  });

  it('error message references the root .env and openssl, and is not a raw ZodError', async () => {
    let message = '';
    try {
      await importConfigWithEnv({ AUTH_SECRET: undefined, NODE_ENV: 'test' });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain('AUTH_SECRET is required');
    expect(message).toContain('openssl rand -base64 32');
    expect(message).toContain('.env');
    // Must not leak any value and must be our friendly wrapper, not a ZodError dump.
    expect(message).not.toMatch(/ZodError/);
  });

  it('rejects an AUTH_SECRET that is too short (no insecure fallback)', async () => {
    await expect(
      importConfigWithEnv({ AUTH_SECRET: 'short', NODE_ENV: 'test' }),
    ).rejects.toThrow(/AUTH_SECRET/);
  });
});
