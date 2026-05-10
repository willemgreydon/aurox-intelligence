import { afterEach, describe, expect, it, vi } from 'vitest';
import { getDbReadTimeoutMs, isPrismaDbEnabled, withDbReadFallback } from './db-runtime';

describe('db-runtime', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('disables DB usage when ENABLE_PRISMA_DB=false', async () => {
    vi.stubEnv('ENABLE_PRISMA_DB', 'false');
    const result = await withDbReadFallback('test:disabled', 'fallback', async () => 'live');
    expect(isPrismaDbEnabled()).toBe(false);
    expect(result.value).toBe('fallback');
    expect(result.degraded).toBe(true);
    expect(result.reason).toBe('disabled');
  });

  it('clamps DB_READ_TIMEOUT_MS below 1000 to the 8000ms default', () => {
    vi.stubEnv('ENABLE_PRISMA_DB', 'true');
    vi.stubEnv('DB_READ_TIMEOUT_MS', '250');
    // Values below 1_000 are intentionally rejected to prevent accidental
    // sub-second timeouts from misconfigured environments.
    expect(getDbReadTimeoutMs()).toBe(8_000);
  });

  it('honours DB_READ_TIMEOUT_MS when >= 1000', () => {
    vi.stubEnv('DB_READ_TIMEOUT_MS', '2500');
    expect(getDbReadTimeoutMs()).toBe(2_500);
  });

  it('returns fallback when DB read exceeds timeout (fake timers)', async () => {
    vi.stubEnv('ENABLE_PRISMA_DB', 'true');
    // Use a value >= 1000 so the minimum guard accepts it.
    vi.stubEnv('DB_READ_TIMEOUT_MS', '1000');
    vi.useFakeTimers();

    // Start the guarded read. The load function will never resolve on its own
    // because we control the clock.
    const neverResolves = new Promise<string>(() => {
      // intentionally never resolved
    });

    const resultPromise = withDbReadFallback('test:timeout', 'fallback', () => neverResolves);

    // Advance clock past the 1000ms timeout.
    await vi.advanceTimersByTimeAsync(1_100);

    const result = await resultPromise;
    expect(result.value).toBe('fallback');
    expect(result.degraded).toBe(true);
    expect(result.reason).toBe('timeout');
  });

  it('returns live value when DB read completes within timeout', async () => {
    vi.stubEnv('ENABLE_PRISMA_DB', 'true');
    vi.stubEnv('DB_READ_TIMEOUT_MS', '1000');
    vi.useFakeTimers();

    let resolveLoad!: (v: string) => void;
    const fastLoad = new Promise<string>((resolve) => {
      resolveLoad = resolve;
    });

    const resultPromise = withDbReadFallback('test:fast', 'fallback', () => fastLoad);

    // Resolve the load before the timeout fires.
    resolveLoad('live');
    await vi.advanceTimersByTimeAsync(500);

    const result = await resultPromise;
    expect(result.value).toBe('live');
    expect(result.degraded).toBe(false);
    expect(result.reason).toBe(null);
  });
});
