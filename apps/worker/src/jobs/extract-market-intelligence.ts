import * as aiMarketIntelligence from '@repo/ai-market-intelligence';
import { saveMarketIntelligenceBatch } from '@repo/db';
import { fetchMarketSnapshot } from '@repo/providers';
import { env } from '../env.js';

const intelligenceSymbols = ['AAPL', 'MSFT', 'NVDA', 'SPY', 'BINANCE:BTCUSDT'] as const;

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

  const deriveDigest = aiMarketIntelligence.deriveMarketIntelligenceDigest;
  if (typeof deriveDigest !== 'function') {
    throw new Error('deriveMarketIntelligenceDigest export is unavailable. Rebuild @repo/ai-market-intelligence.');
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
