import { createDatabaseClient } from '../client';

type JsonValue = Record<string, unknown> | Array<unknown>;

export type NewsArticleRecord = {
  id: string;
  provider: string;
  providerArticleId: string | null;
  title: string;
  url: string;
  sourceName: string;
  publishedAt: string;
  fetchedAt: string;
  language: string | null;
  summary: string | null;
  contentHash: string;
  rawMetadata: Record<string, unknown>;
  createdAt: string;
};

export type NewsSnapshotRecord = {
  id: string;
  articleId: string;
  contentHash: string;
  sentimentScore: number;
  sentimentLabel: 'positive' | 'neutral' | 'negative' | 'mixed';
  relevanceScore: number;
  urgencyScore: number;
  noveltyScore: number;
  riskScore: number;
  opportunityScore: number;
  confidence: number;
  marketImpactHorizon: 'intraday' | 'short_term' | 'medium_term' | 'long_term' | 'unknown';
  entities: string[];
  topics: string[];
  eventTypes: string[];
  affectedSignals: string[];
  affectedRiskFactors: string[];
  extractedIndicators: Record<string, unknown>;
  decisionHints: string[];
  explanation: string[];
  createdAt: string;
};

export type NewsAssetLinkRecord = {
  id: string;
  articleId: string;
  snapshotId: string | null;
  assetId: string | null;
  symbol: string;
  assetClass: string;
  relevanceScore: number;
  impactScore: number;
  createdAt: string;
};

export type NewsArticleInput = Omit<NewsArticleRecord, 'id' | 'createdAt'>;
export type NewsSnapshotInput = Omit<NewsSnapshotRecord, 'id' | 'createdAt'>;
export type NewsAssetLinkInput = Omit<NewsAssetLinkRecord, 'id' | 'createdAt'>;

function isMissingTable(error: unknown) {
  if (typeof error !== 'object' || error === null || !('code' in error)) return false;
  const e = error as { code?: string };
  return e.code === '42P01' || e.code === '42703';
}

function toIso(value: unknown) {
  if (typeof value !== 'string' && !(value instanceof Date)) return new Date().toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function parseJsonArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v));
}

