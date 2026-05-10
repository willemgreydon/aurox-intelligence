import { describe, expect, it, vi } from 'vitest';
import { createIngestIntradayMarketDataJob } from './ingest-intraday-market-data';

describe('ingestIntradayMarketDataJob', () => {
  it('continues after one symbol fetch fails', async () => {
    const fetchHistory = vi.fn(async ({ symbol }: { symbol: string }) => {
      if (symbol.includes('ETHUSDT')) {
        throw new Error('provider down');
      }
      return [{ timestamp: new Date().toISOString() }];
    });
    const log = vi.fn();
    const job = createIngestIntradayMarketDataJob({
      fetchHistory: fetchHistory as never,
      log,
    });

    await job();

    expect(fetchHistory).toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        job: 'ingest-intraday-market-data',
        failed: expect.any(Number),
      }),
    );
  });
});

