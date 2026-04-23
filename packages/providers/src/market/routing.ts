import type { MarketDataProvider } from '../config';
import { getProviderHealthStatuses, resolveProvidersForRead } from './provider-registry';
import { detectCanonicalAssetKind, normalizeMarketSymbol } from './provider-symbols';
import type { MarketAssetKind, ProviderHealthStatus } from './types';

export function detectAssetKind(symbol: string): MarketAssetKind {
  return detectCanonicalAssetKind(symbol);
}

function withPreferred(
  providers: MarketDataProvider[],
  preferred?: MarketDataProvider,
): MarketDataProvider[] {
  if (!preferred) {
    return providers;
  }

  const withoutPreferred = providers.filter((provider) => provider !== preferred);
  return [preferred, ...withoutPreferred];
}

export function getQuoteProviderChain(symbol: string, preferred?: MarketDataProvider): MarketDataProvider[] {
  const kind = detectCanonicalAssetKind(symbol);
  const normalized = normalizeMarketSymbol(symbol);
  return withPreferred(resolveProvidersForRead('quote', kind, normalized), preferred);
}

export function getHistoryProviderChain(symbol: string, preferred?: MarketDataProvider): MarketDataProvider[] {
  const kind = detectCanonicalAssetKind(symbol);
  const normalized = normalizeMarketSymbol(symbol);
  return withPreferred(resolveProvidersForRead('history', kind, normalized), preferred);
}

export function getMetadataProviderChain(symbol: string, preferred?: MarketDataProvider): MarketDataProvider[] {
  const kind = detectCanonicalAssetKind(symbol);
  const normalized = normalizeMarketSymbol(symbol);
  return withPreferred(resolveProvidersForRead('metadata', kind, normalized), preferred);
}

export function getCryptoGlobalProviderChain(preferred?: MarketDataProvider): MarketDataProvider[] {
  return withPreferred(resolveProvidersForRead('crypto-global', 'crypto', null), preferred);
}

export function getProviderHealthStatusesSnapshot(): ProviderHealthStatus[] {
  return getProviderHealthStatuses();
}