import { describe, expect, it, vi } from 'vitest';
import { fetchMacroSnapshot } from '../macro/client';

describe('macro client', () => {
  it('degrades gracefully when FRED key is missing', async () => {
    process.env.ENABLE_FRED_MACRO = 'true';
    process.env.FRED_API_KEY = '';
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify([{ page: 1 }, []]), { status: 200 }));
    const snapshot = await fetchMacroSnapshot({ fetchImpl, now: Date.UTC(2026, 3, 1), forceRefresh: true });
    const fred = snapshot.providerStatus.find((row) => row.provider === 'fred');
    expect(fred?.configured).toBe(false);
    expect(fred?.lastFailure).toContain('Missing FRED_API_KEY');
  });

  it('uses cache fallback between calls', async () => {
    process.env.ENABLE_WORLD_BANK_MACRO = 'false';
    process.env.ENABLE_ECB_MACRO = 'false';
    process.env.ENABLE_FRED_MACRO = 'false';
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 200 }));
    const first = await fetchMacroSnapshot({ fetchImpl, now: Date.UTC(2026, 3, 1), forceRefresh: true });
    const second = await fetchMacroSnapshot({ fetchImpl, now: Date.UTC(2026, 3, 1) + 1_000 });
    expect(second.generatedAt).toBe(first.generatedAt);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
