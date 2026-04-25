import type { BrokerAdapter, BrokerOrderRequest, BrokerOrderResult } from './broker-adapter';

export const coinbaseAdapter: BrokerAdapter = {
  id: 'coinbase',
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
      orderId: `coinbase-stub-${request.symbol}-${Date.now()}`,
      status: 'rejected',
      reason: 'Coinbase live execution is disabled. Use simulation or paper mode.',
    };
  },
};
