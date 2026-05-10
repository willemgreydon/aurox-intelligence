import type {
  FundingRateEvent,
  LiquidationEvent,
  MarketTick,
  OrderBookUpdate,
  TradeEvent,
} from './contracts';
import type { ProviderCapabilities, UnifiedProviderId } from './capabilities';

export type StreamStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'degraded'
  | 'disconnected'
  | 'failed';

export type MarketStreamChannel =
  | 'ticker'
  | 'trades'
  | 'orderbook'
  | 'funding'
  | 'liquidation'
  | 'candles'
  | 'heartbeat';

export type MarketStreamStatus = {
  providerId: UnifiedProviderId;
  status: StreamStatus;
  connectedAt: string | null;
  disconnectedAt: string | null;
  lastMessageAt: string | null;
  reconnectAttempts: number;
  degradedReason: string | null;
  errorReason: string | null;
  subscribedSymbols: string[];
  activeChannels: MarketStreamChannel[];
};

export type ProviderStatusEvent = {
  providerId: UnifiedProviderId;
  status: StreamStatus;
  at: string;
  detail?: string;
};

export type ProviderErrorEvent = {
  providerId: UnifiedProviderId;
  at: string;
  message: string;
};

export type NormalizedMarketStreamEvent =
  | { type: 'market.tick'; payload: MarketTick }
  | { type: 'market.trade'; payload: TradeEvent }
  | { type: 'market.orderbook'; payload: OrderBookUpdate }
  | { type: 'market.funding'; payload: FundingRateEvent }
  | { type: 'market.liquidation'; payload: LiquidationEvent }
  | { type: 'provider.status'; payload: ProviderStatusEvent }
  | { type: 'provider.error'; payload: ProviderErrorEvent };

export type MarketStreamAdapter = {
  providerId: UnifiedProviderId;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  subscribe(symbols: string[], channels: MarketStreamChannel[]): Promise<void>;
  unsubscribe(symbols: string[], channels: MarketStreamChannel[]): Promise<void>;
  onEvent(callback: (event: NormalizedMarketStreamEvent) => void): () => void;
  onStatus(callback: (status: MarketStreamStatus) => void): () => void;
  getStatus(): MarketStreamStatus;
  getCapabilities(): ProviderCapabilities;
};

export type MarketIngestionManagerConfig = {
  reconnectMaxAttempts: number;
  heartbeatIntervalMs: number;
  staleAfterMs: number;
  eventBufferSize: number;
};

export type IngestionProviderPriorityProfile = {
  cryptoLive: UnifiedProviderId[];
  derivativesOrderflow: UnifiedProviderId[];
  usSpotReference: UnifiedProviderId[];
  stocksEtf: UnifiedProviderId[];
  historical: UnifiedProviderId[];
};
