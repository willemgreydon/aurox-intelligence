import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { clearProviderCacheForTests, getOrLoadProviderCache } from './provider-cache';

describe('provider-cache', () => {
  beforeEach(() => {
    clearProviderCacheForTests();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-09T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns cache hit before ttl expiry', async () => {
    const loader = vi.fn().mockResolvedValue({ price: 100 });
    const first = await getOrLoadProviderCache({
      key: 'quote:AAPL',
      ttlMs: 60_000,
      staleWhileRevalidateMs: 60_000,
      source: 'provider',
      loader,
    });
    const second = await getOrLoadProviderCache({
      key: 'quote:AAPL',
      ttlMs: 60_000,
      staleWhileRevalidateMs: 60_000,
      source: 'provider',
      loader,
    });

    expect(first.status).toBe('miss');
    expect(second.status).toBe('hit');
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('serves stale then revalidates in background', async () => {
    const loader = vi
      .fn()
      .mockResolvedValueOnce({ price: 100 })
      .mockResolvedValueOnce({ price: 102 });

    await getOrLoadProviderCache({
      key: 'quote:BTC',
      ttlMs: 30_000,
      staleWhileRevalidateMs: 30_000,
      source: 'provider',
      loader,
    });
    vi.advanceTimersByTime(31_000);
    const staleRead = await getOrLoadProviderCache({
      key: 'quote:BTC',
      ttlMs: 30_000,
      staleWhileRevalidateMs: 30_000,
      source: 'provider',
      loader,
    });
    await Promise.resolve();
    const refreshed = await getOrLoadProviderCache({
      key: 'quote:BTC',
      ttlMs: 30_000,
      staleWhileRevalidateMs: 30_000,
      source: 'provider',
      loader,
    });

    expect(staleRead.status).toBe('stale');
    expect(refreshed.value).toEqual({ price: 102 });
  });

  it('does not overwrite good cached value with failed revalidation', async () => {
    const loader = vi
      .fn()
      .mockResolvedValueOnce({ price: 200 })
      .mockRejectedValueOnce(new Error('provider down'));

    await getOrLoadProviderCache({
      key: 'quote:SPY',
      ttlMs: 20_000,
      staleWhileRevalidateMs: 20_000,
      source: 'provider',
      loader,
    });

    vi.advanceTimersByTime(41_000);
    const fallback = await getOrLoadProviderCache({
      key: 'quote:SPY',
      ttlMs: 20_000,
      staleWhileRevalidateMs: 20_000,
      source: 'provider',
      loader,
      shouldStore: (value) => Boolean(value),
    });

    expect(fallback.value).toEqual({ price: 200 });
    expect(fallback.status).toBe('error-fallback');
  });
});