function toNumber(value: unknown) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export async function upsertNewsArticles(inputs: NewsArticleInput[]): Promise<NewsArticleRecord[]> {
  const client = createDatabaseClient();
  if (!client.isConfigured || inputs.length === 0) return [];
  try {
    const rows: NewsArticleRecord[] = [];
    await client.transaction(async (tx) => {
      for (const item of inputs) {
        const result = await tx.query<{
          id: string;
          provider: string;
          providerArticleId: string | null;
          title: string;
          url: string;
          sourceName: string;
          publishedAt: string;
          fetchedAt: string;
          language: string | null;
          summary: string | null;
          contentHash: string;
          rawMetadata: Record<string, unknown>;
          createdAt: string;
        }>(
          `insert into app.news_articles (
            provider, provider_article_id, title, url, source_name, published_at, fetched_at, language, summary, content_hash, raw_metadata
          ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)
          on conflict (content_hash) do update set
            fetched_at = excluded.fetched_at
          returning
            id, provider, provider_article_id as "providerArticleId", title, url, source_name as "sourceName",
            published_at as "publishedAt", fetched_at as "fetchedAt", language, summary, content_hash as "contentHash",
            raw_metadata as "rawMetadata", created_at as "createdAt"`,
          [
            item.provider,
            item.providerArticleId ?? null,
            item.title,
            item.url,
            item.sourceName,
            item.publishedAt,
            item.fetchedAt,
            item.language ?? null,
            item.summary ?? null,
            item.contentHash,
            JSON.stringify(item.rawMetadata ?? {}),
          ],
        );
        if (result[0]) rows.push(result[0]);
      }
    });
    return rows;
  } catch (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
}

export async function upsertNewsSnapshots(inputs: NewsSnapshotInput[]): Promise<NewsSnapshotRecord[]> {
  const client = createDatabaseClient();
  if (!client.isConfigured || inputs.length === 0) return [];
  try {
    const rows: NewsSnapshotRecord[] = [];
    await client.transaction(async (tx) => {
      for (const item of inputs) {
        const result = await tx.query<{
          id: string;
          articleId: string;
          contentHash: string;
          sentimentScore: number | string;
          sentimentLabel: 'positive' | 'neutral' | 'negative' | 'mixed';
          relevanceScore: number | string;
          urgencyScore: number | string;
          noveltyScore: number | string;
          riskScore: number | string;
          opportunityScore: number | string;
          confidence: number | string;
          marketImpactHorizon: 'intraday' | 'short_term' | 'medium_term' | 'long_term' | 'unknown';
          entities: JsonValue;
          topics: JsonValue;
          eventTypes: JsonValue;
          affectedSignals: JsonValue;
          affectedRiskFactors: JsonValue;
          extractedIndicators: Record<string, unknown>;
          decisionHints: JsonValue;
          explanation: JsonValue;
          createdAt: string;
        }>(
          `insert into app.news_intelligence_snapshots (
            article_id, content_hash, sentiment_score, sentiment_label, relevance_score, urgency_score, novelty_score,
            risk_score, opportunity_score, confidence, market_impact_horizon, entities, topics, event_types, affected_signals,
            affected_risk_factors, extracted_indicators, decision_hints, explanation
          ) values (
            $1::uuid,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb,$14::jsonb,$15::jsonb,$16::jsonb,$17::jsonb,$18::jsonb,$19::jsonb
          )
          on conflict do nothing
          returning
            id, article_id as "articleId", content_hash as "contentHash", sentiment_score as "sentimentScore",
            sentiment_label as "sentimentLabel", relevance_score as "relevanceScore", urgency_score as "urgencyScore",
            novelty_score as "noveltyScore", risk_score as "riskScore", opportunity_score as "opportunityScore",
            confidence, market_impact_horizon as "marketImpactHorizon", entities, topics, event_types as "eventTypes",
            affected_signals as "affectedSignals", affected_risk_factors as "affectedRiskFactors", extracted_indicators as "extractedIndicators",
            decision_hints as "decisionHints", explanation, created_at as "createdAt"`,
          [
            item.articleId,
            item.contentHash,
            item.sentimentScore,
            item.sentimentLabel,
            item.relevanceScore,
            item.urgencyScore,
            item.noveltyScore,
            item.riskScore,
            item.opportunityScore,
            item.confidence,
            item.marketImpactHorizon,
            JSON.stringify(item.entities),
            JSON.stringify(item.topics),
            JSON.stringify(item.eventTypes),
            JSON.stringify(item.affectedSignals),
            JSON.stringify(item.affectedRiskFactors),
            JSON.stringify(item.extractedIndicators),
            JSON.stringify(item.decisionHints),
            JSON.stringify(item.explanation),
          ],
        );
        if (!result[0]) continue;
        rows.push({
          ...result[0],
          sentimentScore: toNumber(result[0].sentimentScore),
          relevanceScore: toNumber(result[0].relevanceScore),
          urgencyScore: toNumber(result[0].urgencyScore),
          noveltyScore: toNumber(result[0].noveltyScore),
          riskScore: toNumber(result[0].riskScore),
          opportunityScore: toNumber(result[0].opportunityScore),
          confidence: toNumber(result[0].confidence),
          entities: parseJsonArray(result[0].entities),
          topics: parseJsonArray(result[0].topics),
          eventTypes: parseJsonArray(result[0].eventTypes),
          affectedSignals: parseJsonArray(result[0].affectedSignals),
          affectedRiskFactors: parseJsonArray(result[0].affectedRiskFactors),
          decisionHints: parseJsonArray(result[0].decisionHints),
          explanation: parseJsonArray(result[0].explanation),
        });
      }
    });
    return rows;
  } catch (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
}

export async function insertNewsAssetLinks(inputs: NewsAssetLinkInput[]): Promise<void> {
  const client = createDatabaseClient();
  if (!client.isConfigured || inputs.length === 0) return;
  try {
    await client.transaction(async (tx) => {
      for (const item of inputs) {
        await tx.execute(
          `insert into app.news_asset_links (
            article_id, snapshot_id, asset_id, symbol, asset_class, relevance_score, impact_score
          ) values ($1::uuid,$2::uuid,$3,$4,$5,$6,$7)`,
          [
            item.articleId,
            item.snapshotId ?? null,
            item.assetId ?? null,
            item.symbol,
            item.assetClass,
            item.relevanceScore,
            item.impactScore,
          ],
        );
      }
    });
  } catch (error) {
    if (isMissingTable(error)) return;
    throw error;
  }
}

export async function listNewsSnapshots(filters: {
  symbol?: string;
  assetClass?: string;
  sentimentLabel?: string;
  minRiskScore?: number;
  minOpportunityScore?: number;
  eventType?: string;
  from?: string;
  to?: string;
  limit?: number;
} = {}): Promise<Array<NewsSnapshotRecord & { article: NewsArticleRecord }>> {
  const client = createDatabaseClient();
  if (!client.isConfigured) return [];
  const limit = Math.min(Math.max(filters.limit ?? 120, 1), 1000);
  try {
    const rows = await client.query<any>(
      `select
        s.id,
        s.article_id as "articleId",
        s.content_hash as "contentHash",
        s.sentiment_score as "sentimentScore",
        s.sentiment_label as "sentimentLabel",
        s.relevance_score as "relevanceScore",
        s.urgency_score as "urgencyScore",
        s.novelty_score as "noveltyScore",
        s.risk_score as "riskScore",
        s.opportunity_score as "opportunityScore",
        s.confidence,
        s.market_impact_horizon as "marketImpactHorizon",
        s.entities,
        s.topics,
        s.event_types as "eventTypes",
        s.affected_signals as "affectedSignals",
        s.affected_risk_factors as "affectedRiskFactors",
        s.extracted_indicators as "extractedIndicators",
        s.decision_hints as "decisionHints",
        s.explanation,
        s.created_at as "createdAt",
        a.id as "article_id_full",
        a.provider as "article_provider",
        a.provider_article_id as "article_providerArticleId",
        a.title as "article_title",
        a.url as "article_url",
        a.source_name as "article_sourceName",
        a.published_at as "article_publishedAt",
        a.fetched_at as "article_fetchedAt",
        a.language as "article_language",
        a.summary as "article_summary",
        a.content_hash as "article_contentHash",
        a.raw_metadata as "article_rawMetadata",
        a.created_at as "article_createdAt"
      from app.news_intelligence_snapshots s
      join app.news_articles a on a.id = s.article_id
      where ($1::text is null or exists (
        select 1 from app.news_asset_links l where l.snapshot_id = s.id and l.symbol = $1::text
      ))
      and ($2::text is null or exists (
        select 1 from app.news_asset_links l where l.snapshot_id = s.id and l.asset_class = $2::text
      ))
      and ($3::text is null or s.sentiment_label = $3::text)
      and ($4::numeric is null or s.risk_score >= $4::numeric)
      and ($5::numeric is null or s.opportunity_score >= $5::numeric)
      and ($6::text is null or s.event_types @> to_jsonb(array[$6::text]))
      and ($7::timestamptz is null or a.published_at >= $7::timestamptz)
      and ($8::timestamptz is null or a.published_at <= $8::timestamptz)
      order by a.published_at desc
      limit ${limit}`,
      [
        filters.symbol ?? null,
        filters.assetClass ?? null,
        filters.sentimentLabel ?? null,
        typeof filters.minRiskScore === 'number' ? filters.minRiskScore : null,
        typeof filters.minOpportunityScore === 'number' ? filters.minOpportunityScore : null,
        filters.eventType ?? null,
        filters.from ?? null,
        filters.to ?? null,
      ],
    );
    return rows.map((row) => ({
      id: row.id,
      articleId: row.articleId,
      contentHash: row.contentHash,
      sentimentScore: toNumber(row.sentimentScore),
      sentimentLabel: row.sentimentLabel,
      relevanceScore: toNumber(row.relevanceScore),
      urgencyScore: toNumber(row.urgencyScore),
      noveltyScore: toNumber(row.noveltyScore),
      riskScore: toNumber(row.riskScore),
      opportunityScore: toNumber(row.opportunityScore),
      confidence: toNumber(row.confidence),
      marketImpactHorizon: row.marketImpactHorizon,
      entities: parseJsonArray(row.entities),
      topics: parseJsonArray(row.topics),
      eventTypes: parseJsonArray(row.eventTypes),
      affectedSignals: parseJsonArray(row.affectedSignals),
      affectedRiskFactors: parseJsonArray(row.affectedRiskFactors),
      extractedIndicators: row.extractedIndicators ?? {},
      decisionHints: parseJsonArray(row.decisionHints),
      explanation: parseJsonArray(row.explanation),
      createdAt: toIso(row.createdAt),
      article: {
        id: row.article_id_full,
        provider: row.article_provider,
        providerArticleId: row.article_providerArticleId,
        title: row.article_title,
        url: row.article_url,
        sourceName: row.article_sourceName,
        publishedAt: toIso(row.article_publishedAt),
        fetchedAt: toIso(row.article_fetchedAt),
        language: row.article_language,
        summary: row.article_summary,
        contentHash: row.article_contentHash,
        rawMetadata: row.article_rawMetadata ?? {},
        createdAt: toIso(row.article_createdAt),
      },
    }));
  } catch (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
}

export async function pruneOldNewsSnapshots(retentionDays = 365): Promise<void> {
  const client = createDatabaseClient();
  if (!client.isConfigured) return;
  try {
    await client.execute(
      `delete from app.news_articles
       where created_at < now() - ($1::int * interval '1 day')`,
      [retentionDays],
    );
  } catch (error) {
    if (isMissingTable(error)) return;
    throw error;
  }
}
