import { getProviderHealthStatuses, resolveProvidersForRead } from './provider-registry';
import { detectCanonicalAssetKind, normalizeMarketSymbol } from './provider-symbols';
export function detectAssetKind(symbol) {
    return detectCanonicalAssetKind(symbol);
}
function withPreferred(providers, preferred) {
    if (!preferred) {
        return providers;
    }
    const withoutPreferred = providers.filter((provider) => provider !== preferred);
    return [preferred, ...withoutPreferred];
}
export function getQuoteProviderChain(symbol, preferred) {
    const kind = detectCanonicalAssetKind(symbol);
    const normalized = normalizeMarketSymbol(symbol);
    return withPreferred(resolveProvidersForRead('quote', kind, normalized), preferred);
}
export function getHistoryProviderChain(symbol, preferred) {
    const kind = detectCanonicalAssetKind(symbol);
    const normalized = normalizeMarketSymbol(symbol);
    return withPreferred(resolveProvidersForRead('history', kind, normalized), preferred);
}
export function getMetadataProviderChain(symbol, preferred) {
    const kind = detectCanonicalAssetKind(symbol);
    const normalized = normalizeMarketSymbol(symbol);
    return withPreferred(resolveProvidersForRead('metadata', kind, normalized), preferred);
}
export function getCryptoGlobalProviderChain(preferred) {
    return withPreferred(resolveProvidersForRead('crypto-global', 'crypto', null), preferred);
}
export function getProviderHealthStatusesSnapshot() {
    return getProviderHealthStatuses();
}
