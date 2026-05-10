import { describe, expect, it, vi } from 'vitest';
import { BaseMarketStreamAdapter } from '../market-stream/adapters';
import type { MarketIngestionManagerConfig } from '../market-stream/types';

class TestAdapter extends BaseMarketStreamAdapter {
  public connectCalls = 0;

  constructor(config?: Partial<MarketIngestionManagerConfig>) {
    super('binance', config);
  }

  async connect(): Promise<void> {
    this.connectCalls += 1;
    await super.connect();
  }

  triggerReconnect(reason: string) {
    this.scheduleReconnect(reason);
  }

  ingestRaw(): void {
    // no-op for transport lifecycle tests
  }
}

describe('BaseMarketStreamAdapter transport lifecycle', () => {
  it('tracks connect/subscribe/unsubscribe/disconnect status', async () => {
    const adapter = new TestAdapter();
    const statuses: string[] = [];
    adapter.onStatus((status) => statuses.push(status.status));

    await adapter.connect();
    await adapter.subscribe(['AAPL'], ['market.tick', 'market.trade']);
    await adapter.unsubscribe(['AAPL'], ['market.trade']);
    await adapter.disconnect();

    const finalStatus = adapter.getStatus();
    expect(statuses).toContain('connected');
    expect(statuses).toContain('disconnected');
    expect(finalStatus.subscribedSymbols).toEqual([]);
    expect(finalStatus.activeChannels).toEqual(['market.tick']);
  });

  it('schedules reconnect with backoff and retries connect', async () => {
    vi.useFakeTimers();
    try {
      const adapter = new TestAdapter({ reconnectMaxAttempts: 2 });
      await adapter.connect();

      adapter.triggerReconnect('network hiccup');
      expect(adapter.getStatus().status).toBe('reconnecting');
      expect(adapter.getStatus().reconnectAttempts).toBe(1);

      await vi.runOnlyPendingTimersAsync();
      expect(adapter.connectCalls).toBeGreaterThan(1);
      expect(adapter.getStatus().status).toBe('connected');
    } finally {
      vi.useRealTimers();
    }
  });

  it('marks adapter as failed when reconnect attempts exceed max', async () => {
    const adapter = new TestAdapter({ reconnectMaxAttempts: 0 });
    const events: string[] = [];
    adapter.onEvent((event) => {
      if (event.type === 'provider.error') {
        events.push(event.payload.message);
      }
    });

    adapter.triggerReconnect('hard failure');
    expect(adapter.getStatus().status).toBe('failed');
    expect(events[0]).toContain('hard failure');
  });
});
