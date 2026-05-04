import { listCatalogAssets } from '@repo/db';
import { deriveNewsImpactExplanation, orchestrateSystemState, type SystemState } from '@repo/ai-market-intelligence';
import { getInvestOverviewData } from './invest-service';
import { getNewsStreamData } from './news-service';
import { getMessages } from '../../lib/i18n/messages';
import { getRequestLocale } from '../i18n/locale';

export type MarketIntelligenceAsset = {
  symbol: string;
  name: string;
  assetClass: 'stock' | 'etf' | 'crypto' | 'index';
  price: number | null;
  changePercent: number | null;
  provider: string;
  freshnessLabel: string;
  compositeScore: number;
  trendScore: number;
  momentumScore: number;
  volatilityScore: number;
  newsImpactScore: number;
  recommendation: 'Buy' | 'Watch' | 'Hold' | 'Avoid' | 'Reduce';
  explanation: string;
};

export type MarketIntelligenceWorkstationModel = {
  assets: MarketIntelligenceAsset[];
  newsBySymbol: Record<string, Array<{
    id: string;
    symbol: string;
    title: string;
    source: string;
    sentiment: number | null;
    impact: number | null;
    publishedAt: string;
    url: string;
  }>>;
  systemState: SystemState;
};

function normalizeAssetClass(value: string): 'stock' | 'etf' | 'crypto' | 'index' | null {
  if (value === 'stock' || value === 'etf' || value === 'crypto' || value === 'index') return value;
  return null;
}

export async function getMarketIntelligenceWorkstationModel(): Promise<MarketIntelligenceWorkstationModel> {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  const [invest, newsStream, catalogAssets] = await Promise.all([
    getInvestOverviewData(locale, messages, { quoteSymbolLimit: 140, includeHistory: true, historySymbolLimit: 80, pageContext: 'markets-intelligence' }),
    getNewsStreamData(),
    listCatalogAssets(),
  ]);

  const investBySymbol = new Map(
    invest.groupedAssets.flatMap((group) => group.items).map((item) => [item.symbol, item]),
  );
  const decisionBySymbol = invest.decisionBySymbol;

  const assets: MarketIntelligenceAsset[] = [];
  for (const asset of catalogAssets) {
    const assetClass = normalizeAssetClass(asset.assetClass);
    if (!assetClass) continue;
    const matched = investBySymbol.get(asset.symbol);
    const decision = decisionBySymbol[asset.symbol];
    const newsImpact = deriveNewsImpactExplanation(asset.symbol, newsStream.items);
    const baseSignal = decision?.signal.score ?? 0;
    const trendScore = Number((baseSignal * 0.5).toFixed(3));
    const momentumScore = Number((baseSignal * 0.35).toFixed(3));
    const volatilityScore = Number((-Math.abs(baseSignal) * 0.25).toFixed(3));

    assets.push({
      symbol: asset.symbol,
      name: asset.name,
      assetClass,
      price: matched?.price ?? null,
      changePercent: matched?.changePercent ?? null,
      provider: invest.dataHealth.provider,
      freshnessLabel: matched?.lastUpdatedAt ? 'Updated' : messages.common.unavailable,
      compositeScore: decision?.signal.score ?? 0,
      trendScore,
      momentumScore,
      volatilityScore,
      newsImpactScore: newsImpact.score,
      recommendation: decision?.recommendation.value ?? 'Watch',
      explanation: `Signals ${(baseSignal * 100).toFixed(0)}%, news ${(newsImpact.score * 100).toFixed(0)}% (${newsImpact.riskFlag}).`,
    });
  }

  const orchestrationInput = assets.map((asset) => ({
    symbol: asset.symbol,
    compositeScore: asset.compositeScore,
    signalBreakdown: {
      trend: asset.trendScore,
      momentum: asset.momentumScore,
      volatility: asset.volatilityScore,
    },
    recommendation: asset.recommendation,
    newsImpact: deriveNewsImpactExplanation(asset.symbol, newsStream.items),
    volatility: Math.abs(asset.volatilityScore),
    liquidity: asset.assetClass === 'stock' ? 0.75 : asset.assetClass === 'etf' ? 0.65 : 0.45,
    providerDegraded: newsStream.providerHealth.some((item) => item.health === 'degraded' || item.health === 'unavailable'),
    degraded: newsStream.degraded,
  }));

  const systemState = orchestrateSystemState({
    assets: orchestrationInput,
    providerHealth: newsStream.providerHealth,
    degraded: newsStream.degraded,
  });

  const newsBySymbol: MarketIntelligenceWorkstationModel['newsBySymbol'] = {};
  for (const asset of assets) {
    const rows = newsStream.items
      .filter((item) => item.symbol === asset.symbol || item.tickers.includes(asset.symbol))
      .sort((a, b) => {
        const left = (b.relevanceScore ?? 0) + (b.impactScore ?? 0);
        const right = (a.relevanceScore ?? 0) + (a.impactScore ?? 0);
        if (Math.abs(left - right) > 0.001) return left - right;
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      })
      .slice(0, 20)
      .map((item) => ({
        id: item.id,
        symbol: item.symbol,
        title: item.title,
        source: item.source,
        sentiment: item.sentimentScore ?? null,
        impact: item.impactScore ?? null,
        publishedAt: item.publishedAt,
        url: item.url,
      }));
    newsBySymbol[asset.symbol] = rows;
  }

  return {
    assets,
    newsBySymbol,
    systemState,
  };
}
