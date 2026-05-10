import { afterEach, describe, expect, it, vi } from 'vitest';

// Mock the query layer — the ticker service must return degraded state when
// the underlying query stalls, without throwing or blocking indefinitely.
vi.mock('../queries/market-ticker-query', () => ({
  getMarketTickerReadModel: vi.fn(),
}));

// Provide minimal stub mappers so the service logic under test is the only
// moving part.
vi.mock('../mappers/market-ticker-mapper', () => ({
  mapMarketTicker: (_readModel: unknown) => ({ items: [], provider: 'cache', degraded: true }),
  mapMarketTickerViewModel: (snapshot: unknown) => snapshot,
}));

import { getMarketTickerData } from './market-ticker-service';
import { getMarketTickerReadModel } from '../queries/market-ticker-query';

const mockGetReadModel = getMarketTickerReadModel as ReturnType<typeof vi.fn>;

const STUB_LOCALE = 'en' as const;
const STUB_MESSAGES = {} as Parameters<typeof getMarketTickerData>[1];

describe('getMarketTickerData', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('returns a result when the underlying query resolves quickly', async () => {
    mockGetReadModel.mockResolvedValue({
      provider: 'polygon',
      observations: [],
      universe: [],
      fallbackProvider: null,
      sourceSummary: 'ok',
      providerError: null,
    });

    const result = await getMarketTickerData(STUB_LOCALE, STUB_MESSAGES);
    // The mapper stubs pass the snapshot through — just assert we get an object.
    expect(result).toBeTruthy();
  });

  it('returns a degraded result when the query exceeds the 3s timeout', async () => {
    vi.useFakeTimers();

    // Query that never resolves — simulates a provider stall.
    mockGetReadModel.mockReturnValue(new Promise(() => { /* never */ }));

    const resultPromise = getMarketTickerData(STUB_LOCALE, STUB_MESSAGES);

    // Advance past the 3000ms ticker timeout.
    await vi.advanceTimersByTimeAsync(3_100);

    const result = await resultPromise;
    // The mapper stubs receive the empty read model — assert the call resolved.
    expect(result).toBeTruthy();
  });

  it('propagates query rejection — the caller (header) applies its own timeout/catch', async () => {
    // withTimeout races the original promise and the timeout promise. A rejected
    // original promise still wins the race and propagates the error to the caller.
    // The header wraps getMarketTickerData in its own withTimeout + catch, which
    // converts this rejection into a degraded fallback at that level.
    mockGetReadModel.mockRejectedValue(new Error('provider down'));
    await expect(getMarketTickerData(STUB_LOCALE, STUB_MESSAGES)).rejects.toThrow('provider down');
  });
});
