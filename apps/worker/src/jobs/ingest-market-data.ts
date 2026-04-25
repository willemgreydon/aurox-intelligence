import {
  captureSimulationSnapshotsForAllAccounts,
  insertCryptoGlobalMetrics,
  listCatalogAssets,
  replaceMarketHistoryBars,
  updateSimulationObservationHealth,
  upsertMarketAssetProfiles,
  upsertMarketAssets,
  upsertMarketQuoteSnapshots,
} from '@repo/db';
import {
  detectCanonicalAssetKind,
  fetchAssetMetadata,
  fetchCryptoGlobalMetrics,
  fetchMarketHistory,
  fetchMarketSnapshot,
  getHistoryPrioritySymbols,
  getLiveCandidateSymbols,
  getMarketSymbols,
  getSimulationSymbols,
  normalizeMarketSymbol,
} from '@repo/providers';
import { env } from '../env.js';

type AssetClass = 'stock' | 'etf' | 'index' | 'crypto' | 'fx' | 'unknown';

function uniqueSymbols(values: string[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const raw of values) {
    const normalized = normalizeMarketSymbol(raw);

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    ordered.push(normalized);
  }

  return ordered;
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

async function runBatched<T, R>(
  items: T[],
  batchSize: number,
  worker: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = [];

  for (const chunk of chunkArray(items, batchSize)) {
    const settled = await Promise.allSettled(chunk.map(worker));
    results.push(...settled);
  }

  return results;
}

function inferAssetClass(symbol: string): AssetClass {
  const kind = detectCanonicalAssetKind(symbol);

  switch (kind) {
    case 'stock':
    case 'etf':
    case 'index':
    case 'crypto':
    case 'fx':
      return kind;
    default:
      return 'unknown';
  }
}

function defaultNameFromSymbol(symbol: string) {
  if (symbol.startsWith('BINANCE:')) {
    const pair = symbol.slice('BINANCE:'.length);
    return `${pair} spot pair`;
  }

  if (symbol.startsWith('OANDA:')) {
    return `${symbol.slice('OANDA:'.length).replace('_', '/')} FX pair`;
  }

  return symbol;
}

function defaultCategoryForAssetClass(assetClass: AssetClass) {
  switch (assetClass) {
    case 'stock':
      return 'Provider-seeded equity';
    case 'etf':
      return 'Provider-seeded ETF';
    case 'crypto':
      return 'Provider-seeded crypto';
    case 'index':
      return 'Provider-seeded index';
    case 'fx':
      return 'Provider-seeded FX';
    default:
      return 'Provider-seeded asset';
  }
}

function defaultThesisForAssetClass(assetClass: AssetClass, symbol: string, name: string) {
  switch (assetClass) {
    case 'stock':
      return `${name} (${symbol}) is monitored as a liquid equity candidate for analytics, simulation, and future gated live execution paths.`;
    case 'etf':
      return `${name} (${symbol}) is monitored as a diversified ETF candidate for analytics, simulation, and future gated live execution paths.`;
    case 'crypto':
      return `${name} (${symbol}) is monitored as a digital asset candidate for analytics, simulation, and future gated live execution paths.`;
    case 'index':
      return `${name} (${symbol}) is monitored as a benchmark index for market regime awareness and cross-asset intelligence.`;
    case 'fx':
      return `${name} (${symbol}) is monitored as a foreign-exchange benchmark for macro and cross-asset intelligence.`;
    default:
      return `${name} (${symbol}) is monitored as a provider-backed market asset.`;
  }
}

function defaultRiskSummaryForAssetClass(assetClass: AssetClass) {
  switch (assetClass) {
    case 'stock':
      return 'Equity exposure can reprice quickly on earnings, sentiment, and macro surprises.';
    case 'etf':
      return 'ETF exposure can still face broad market drawdowns, factor rotation, and liquidity stress.';
    case 'crypto':
      return 'Crypto exposure can face sharp volatility, liquidity gaps, and regime-changing policy headlines.';
    case 'index':
      return 'Index benchmarks reflect regime change but may not be directly executable in every trading mode.';
    case 'fx':
      return 'FX benchmarks reflect macro, rate, policy, and liquidity regime changes.';
    default:
      return 'Market conditions can change quickly and widen drawdowns during stressed regimes.';
  }
}

function isSimulationTradable(assetClass: AssetClass) {
  return assetClass === 'stock' || assetClass === 'etf' || assetClass === 'crypto';
}

function buildSeedAssetInput(symbol: string) {
  const normalizedSymbol = normalizeMarketSymbol(symbol);
  const assetClass = inferAssetClass(normalizedSymbol);
  const name = defaultNameFromSymbol(normalizedSymbol);

  return {
    symbol: normalizedSymbol,
    name,
    assetClass: assetClass === 'unknown' ? 'stock' : assetClass,
    category: defaultCategoryForAssetClass(assetClass),
    geography: assetClass === 'crypto' ? 'Global' : null,
    sector: null,
    thesis: defaultThesisForAssetClass(assetClass, normalizedSymbol, name),
    riskSummary: defaultRiskSummaryForAssetClass(assetClass),
    actionAvailability: isSimulationTradable(assetClass) ? 'simulated' : 'unavailable',
    isSimulated: isSimulationTradable(assetClass),
    isTradable: isSimulationTradable(assetClass),
  } as const;
}

function buildTrackedSymbols(catalogSymbols: string[]) {
  return uniqueSymbols([
    ...catalogSymbols,
    ...getMarketSymbols(env.MARKET_DATA_PROVIDER),
    ...getSimulationSymbols(),
    ...getLiveCandidateSymbols(),
  ]);
}

function buildHistoryTargets(trackedSymbols: string[]) {
  const priority = getHistoryPrioritySymbols();
  const merged = uniqueSymbols([...priority, ...trackedSymbols]);

  return merged.filter((symbol) => {
    const kind = detectCanonicalAssetKind(symbol);
    return kind === 'stock' || kind === 'etf' || kind === 'crypto' || kind === 'index';
  });
}

function buildMetadataTargets(trackedSymbols: string[]) {
  return trackedSymbols.filter((symbol) => {
    const kind = detectCanonicalAssetKind(symbol);
    return kind === 'stock' || kind === 'etf' || kind === 'crypto';
  });
}

export async function ingestMarketDataJob() {
  const initialCatalog = await listCatalogAssets();
  const initialCatalogSymbols = initialCatalog.map((asset) => normalizeMarketSymbol(asset.symbol));
  const trackedSymbols = buildTrackedSymbols(initialCatalogSymbols);

  await upsertMarketAssets(trackedSymbols.map(buildSeedAssetInput));

  const catalog = await listCatalogAssets();
  const normalizedCatalog = catalog.map((asset) => ({
    ...asset,
    symbol: normalizeMarketSymbol(asset.symbol),
  }));

  const assetIdBySymbol = new Map(normalizedCatalog.map((asset) => [asset.symbol, asset.assetId]));
  const historyTargets = buildHistoryTargets(trackedSymbols);
  const metadataTargets = buildMetadataTargets(trackedSymbols);

  const observations = await fetchMarketSnapshot({
    symbols: trackedSymbols,
  });

  await upsertMarketQuoteSnapshots(
    observations.map((item) => {
      const normalizedSymbol = normalizeMarketSymbol(item.symbol);

      return {
        symbol: normalizedSymbol,
        assetId: assetIdBySymbol.get(normalizedSymbol) ?? null,
        price: item.price ?? null,
        change: item.change ?? null,
        changePercent: item.changePercent ?? null,
        source: item.source,
        observedAt: item.timestamp ?? null,
      };
    }),
  );

  const historyResults = await runBatched(historyTargets, 4, async (symbol) => {
    const history = await fetchMarketHistory({ symbol }).catch(() => []);

    if (history.length === 0) {
      return {
        symbol,
        count: 0,
      };
    }

    await replaceMarketHistoryBars(
      symbol,
      history.map((bar) => ({
        symbol: normalizeMarketSymbol(bar.symbol),
        timestamp: bar.timestamp,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume ?? null,
        source: bar.source,
      })),
    );

    return {
      symbol,
      count: history.length,
    };
  });

  const metadataResults = await runBatched(metadataTargets, 6, async (symbol) => {
    const metadata = await fetchAssetMetadata({ symbol });

    return {
      symbol: normalizeMarketSymbol(metadata.symbol),
      assetId: assetIdBySymbol.get(normalizeMarketSymbol(metadata.symbol)) ?? null,
      assetClass: metadata.assetKind,
      name: metadata.name,
      exchange: metadata.exchange ?? null,
      currency: metadata.currency ?? null,
      description: metadata.description ?? null,
      sector: metadata.sector ?? null,
      industry: metadata.industry ?? null,
      country: metadata.country ?? null,
      websiteUrl: metadata.website ?? null,
      logoUrl: metadata.logoUrl ?? null,
      marketCap: metadata.marketCap ?? null,
      source: metadata.source,
      updatedAt: metadata.updatedAt,
    };
  });

  const fulfilledMetadata = metadataResults.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));

  await upsertMarketAssetProfiles(fulfilledMetadata);

  await upsertMarketAssets(
    fulfilledMetadata.map((profile) => ({
      assetId: profile.assetId ?? undefined,
      symbol: profile.symbol,
      name: profile.name,
      assetClass: profile.assetClass,
      category:
        profile.assetClass === 'stock'
          ? profile.sector ? `${profile.sector} equity` : 'Provider-enriched equity'
          : profile.assetClass === 'etf'
            ? 'Provider-enriched ETF'
            : 'Provider-enriched crypto',
      geography: profile.country ?? (profile.assetClass === 'crypto' ? 'Global' : null),
      sector: profile.sector ?? null,
      thesis: `${profile.name} (${profile.symbol}) is tracked with provider-backed metadata for market intelligence, simulation workflows, and future gated live execution paths.`,
      riskSummary:
        profile.assetClass === 'crypto'
          ? 'Crypto exposure can face sharp volatility, liquidity gaps, and regime-changing policy headlines.'
          : profile.assetClass === 'etf'
            ? 'ETF exposure can still face broad market drawdowns, factor rotation, and liquidity stress.'
            : 'Equity exposure can reprice quickly on earnings, sentiment, and macro surprises.',
      actionAvailability: 'simulated',
      isSimulated: true,
      isTradable: true,
    })),
  );

  const cryptoGlobalMetrics = await fetchCryptoGlobalMetrics().catch(() => null);

  if (cryptoGlobalMetrics) {
    await insertCryptoGlobalMetrics({
      observedAt: cryptoGlobalMetrics.observedAt,
      activeCryptocurrencies: cryptoGlobalMetrics.activeCryptocurrencies,
      markets: cryptoGlobalMetrics.markets,
      totalMarketCapUsd: cryptoGlobalMetrics.totalMarketCapUsd,
      totalVolume24hUsd: cryptoGlobalMetrics.totalVolume24hUsd,
      bitcoinDominancePercent: cryptoGlobalMetrics.bitcoinDominancePercent,
      ethereumDominancePercent: cryptoGlobalMetrics.ethereumDominancePercent,
      marketCapChange24hPercent: cryptoGlobalMetrics.marketCapChange24hPercent,
      source: cryptoGlobalMetrics.source,
    });
  }

  const refreshedAccounts = await captureSimulationSnapshotsForAllAccounts().catch(() => 0);
  const refreshedSessionHealth = await updateSimulationObservationHealth().catch(() => 0);

  const summary = observations.reduce<Record<AssetClass, number>>(
    (accumulator, item) => {
      const assetClass = inferAssetClass(item.symbol);
      accumulator[assetClass] = (accumulator[assetClass] ?? 0) + 1;
      return accumulator;
    },
    {
      stock: 0,
      etf: 0,
      index: 0,
      crypto: 0,
      fx: 0,
      unknown: 0,
    },
  );

  const latestTimestamp =
    observations
      .map((item) => item.timestamp ?? null)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? null;

  const successfulHistories = historyResults.filter(
    (result): result is PromiseFulfilledResult<{ symbol: string; count: number }> =>
      result.status === 'fulfilled' && result.value.count > 0,
  ).length;

  return {
    ok: true,
    job: 'ingest-market-data',
    preferredProvider: env.MARKET_DATA_PROVIDER,
    catalogSymbols: initialCatalogSymbols.length,
    requestedSymbols: trackedSymbols.length,
    historyTargets: historyTargets.length,
    metadataTargets: metadataTargets.length,
    receivedObservations: observations.length,
    refreshedProfiles: fulfilledMetadata.length,
    refreshedHistories: successfulHistories,
    refreshedCryptoMetrics: Boolean(cryptoGlobalMetrics),
    refreshedAccounts,
    refreshedSessionHealth,
    latestTimestamp,
    summary,
    observations,
  };
}
