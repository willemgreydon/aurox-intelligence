import { getProviderCapabilities, type UnifiedProviderId } from './capabilities';
import type {
  MarketIngestionManagerConfig,
  MarketStreamAdapter,
  MarketStreamChannel,
  MarketStreamStatus,
  NormalizedMarketStreamEvent,
  StreamStatus,
} from './types';
import {
  mapBinanceOrderBook,
  mapBinanceTicker,
  mapBinanceTrade,
  mapBybitOrderBook,
  mapBybitTicker,
  mapBybitTrade,
  mapCoinbaseOrderBook,
  mapCoinbaseTicker,
  mapCoinbaseTrade,
  mapOkxOrderBook,
  mapOkxTicker,
  mapOkxTrade,
} from './mappers';

function nowIso() {
  return new Date().toISOString();
}

type EventListener = (event: NormalizedMarketStreamEvent) => void;
type StatusListener = (status: MarketStreamStatus) => void;

export abstract class BaseMarketStreamAdapter implements MarketStreamAdapter {
  protected readonly eventListeners = new Set<EventListener>();
  protected readonly statusListeners = new Set<StatusListener>();
  protected readonly config: MarketIngestionManagerConfig;
  protected reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  protected status: MarketStreamStatus;
  protected maxReconnectAttempts: number;

  constructor(
    public readonly providerId: UnifiedProviderId,
    config?: Partial<MarketIngestionManagerConfig>,
  ) {
    this.config = {
      reconnectMaxAttempts: 20,
      heartbeatIntervalMs: 30_000,
      staleAfterMs: 45_000,
      eventBufferSize: 5_000,
      ...config,
    };
    this.maxReconnectAttempts = this.config.reconnectMaxAttempts;
    this.status = {
      providerId,
      status: 'idle',
      connectedAt: null,
      disconnectedAt: null,
      lastMessageAt: null,
      reconnectAttempts: 0,
      degradedReason: null,
      errorReason: null,
      subscribedSymbols: [],
      activeChannels: [],
    };
  }

  protected setStatus(next: StreamStatus, detail?: string) {
    this.status = {
      ...this.status,
      status: next,
      degradedReason: next === 'degraded' ? detail ?? this.status.degradedReason : null,
      errorReason: next === 'failed' ? detail ?? this.status.errorReason : null,
      connectedAt: next === 'connected' ? nowIso() : this.status.connectedAt,
      disconnectedAt:
        next === 'disconnected' || next === 'failed' ? nowIso() : this.status.disconnectedAt,
    };
    for (const listener of this.statusListeners) listener(this.status);
  }

  protected emit(event: NormalizedMarketStreamEvent) {
    this.status = { ...this.status, lastMessageAt: nowIso() };
    for (const listener of this.eventListeners) listener(event);
  }

  protected scheduleReconnect(reason: string) {
    if (this.status.reconnectAttempts >= this.maxReconnectAttempts) {
      this.setStatus('failed', reason);
      this.emit({
        type: 'provider.error',
        payload: { providerId: this.providerId, at: nowIso(), message: reason },
      });
      return;
    }
    const attempt = this.status.reconnectAttempts + 1;
    const delay = Math.min(30_000, Math.round(500 * Math.pow(1.8, attempt)));
    this.status = { ...this.status, status: 'reconnecting', reconnectAttempts: attempt };
    for (const listener of this.statusListeners) listener(this.status);
    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
      } catch {
        this.scheduleReconnect(reason);
      }
    }, delay);
  }

  async connect(): Promise<void> {
    this.setStatus('connected');
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.setStatus('disconnected');
  }

  async subscribe(symbols: string[], channels: MarketStreamChannel[]): Promise<void> {
    this.status = {
      ...this.status,
      subscribedSymbols: [...new Set([...this.status.subscribedSymbols, ...symbols])],
      activeChannels: [...new Set([...this.status.activeChannels, ...channels])],
    };
    for (const listener of this.statusListeners) listener(this.status);
  }

  async unsubscribe(symbols: string[], channels: MarketStreamChannel[]): Promise<void> {
    this.status = {
      ...this.status,
      subscribedSymbols: this.status.subscribedSymbols.filter((item) => !symbols.includes(item)),
      activeChannels: this.status.activeChannels.filter((item) => !channels.includes(item)),
    };
    for (const listener of this.statusListeners) listener(this.status);
  }

  onEvent(callback: EventListener): () => void {
    this.eventListeners.add(callback);
    return () => this.eventListeners.delete(callback);
  }

  onStatus(callback: StatusListener): () => void {
    this.statusListeners.add(callback);
    callback(this.status);
    return () => this.statusListeners.delete(callback);
  }

  getStatus(): MarketStreamStatus {
    return this.status;
  }

  getCapabilities() {
    return getProviderCapabilities(this.providerId);
  }

  abstract ingestRaw(raw: unknown): void;
}

