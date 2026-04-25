import type { BrokerAdapter, BrokerOrderRequest, BrokerOrderResult } from './broker-adapter';

export const stockBrokerAdapter: BrokerAdapter = {
  id: 'stock-broker',
  capabilities: {
    supportsCrypto: false,
    supportsEquities: true,
    supportsETFs: true,
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
      orderId: `stock-stub-${request.symbol}-${Date.now()}`,
      status: 'rejected',
      reason: 'Stock broker live execution is disabled. Use simulation or paper mode.',
    };
  },
};
