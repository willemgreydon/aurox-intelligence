import { afterEach, describe, expect, it, vi } from 'vitest';
import { isPrismaDbEnabled, withDbReadFallback } from './db-runtime';

describe('db-runtime', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('disables DB usage when ENABLE_PRISMA_DB=false', async () => {
    vi.stubEnv('ENABLE_PRISMA_DB', 'false');
    const result = await withDbReadFallback('test:disabled', 'fallback', async () => 'live');
    expect(isPrismaDbEnabled()).toBe(false);
    expect(result.value).toBe('fallback');
    expect(result.degraded).toBe(true);
  });

  it('returns fallback when DB read exceeds timeout', async () => {
    vi.stubEnv('ENABLE_PRISMA_DB', 'true');
    vi.stubEnv('DB_READ_TIMEOUT_MS', '250');
    const result = await withDbReadFallback('test:timeout', 'fallback', async () => {
      await new Promise((resolve) => setTimeout(resolve, 325));
      return 'live';
    });
    expect(result.value).toBe('fallback');
    expect(result.degraded).toBe(true);
    expect(result.reason).toBe('timeout');
  });
});
