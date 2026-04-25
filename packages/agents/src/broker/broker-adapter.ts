export type BrokerAssetClass = 'stock' | 'etf' | 'crypto';

export interface BrokerAdapterCapabilities {
  readonly supportsCrypto: boolean;
  readonly supportsEquities: boolean;
  readonly supportsETFs: boolean;
  readonly supportsMarketOrders: boolean;
  readonly supportsLimitOrders: boolean;
  readonly supportsPaperTrading: boolean;
  readonly supportsLiveTrading: boolean;
}

export interface BrokerOrderRequest {
  readonly symbol: string;
  readonly assetClass: BrokerAssetClass;
  readonly side: 'buy' | 'sell';
  readonly quantity: number;
  readonly orderType: 'market' | 'limit';
  readonly limitPrice?: number;
  readonly mode: 'simulation' | 'paper' | 'live';
}

export interface BrokerOrderResult {
  readonly accepted: boolean;
  readonly orderId: string;
  readonly status: 'accepted' | 'rejected';
  readonly reason?: string;
}

export interface BrokerAdapter {
  readonly id: string;
  readonly capabilities: BrokerAdapterCapabilities;
  getCapabilities(): BrokerAdapterCapabilities;
  placeOrder(request: BrokerOrderRequest): Promise<BrokerOrderResult>;
}
