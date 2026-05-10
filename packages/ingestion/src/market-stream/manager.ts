import type { UnifiedProviderId } from './capabilities';
import { MarketEventBus } from './event-bus';
import type {
  IngestionProviderPriorityProfile,
  MarketIngestionManagerConfig,
  MarketStreamAdapter,
  MarketStreamChannel,
  NormalizedMarketStreamEvent,
  ProviderErrorEvent,
  StreamStatus,
} from './types';

const DEFAULT_PRIORITY: IngestionProviderPriorityProfile = {
  cryptoLive: ['binance', 'bybit', 'okx', 'coinbase'],
  derivativesOrderflow: ['bybit', 'okx', 'binance'],
  usSpotReference: ['coinbase', 'binance'],
  stocksEtf: ['finnhub', 'polygon', 'twelve-data'],
  historical: ['polygon', 'binance', 'twelve-data', 'local-cache'],
};

function nowIso() {
  return new Date().toISOString();
}

type StreamChannelSet = {
  symbols: string[];
  channels: MarketStreamChannel[];
};

export class UnifiedMarketIngestionManager {
  private readonly adapters = new Map<UnifiedProviderId, MarketStreamAdapter>();
  private readonly bus = new MarketEventBus();
  private readonly recentDedup = new Set<string>();
  private readonly dedupQueue: string[] = [];
  private readonly config: MarketIngestionManagerConfig;
  private readonly priority: IngestionProviderPriorityProfile;
  private readonly unsubscribeHandlers: Array<() => void> = [];

  constructor(input?: {
    config?: Partial<MarketIngestionManagerConfig>;
    priority?: Partial<IngestionProviderPriorityProfile>;
  }) {
    this.config = {
      reconnectMaxAttempts: 20,
      heartbeatIntervalMs: 30_000,
      staleAfterMs: 45_000,
      eventBufferSize: 5_000,
      ...input?.config,
    };
    this.priority = { ...DEFAULT_PRIORITY, ...input?.priority };
  }

  registerAdapter(adapter: MarketStreamAdapter) {
    this.adapters.set(adapter.providerId, adapter);
    this.unsubscribeHandlers.push(
      adapter.onEvent((event) => this.handleEvent(event)),
      adapter.onStatus((status) => {
        this.bus.emit({
          type: 'provider.status',
          payload: { providerId: status.providerId, status: status.status, at: nowIso() },
        });
      }),
    );
  }

  onEvent(callback: (event: NormalizedMarketStreamEvent) => void): () => void {
    return this.bus.on(callback);
  }

  async start() {
    const starts: Array<Promise<void>> = [];
    for (const adapter of this.adapters.values()) {
      starts.push(adapter.connect());
    }
    await Promise.all(starts);
  }

  async shutdown() {
    for (const unsub of this.unsubscribeHandlers) unsub();
    const stops: Array<Promise<void>> = [];
    for (const adapter of this.adapters.values()) {
      stops.push(adapter.disconnect());
    }
    await Promise.all(stops);
  }

  async subscribeBestEffort(input: StreamChannelSet) {
    const providers = this.resolveProvidersForChannels(input.channels);
    for (const providerId of providers) {
      const adapter = this.adapters.get(providerId);
      if (!adapter) continue;
      const status = adapter.getStatus();
      if (status.status === 'failed' || status.status === 'disconnected') continue;
      await adapter.subscribe(input.symbols, input.channels);
    }
  }

  async unsubscribeAll(input: StreamChannelSet) {
    for (const adapter of this.adapters.values()) {
      await adapter.unsubscribe(input.symbols, input.channels);
    }
  }

  getProviderStatuses() {
    return [...this.adapters.values()].map((adapter) => ({
      providerId: adapter.providerId,
      status: adapter.getStatus(),
      capabilities: adapter.getCapabilities(),
    }));
  }

  private resolveProvidersForChannels(channels: MarketStreamChannel[]): UnifiedProviderId[] {
    if (channels.some((item) => item === 'funding' || item === 'liquidation' || item === 'orderbook')) {
      return this.priority.derivativesOrderflow;
    }
    if (channels.some((item) => item === 'ticker' || item === 'trades')) {
      return this.priority.cryptoLive;
    }
    return this.priority.cryptoLive;
  }

  private handleEvent(event: NormalizedMarketStreamEvent) {
    const key = this.toDedupKey(event);
    if (key && this.recentDedup.has(key)) return;
    if (key) this.addDedupKey(key);
    this.bus.emit(event);
  }

  private toDedupKey(event: NormalizedMarketStreamEvent): string | null {
    switch (event.type) {
      case 'market.tick':
        return `tick:${event.payload.provider}:${event.payload.normalizedSymbol}:${event.payload.eventTime}:${event.payload.price}`;
      case 'market.trade':
        return `trade:${event.payload.provider}:${event.payload.tradeId}`;
      case 'market.orderbook':
        return `book:${event.payload.provider}:${event.payload.normalizedSymbol}:${event.payload.sequence}`;
      case 'market.funding':
        return `funding:${event.payload.provider}:${event.payload.normalizedSymbol}:${event.payload.fundingTime}`;
      case 'market.liquidation':
        return `liq:${event.payload.provider}:${event.payload.normalizedSymbol}:${event.payload.eventTime}:${event.payload.price}:${event.payload.size}`;
      default:
        return null;
    }
  }

  private addDedupKey(key: string) {
    this.recentDedup.add(key);
    this.dedupQueue.push(key);
    if (this.dedupQueue.length > this.config.eventBufferSize) {
      const oldest = this.dedupQueue.shift();
      if (oldest) this.recentDedup.delete(oldest);
    }
  }

  emitProviderError(providerId: UnifiedProviderId, message: string) {
    const payload: ProviderErrorEvent = { providerId, at: nowIso(), message };
    this.bus.emit({ type: 'provider.error', payload });
  }

  markDegraded(providerId: UnifiedProviderId, reason: string) {
    this.bus.emit({
      type: 'provider.status',
      payload: { providerId, status: 'degraded' satisfies StreamStatus, at: nowIso(), detail: reason },
    });
  }
}
