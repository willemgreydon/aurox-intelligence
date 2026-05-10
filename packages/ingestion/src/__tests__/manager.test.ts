import { describe, expect, it } from 'vitest';
import { BinanceStreamAdapter } from '../market-stream/adapters';
import { UnifiedMarketIngestionManager } from '../market-stream/manager';

describe('UnifiedMarketIngestionManager', () => {
  it('deduplicates repeated events and emits once', async () => {
    const manager = new UnifiedMarketIngestionManager({ config: { eventBufferSize: 10 } });
    const adapter = new BinanceStreamAdapter();
    manager.registerAdapter(adapter);

    const seen: string[] = [];
    manager.onEvent((event) => {
      if (event.type === 'market.trade') {
        seen.push(event.payload.tradeId);
      }
    });

    await manager.start();
    adapter.ingestRaw({ e: 'trade', s: 'BTCUSDT', t: 42, p: '64000', q: '0.1', m: false, T: 1700000000000 });
    adapter.ingestRaw({ e: 'trade', s: 'BTCUSDT', t: 42, p: '64000', q: '0.1', m: false, T: 1700000000000 });
    await manager.shutdown();

    expect(seen).toEqual(['42']);
  });
});