export class BinanceStreamAdapter extends BaseMarketStreamAdapter {
  constructor(config?: Partial<MarketIngestionManagerConfig>) {
    super('binance', config);
  }

  ingestRaw(raw: any): void {
    try {
      if (raw?.e === '24hrTicker') {
        const tick = mapBinanceTicker(raw);
        if (tick) this.emit({ type: 'market.tick', payload: tick });
      } else if (raw?.e === 'trade') {
        const trade = mapBinanceTrade(raw);
        if (trade) this.emit({ type: 'market.trade', payload: trade });
      } else if (raw?.e === 'depthUpdate') {
        const book = mapBinanceOrderBook(raw);
        if (book) this.emit({ type: 'market.orderbook', payload: book });
      }
    } catch (error) {
      this.setStatus('degraded', 'Binance raw payload mapping failed.');
      this.emit({
        type: 'provider.error',
        payload: { providerId: this.providerId, at: nowIso(), message: String(error) },
      });
    }
  }
}

export class BybitPublicStreamAdapter extends BaseMarketStreamAdapter {
  constructor(config?: Partial<MarketIngestionManagerConfig>) {
    super('bybit', config);
  }

  ingestRaw(raw: any): void {
    try {
      const topic = String(raw?.topic ?? '');
      if (topic.startsWith('tickers.')) {
        const tick = mapBybitTicker(raw);
        if (tick) this.emit({ type: 'market.tick', payload: tick });
      } else if (topic.startsWith('publicTrade.')) {
        const trade = mapBybitTrade(raw);
        if (trade) this.emit({ type: 'market.trade', payload: trade });
      } else if (topic.startsWith('orderbook.')) {
        const book = mapBybitOrderBook(raw);
        if (book) this.emit({ type: 'market.orderbook', payload: book });
      }
    } catch (error) {
      this.setStatus('degraded', 'Bybit payload mapping failed.');
      this.emit({
        type: 'provider.error',
        payload: { providerId: this.providerId, at: nowIso(), message: String(error) },
      });
    }
  }
}

export class OkxPublicStreamAdapter extends BaseMarketStreamAdapter {
  constructor(config?: Partial<MarketIngestionManagerConfig>) {
    super('okx', config);
  }

  ingestRaw(raw: any): void {
    try {
      const channel = String(raw?.arg?.channel ?? '');
      if (channel === 'tickers') {
        const tick = mapOkxTicker(raw);
        if (tick) this.emit({ type: 'market.tick', payload: tick });
      } else if (channel === 'trades') {
        const trade = mapOkxTrade(raw);
        if (trade) this.emit({ type: 'market.trade', payload: trade });
      } else if (channel.startsWith('books')) {
        const book = mapOkxOrderBook(raw);
        if (book) this.emit({ type: 'market.orderbook', payload: book });
      }
    } catch (error) {
      this.setStatus('degraded', 'OKX payload mapping failed.');
      this.emit({
        type: 'provider.error',
        payload: { providerId: this.providerId, at: nowIso(), message: String(error) },
      });
    }
  }
}

export class CoinbasePublicStreamAdapter extends BaseMarketStreamAdapter {
  constructor(config?: Partial<MarketIngestionManagerConfig>) {
    super('coinbase', config);
  }

  ingestRaw(raw: any): void {
    try {
      if (raw?.type === 'ticker') {
        const tick = mapCoinbaseTicker(raw);
        if (tick) this.emit({ type: 'market.tick', payload: tick });
      } else if (raw?.type === 'match' || raw?.type === 'last_match') {
        const trade = mapCoinbaseTrade(raw);
        if (trade) this.emit({ type: 'market.trade', payload: trade });
      } else if (raw?.type === 'l2update') {
        const book = mapCoinbaseOrderBook(raw);
        if (book) this.emit({ type: 'market.orderbook', payload: book });
      } else if (raw?.type === 'heartbeat') {
        this.emit({
          type: 'provider.status',
          payload: {
            providerId: this.providerId,
            status: 'connected',
            at: nowIso(),
            detail: 'heartbeat',
          },
        });
      }
    } catch (error) {
      this.setStatus('degraded', 'Coinbase payload mapping failed.');
      this.emit({
        type: 'provider.error',
        payload: { providerId: this.providerId, at: nowIso(), message: String(error) },
      });
    }
  }
}
