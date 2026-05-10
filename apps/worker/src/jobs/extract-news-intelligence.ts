import { buildContentHash, extractNewsIntelligenceSnapshot } from '@repo/ai-market-intelligence';
import { fetchNewsStream } from '@repo/providers';
import {
  insertNewsAssetLinks,
  listCatalogAssets,
  upsertNewsArticles,
  upsertNewsSnapshots,
} from '@repo/db';
import type { NewsArticleNormalized } from '@repo/api-contracts';

function normalizeAssetClass(value: string): 'stock' | 'etf' | 'crypto' | 'macro' | 'other' {
  if (value === 'stock' || value === 'etf' || value === 'crypto' || value === 'macro') return value;
  return 'other';
}

export async function extractNewsIntelligenceJob() {
  const assets = await listCatalogAssets();
  const symbols = [...new Set(assets.slice(0, 60).map((asset) => asset.symbol.toUpperCase()))];
  const stream = await fetchNewsStream({
    symbols,
    fromIso: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    toIso: new Date().toISOString(),
    maxItemsPerSymbol: 3,
  }).catch(() => ({ items: [], providerHealth: [], updatedAt: new Date().toISOString(), degraded: true }));

  const assetIdBySymbol = new Map(assets.map((asset) => [asset.symbol.toUpperCase(), asset.assetId]));
  const normalized = stream.items.map((item): NewsArticleNormalized => {
    const itemSymbols = [...new Set([item.symbol, ...(item.symbols ?? []), ...(item.tickers ?? [])].map((s) => s.toUpperCase()).filter(Boolean))];
    const itemAssetIds = itemSymbols.map((symbol) => assetIdBySymbol.get(symbol)).filter((id): id is string => Boolean(id));
    return {
      id: item.id,
      provider: item.provider,
      providerArticleId: item.id.includes(':') ? item.id.split(':').slice(1).join(':') : null,
      title: item.title,
      url: item.url,
      sourceName: item.source,
      publishedAt: item.publishedAt,
      fetchedAt: new Date().toISOString(),
      symbols: itemSymbols,
      assetIds: itemAssetIds,
      assetClasses: itemSymbols.map(() => normalizeAssetClass(item.assetClass ?? 'other')),
      language: item.language ?? null,
      summary: item.summary ?? null,
      contentHash: buildContentHash({ title: item.title, url: item.url, sourceName: item.source, publishedAt: item.publishedAt }),
      rawMetadata: { categories: item.categories, riskTags: item.riskTags, extractedEntities: item.extractedEntities },
    };
  });

  const deduped = [...new Map(normalized.map((article) => [article.contentHash, article])).values()];
  const upsertedArticles = await upsertNewsArticles(
    deduped.map((article) => ({
      provider: article.provider,
      providerArticleId: article.providerArticleId,
      title: article.title,
      url: article.url,
      sourceName: article.sourceName,
      publishedAt: article.publishedAt,
      fetchedAt: article.fetchedAt,
      language: article.language,
      summary: article.summary,
      contentHash: article.contentHash,
      rawMetadata: article.rawMetadata ?? {},
    })),
  );

  const byHash = new Map(upsertedArticles.map((article) => [article.contentHash, article]));
  const snapshots = [];
  let failed = 0;
  for (const article of deduped) {
    const persisted = byHash.get(article.contentHash);
    if (!persisted) continue;
    try {
      const snapshot = extractNewsIntelligenceSnapshot({
        article: { ...article, id: persisted.id },
        assets: article.symbols
          .map((symbol) => {
            const asset = assets.find((row) => row.symbol.toUpperCase() === symbol);
            return asset ? { assetId: asset.assetId, symbol, assetClass: normalizeAssetClass(asset.assetClass) } : null;
          })
          .filter((row): row is NonNullable<typeof row> => Boolean(row)),
      });
      snapshots.push({
        articleId: snapshot.articleId,
        contentHash: snapshot.contentHash,
        sentimentScore: snapshot.sentimentScore,
        sentimentLabel: snapshot.sentimentLabel,
        relevanceScore: snapshot.relevanceScore,
        urgencyScore: snapshot.urgencyScore,
        noveltyScore: snapshot.noveltyScore,
        riskScore: snapshot.riskScore,
        opportunityScore: snapshot.opportunityScore,
        confidence: snapshot.confidence,
        marketImpactHorizon: snapshot.marketImpactHorizon,
        entities: snapshot.entities,
        topics: snapshot.topics,
        eventTypes: snapshot.eventTypes,
        affectedSignals: snapshot.affectedSignals,
        affectedRiskFactors: snapshot.affectedRiskFactors,
        extractedIndicators: snapshot.extractedIndicators,
        decisionHints: snapshot.decisionHints,
        explanation: snapshot.explanation,
      });
    } catch {
      failed += 1;
    }
  }

  const storedSnapshots = await upsertNewsSnapshots(snapshots);
  const snapshotByHash = new Map(storedSnapshots.map((row) => [row.contentHash, row.id]));
  const links = deduped.flatMap((article) =>
    article.symbols.map((symbol, idx) => ({
      articleId: byHash.get(article.contentHash)?.id ?? '',
      snapshotId: snapshotByHash.get(article.contentHash) ?? null,
      assetId: article.assetIds[idx] ?? null,
      symbol,
      assetClass: article.assetClasses[idx] ?? 'other',
      relevanceScore: 0.5,
      impactScore: 0.5,
    })).filter((row) => row.articleId),
  );
  await insertNewsAssetLinks(links);

  return {
    ok: true,
    job: 'extract-news-intelligence',
    fetched: stream.items.length,
    deduped: deduped.length,
    snapshotsCreated: storedSnapshots.length,
    linkedAssets: links.length,
    failed,
    degraded: stream.degraded,
  };
}
