import {
  insertNewsAssetLinks,
  listCatalogAssets,
  listNewsSnapshots,
  pruneOldNewsSnapshots,
  upsertNewsArticles,
  upsertNewsSnapshots,
  type NewsArticleInput,
  type NewsSnapshotInput,
} from '@repo/db';
import type { NewsArticleNormalized, NewsIntelligenceSnapshot, NewsItem } from '@repo/api-contracts';
import { buildContentHash, extractNewsIntelligenceSnapshot } from '@repo/ai-market-intelligence';
import { getNewsReadModel } from '../queries/news-query';

type AssetClass = 'stock' | 'etf' | 'crypto' | 'macro' | 'other';

function normalizeAssetClass(value: string | undefined): AssetClass {
  if (value === 'stock' || value === 'etf' || value === 'crypto' || value === 'macro') return value;
  return 'other';
}

function normalizeArticle(item: NewsItem, assetIdBySymbol: ReadonlyMap<string, string>): NewsArticleNormalized {
  const symbols = [...new Set([item.symbol, ...(item.symbols ?? []), ...(item.tickers ?? [])].map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))];
  const assetIds = symbols.map((symbol) => assetIdBySymbol.get(symbol)).filter((id): id is string => Boolean(id));
  const assetClasses = [...new Set([normalizeAssetClass(item.assetClass), ...symbols.map(() => normalizeAssetClass(item.assetClass))])];
  const contentHash = buildContentHash({
    title: item.title,
    url: item.url,
    sourceName: item.source,
    publishedAt: item.publishedAt,
  });

  return {
    id: item.id,
    provider: item.provider,
    providerArticleId: item.id.includes(':') ? item.id.split(':').slice(1).join(':') : null,
    title: item.title,
    url: item.url,
    sourceName: item.source,
    publishedAt: item.publishedAt,
    fetchedAt: new Date().toISOString(),
    symbols,
    assetIds,
    assetClasses,
    language: item.language ?? null,
    summary: item.summary || null,
    contentHash,
    rawMetadata: {
      categories: item.categories,
      riskTags: item.riskTags,
      extractedEntities: item.extractedEntities,
    },
  };
}

function toArticleInput(article: NewsArticleNormalized): NewsArticleInput {
  return {
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
  };
}

function toSnapshotInput(snapshot: NewsIntelligenceSnapshot): NewsSnapshotInput {
  return {
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
  };
}

export async function ingestNewsIntelligenceSnapshots(input?: { items?: NewsItem[] }) {
  const items = input?.items ?? (await getNewsReadModel()).items;
  if (items.length === 0) {
    return { fetched: 0, deduped: 0, snapshotsCreated: 0, linkedAssets: 0, failed: 0 };
  }

  const assets = await listCatalogAssets();
  const assetIdBySymbol = new Map(assets.map((asset) => [asset.symbol.toUpperCase(), asset.assetId]));
  const assetRefBySymbol = new Map(assets.map((asset) => [asset.symbol.toUpperCase(), { assetId: asset.assetId, symbol: asset.symbol.toUpperCase(), assetClass: normalizeAssetClass(asset.assetClass) }]));

  const normalizedArticles = items.map((item) => normalizeArticle(item, assetIdBySymbol));
  const dedupedByHash = [...new Map(normalizedArticles.map((article) => [article.contentHash, article])).values()];

  const upsertedArticles = await upsertNewsArticles(dedupedByHash.map(toArticleInput));
  const articleByHash = new Map(upsertedArticles.map((article) => [article.contentHash, article]));

  const snapshotInputs: NewsSnapshotInput[] = [];
  const snapshotSourceRows: Array<{ contentHash: string; symbols: string[]; assetIds: string[]; assetClasses: AssetClass[]; relevanceScore: number; opportunityScore: number; articleId: string }> = [];
  let failed = 0;

  for (const article of dedupedByHash) {
    const persisted = articleByHash.get(article.contentHash);
    if (!persisted) continue;
    try {
      const snapshot = extractNewsIntelligenceSnapshot({
        article: { ...article, id: persisted.id },
        assets: article.symbols.map((symbol) => assetRefBySymbol.get(symbol)).filter((v): v is NonNullable<typeof v> => Boolean(v)),
      });
      snapshotInputs.push(toSnapshotInput(snapshot));
      snapshotSourceRows.push({
        contentHash: article.contentHash,
        symbols: snapshot.symbols,
        assetIds: snapshot.assetIds,
        assetClasses: snapshot.assetClasses,
        relevanceScore: snapshot.relevanceScore,
        opportunityScore: snapshot.opportunityScore / 100,
        articleId: persisted.id,
      });
    } catch {
      failed += 1;
    }
  }

  const snapshots = await upsertNewsSnapshots(snapshotInputs);
  const snapshotByHash = new Map(snapshots.map((snapshot) => [snapshot.contentHash, snapshot.id]));

  const links = snapshotSourceRows.flatMap((row) =>
    row.symbols.map((symbol, index) => ({
      articleId: row.articleId,
      snapshotId: snapshotByHash.get(row.contentHash) ?? null,
      assetId: row.assetIds[index] ?? null,
      symbol,
      assetClass: row.assetClasses[index] ?? 'other',
      relevanceScore: row.relevanceScore,
      impactScore: row.opportunityScore,
    })),
  );
  await insertNewsAssetLinks(links);

  return {
    fetched: items.length,
    deduped: dedupedByHash.length,
    snapshotsCreated: snapshots.length,
    linkedAssets: links.length,
    failed,
  };
}

