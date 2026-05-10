import type { MarketDataProvider } from '../config';
import {
  fetchCoinGeckoGlobalMetrics,
  fetchCoinGeckoHistory,
  fetchCoinGeckoMetadata,
  fetchCoinGeckoQuote,
} from './providers/coingecko';
import { fetchEodhdHistory, fetchEodhdQuote, fetchFinnhubHistory, fetchFinnhubQuote } from './providers/legacy';
import { fetchPolygonHistory, fetchPolygonMetadata, fetchPolygonQuote } from './providers/polygon';
import { fetchBinanceHistory, fetchBinanceQuote } from './providers/binance';
import { fetchTiingoMetadata } from './providers/tiingo';
import { fetchTwelveDataHistory, fetchTwelveDataQuote } from './providers/twelve-data';
import { normalizeProviderError, toProviderError } from './errors';
import { recordProviderFailure, recordProviderSuccess } from './provider-registry';
import {
  getCryptoGlobalProviderChain,
  getHistoryProviderChain,
  getMetadataProviderChain,
  getProviderHealthStatusesSnapshot,
  getQuoteProviderChain,
} from './routing';
import type {
  AssetMetadata,
  CryptoGlobalMetrics,
  FetchAssetMetadataOptions,
  FetchCryptoGlobalMetricsOptions,
  FetchMarketHistoryOptions,
  FetchMarketSnapshotOptions,
  HistoricalBar,
  MarketHistoryResolution,
  MarketQuote,
  ProviderHealthStatus,
  ProviderMarketHistoryPoint,
  ProviderMarketObservation,
  ProviderReadResult,
  ProviderSelectionResult,
} from './types';

const SNAPSHOT_BATCH_SIZE = 4;

async function fetchQuoteFromProvider(provider: MarketDataProvider, symbol: string): Promise<MarketQuote> {
  switch (provider) {
    case 'binance':
      return fetchBinanceQuote(symbol);
    case 'polygon':
      return fetchPolygonQuote(symbol);
    case 'twelve-data':
      return fetchTwelveDataQuote(symbol);
    case 'coingecko':
      return fetchCoinGeckoQuote(symbol);
    case 'finnhub':
      return fetchFinnhubQuote(symbol);
    case 'eodhd':
      return fetchEodhdQuote(symbol);
    case 'tiingo':
      throw new Error('Tiingo is not configured for quote reads.');
    default:
      throw new Error(`Unsupported quote provider ${provider satisfies never}.`);
  }
}

async function fetchHistoryFromProvider(
  provider: MarketDataProvider,
  symbol: string,
  resolution: MarketHistoryResolution,
  from?: string,
  to?: string,
): Promise<HistoricalBar[]> {
  switch (provider) {
    case 'binance':
      return fetchBinanceHistory(symbol, resolution, from, to);
    case 'polygon':
      return fetchPolygonHistory(symbol, from, to, resolution);
    case 'twelve-data':
      return fetchTwelveDataHistory(symbol, from, to, resolution);
    case 'coingecko':
      return fetchCoinGeckoHistory(symbol, resolution);
    case 'finnhub':
      return fetchFinnhubHistory(symbol, from, to, resolution);
    case 'eodhd':
      return fetchEodhdHistory(symbol, from, to, resolution);
    case 'tiingo':
      throw new Error('Tiingo is not configured for history reads.');
    default:
      throw new Error(`Unsupported history provider ${provider satisfies never}.`);
  }
}

async function fetchMetadataFromProvider(provider: MarketDataProvider, symbol: string): Promise<AssetMetadata> {
  switch (provider) {
    case 'polygon':
      return fetchPolygonMetadata(symbol);
    case 'tiingo':
      return fetchTiingoMetadata(symbol);
    case 'coingecko':
      return fetchCoinGeckoMetadata(symbol);
    case 'twelve-data':
    case 'finnhub':
    case 'eodhd':
    case 'binance':
      throw new Error(`${provider} is not configured for metadata reads.`);
    default:
      throw new Error(`Unsupported metadata provider ${provider satisfies never}.`);
  }
}

function buildSelection(
  kind: ProviderSelectionResult['kind'],
  symbol: string | null,
  attemptedProviders: MarketDataProvider[],
  selectedProvider: MarketDataProvider | null,
  errors: ReturnType<typeof toProviderError>[],
): ProviderSelectionResult {
  return {
    kind,
    symbol,
    attemptedProviders,
    selectedProvider,
    fallbackUsed: selectedProvider !== null && attemptedProviders[0] !== selectedProvider,
    staleCacheEligible: true,
    errors,
  };
}

