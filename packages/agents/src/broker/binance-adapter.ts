import type { BrokerAdapter, BrokerOrderRequest, BrokerOrderResult } from './broker-adapter';

export const binanceAdapter: BrokerAdapter = {
  id: 'binance',
  capabilities: {
    supportsCrypto: true,
    supportsEquities: false,
    supportsETFs: false,
    supportsMarketOrders: true,
    supportsLimitOrders: true,
    supportsPaperTrading: true,
    supportsLiveTrading: false,
  },
  getCapabilities() {
    return this.capabilities;
  },
  async placeOrder(request: BrokerOrderRequest): Promise<BrokerOrderResult> {
    return {
      accepted: false,
      orderId: `binance-stub-${request.symbol}-${Date.now()}`,
      status: 'rejected',
      reason: 'Binance live execution is disabled. Use simulation or paper mode.',
    };
  },
};
