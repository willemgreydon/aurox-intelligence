# News Intelligence Snapshots Audit

Date: 2026-05-09

## Current News Pipeline (Before Patch)
- Providers:
  - Finnhub
  - Polygon
  - RSS mode/fallback
  - Mock fallback when providers unavailable
- Normalized shape:
  - `NewsItem` contract in `packages/api-contracts/src/news/news.ts`
  - includes title/url/source/publishedAt/symbol/tickers/sentiment/relevance/impact placeholders
- Display surfaces:
  - `/news`
  - observe/portfolio/signal contexts indirectly via service-derived scoring
- Persistence state:
  - no dedicated DB-backed news intelligence snapshot tables before this slice
  - existing news feed was mostly stream/query-time oriented
- Influence on decisions:
  - existing news impact heuristic existed (`deriveNewsImpactExplanation`)
  - no persistent snapshot ids/metadata linked into decision traces

## Gaps Found
- Missing persistent article+snapshot model for explainable downstream use.
- Missing dedupe mechanism by content hash in DB.
- No durable asset-link table for news-to-asset mapping.
- No worker job dedicated to news snapshot extraction.
- Missing retention operations doc specific to news intelligence.

## Worker Crash Root Cause
- Crash reported:
  - `@repo/ai-market-intelligence` missing named export `deriveMarketIntelligenceDigest`
- Mitigation applied:
  - worker now imports module namespace and validates export at runtime with explicit error guidance.
  - prevents silent import mismatch behavior and gives deterministic failure reason.

## Patch Plan Executed
1. Add canonical news article + snapshot contracts in API contracts.
2. Add DB migration for:
   - `news_articles`
   - `news_intelligence_snapshots`
   - `news_asset_links`
   - plus indexes/GIN indexes for queryability.
3. Add DB repository for upsert/list/link/prune.
4. Add deterministic extraction engine in `@repo/ai-market-intelligence`.
5. Add web service orchestration for ingest/list/context queries.
6. Add worker job for scheduled extraction and storage.
7. Integrate snapshot outputs into:
   - `/news` rendering
   - observe items (news shock feed)
   - alert candidate generation
   - portfolio intelligence news exposure metric
   - AI simulation agent decision trace metadata
8. Add retention operations doc and focused tests.
