import type { BrokerAdapter } from './broker-adapter';
import { binanceAdapter } from './binance-adapter';
import { coinbaseAdapter } from './coinbase-adapter';
import { stockBrokerAdapter } from './stock-broker-adapter';

const BROKER_ADAPTERS: readonly BrokerAdapter[] = [binanceAdapter, coinbaseAdapter, stockBrokerAdapter];

export function listBrokerAdapters(): readonly BrokerAdapter[] {
  return BROKER_ADAPTERS;
}

export function getBrokerAdapter(id: string): BrokerAdapter | null {
  return BROKER_ADAPTERS.find((adapter) => adapter.id === id) ?? null;
}
