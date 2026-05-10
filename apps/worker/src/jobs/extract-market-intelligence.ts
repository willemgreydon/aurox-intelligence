import * as aiMarketIntelligence from '@repo/ai-market-intelligence';
import { saveMarketIntelligenceBatch } from '@repo/db';
import { fetchMarketSnapshot } from '@repo/providers';
import { env } from '../env.js';

const intelligenceSymbols = ['AAPL', 'MSFT', 'NVDA', 'SPY', 'BINANCE:BTCUSDT'] as const;

type DigestFn = typeof aiMarketIntelligence.deriveMarketIntelligenceDigest;

function resolveDigestDeriver(): DigestFn | null {
  const named = aiMarketIntelligence.deriveMarketIntelligenceDigest;
  if (typeof named === 'function') {
    return named;
  }

  const nested = (aiMarketIntelligence as { default?: { deriveMarketIntelligenceDigest?: unknown } }).default?.deriveMarketIntelligenceDigest;
  if (typeof nested === 'function') {
    return nested as DigestFn;
  }

  return null;
}

export async function extractMarketIntelligenceJob() {
  const observations = await fetchMarketSnapshot({
    symbols: [...intelligenceSymbols],
  });

  const assetInputs = observations.map((item) => ({
    assetId: `asset-${item.symbol.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    symbol: item.symbol,
    price: item.price,
    changePercent: item.changePercent ?? null,
    forecastBias: null,
    freshnessState: item.timestamp ? ('live' as const) : ('partial' as const),
    sourceSummary: `${(item.source ?? env.MARKET_DATA_PROVIDER).toUpperCase()} market context`,
  }));

  const deriveDigest = resolveDigestDeriver();
  if (typeof deriveDigest !== 'function') {
    console.error('[worker] deriveMarketIntelligenceDigest export unavailable in @repo/ai-market-intelligence. Skipping persistence for this cycle.');
    return {
      ok: false,
      job: 'extract-market-intelligence',
      preferredProvider: env.MARKET_DATA_PROVIDER,
      requestedSymbols: intelligenceSymbols.length,
      receivedObservations: observations.length,
      persistedInsights: 0,
      persistence: {
        ok: false,
        persisted: false,
        count: 0,
        detail: 'Digest derivation unavailable; skipping persistence for this cycle.',
      },
      digest: null,
      reason: 'deriveMarketIntelligenceDigest export unavailable',
    };
  }

  const digest = deriveDigest(
    'Worker market intelligence digest',
    assetInputs,
    observations.length > 0 ? 'live' : 'unavailable',
  );

  const persistence = await saveMarketIntelligenceBatch(digest.assetInsights);

  return {
    ok: true,
    job: 'extract-market-intelligence',
    preferredProvider: env.MARKET_DATA_PROVIDER,
    requestedSymbols: intelligenceSymbols.length,
    receivedObservations: observations.length,
    persistedInsights: digest.assetInsights.length,
    persistence,
    digest,
  };
}
