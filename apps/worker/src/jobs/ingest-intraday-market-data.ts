import { detectCanonicalAssetKind, fetchMarketHistory, normalizeMarketSymbol } from '@repo/providers';

const PRIORITY_SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'SPY', 'QQQ', 'BINANCE:BTCUSDT', 'BINANCE:ETHUSDT'] as const;
const CRYPTO_RESOLUTIONS = ['1m', '5m', '60m'] as const;

type IngestIntradayDeps = {
  fetchHistory: typeof fetchMarketHistory;
  log: (payload: Record<string, unknown>) => void;
};

export function createIngestIntradayMarketDataJob(deps: IngestIntradayDeps) {
  return async function ingestIntradayMarketDataJob() {
    let attempted = 0;
    let succeeded = 0;
    let skippedUnsupported = 0;
    let failed = 0;

    for (const raw of PRIORITY_SYMBOLS) {
      const symbol = normalizeMarketSymbol(raw);
      const assetKind = detectCanonicalAssetKind(symbol);

      if (assetKind === 'crypto') {
        for (const resolution of CRYPTO_RESOLUTIONS) {
          attempted += 1;
          try {
            const bars = await deps.fetchHistory({ symbol, resolution });
            if (bars.length > 0) {
              succeeded += 1;
            } else {
              skippedUnsupported += 1;
            }
          } catch {
            failed += 1;
          }
        }
        continue;
      }

      skippedUnsupported += 1;
    }

    deps.log({
      job: 'ingest-intraday-market-data',
      attempted,
      succeeded,
      skippedUnsupported,
      failed,
    });
  };
}

export const ingestIntradayMarketDataJob = createIngestIntradayMarketDataJob({
  fetchHistory: fetchMarketHistory,
  log: (payload) => console.info('[worker] intraday-ingestion', payload),
});