export async function listNewsIntelligenceSnapshots(filters: Parameters<typeof listNewsSnapshots>[0] = {}) {
  return listNewsSnapshots(filters);
}

export async function getSnapshotsForAsset(symbol: string) {
  return listNewsSnapshots({ symbol: symbol.trim().toUpperCase(), limit: 40 });
}

export async function getLatestNewsSignalForAsset(symbol: string) {
  const rows = await listNewsSnapshots({ symbol: symbol.trim().toUpperCase(), limit: 12 });
  if (rows.length === 0) {
    return null;
  }
  const avgSentiment = rows.reduce((sum, row) => sum + row.sentimentScore, 0) / rows.length;
  const maxRisk = Math.max(...rows.map((row) => row.riskScore));
  const maxUrgency = Math.max(...rows.map((row) => row.urgencyScore));
  const topEvents = [...new Set(rows.flatMap((row) => row.eventTypes))].slice(0, 5);
  return {
    symbol: symbol.trim().toUpperCase(),
    avgSentiment,
    maxRisk,
    maxUrgency,
    topEvents,
    latest: rows[0],
  };
}

export async function getNewsRiskSummary(assetIds: string[]) {
  const symbols = new Set<string>();
  const assets = await listCatalogAssets();
  for (const assetId of assetIds) {
    const asset = assets.find((row) => row.assetId === assetId);
    if (asset) symbols.add(asset.symbol.toUpperCase());
  }
  const rows = await Promise.all([...symbols].map((symbol) => listNewsSnapshots({ symbol, limit: 20 })));
  const flat = rows.flat();
  if (flat.length === 0) {
    return { avgRisk: 0, maxRisk: 0, affectedAssets: [] as string[] };
  }
  return {
    avgRisk: flat.reduce((sum, row) => sum + row.riskScore, 0) / flat.length,
    maxRisk: Math.max(...flat.map((row) => row.riskScore)),
    affectedAssets: [...new Set(flat.flatMap((row) => row.article.title ? [row.article.title] : []))].slice(0, 8),
  };
}

export async function getDecisionNewsContext(assetId: string) {
  const assets = await listCatalogAssets();
  const asset = assets.find((row) => row.assetId === assetId);
  if (!asset) return null;
  return getLatestNewsSignalForAsset(asset.symbol);
}

export async function pruneNewsIntelligenceSnapshots(retentionDays = 365) {
  await pruneOldNewsSnapshots(retentionDays);
}