async function timedRead<T>(
  provider: MarketDataProvider,
  reader: () => Promise<T>,
): Promise<T> {
  const startedAt = Date.now();

  try {
    const data = await reader();
    recordProviderSuccess(provider, Date.now() - startedAt);
    return data;
  } catch (error) {
    recordProviderFailure(provider, Date.now() - startedAt);
    throw error;
  }
}

async function readWithFallback<T>(
  kind: ProviderSelectionResult['kind'],
  symbol: string | null,
  providers: MarketDataProvider[],
  reader: (provider: MarketDataProvider) => Promise<T>,
): Promise<ProviderReadResult<T>> {
  const attemptedProviders: MarketDataProvider[] = [];
  const errors: ReturnType<typeof toProviderError>[] = [];

  for (const provider of providers) {
    attemptedProviders.push(provider);

    try {
      const data = await timedRead(provider, () => reader(provider));

      return {
        data,
        selection: buildSelection(kind, symbol, attemptedProviders, provider, errors),
      };
    } catch (error) {
      errors.push(toProviderError(normalizeProviderError(provider, error)));
    }
  }

  throw Object.assign(new Error(`No ${kind} provider succeeded for ${symbol ?? 'requested data'}.`), {
    selection: buildSelection(kind, symbol, attemptedProviders, null, errors),
  });
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

export async function readMarketQuote(
  symbol: string,
  provider?: MarketDataProvider,
): Promise<ProviderReadResult<MarketQuote>> {
  return readWithFallback('quote', symbol, getQuoteProviderChain(symbol, provider), (selectedProvider) =>
    fetchQuoteFromProvider(selectedProvider, symbol),
  );
}

export async function readMarketHistory(
  symbol: string,
  from?: string,
  to?: string,
  provider?: MarketDataProvider,
  resolution: MarketHistoryResolution = '1d',
): Promise<ProviderReadResult<HistoricalBar[]>> {
  return readWithFallback('history', symbol, getHistoryProviderChain(symbol, provider), (selectedProvider) =>
    fetchHistoryFromProvider(selectedProvider, symbol, resolution, from, to),
  );
}

export async function readAssetMetadata(
  symbol: string,
  provider?: MarketDataProvider,
): Promise<ProviderReadResult<AssetMetadata>> {
  return readWithFallback('metadata', symbol, getMetadataProviderChain(symbol, provider), (selectedProvider) =>
    fetchMetadataFromProvider(selectedProvider, symbol),
  );
}

export async function readCryptoGlobalMetrics(
  provider?: MarketDataProvider,
): Promise<ProviderReadResult<CryptoGlobalMetrics>> {
  return readWithFallback('crypto-global', null, getCryptoGlobalProviderChain(provider), () =>
    fetchCoinGeckoGlobalMetrics(),
  );
}

export async function fetchMarketSnapshot(
  options: FetchMarketSnapshotOptions = {},
): Promise<ProviderMarketObservation[]> {
  const symbols = [...new Set((options.symbols ?? []).map((symbol) => symbol.trim()).filter(Boolean))];

  if (symbols.length === 0) {
    return [];
  }

  const chunks = chunkArray(symbols, SNAPSHOT_BATCH_SIZE);
  const collected: ProviderMarketObservation[] = [];

  for (const chunk of chunks) {
    const results = await Promise.allSettled(chunk.map((symbol) => readMarketQuote(symbol, options.provider)));

    for (const result of results) {
      if (result.status === 'fulfilled') {
        collected.push(result.value.data);
      }
    }
  }

  return collected;
}

export async function fetchMarketHistory(
  options: FetchMarketHistoryOptions,
): Promise<ProviderMarketHistoryPoint[]> {
  const result = await readMarketHistory(
    options.symbol,
    options.from,
    options.to,
    options.provider,
    options.resolution ?? '1d',
  );
  return result.data;
}

export async function fetchAssetMetadata(options: FetchAssetMetadataOptions): Promise<AssetMetadata> {
  const result = await readAssetMetadata(options.symbol, options.provider);
  return result.data;
}

export async function fetchCryptoGlobalMetrics(
  options: FetchCryptoGlobalMetricsOptions = {},
): Promise<CryptoGlobalMetrics> {
  const result = await readCryptoGlobalMetrics(options.provider);
  return result.data;
}

export function getProviderHealthStatus(): ProviderHealthStatus[] {
  return getProviderHealthStatusesSnapshot();
}
