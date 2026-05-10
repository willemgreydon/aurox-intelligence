# News Intelligence Retention

## Scope
- Applies to:
  - `app.news_articles`
  - `app.news_intelligence_snapshots`
  - `app.news_asset_links`
- Simulation and broker decisions remain simulation-first and guardrailed.

## Data Stored
- Structured metadata only:
  - title, URL, provider identifiers, timestamps
  - hashes, extracted indicators, sentiment/risk/opportunity scores
  - event/topic/entity tags and decision hints
- Full copyrighted bodies are not required or persisted by this layer.

## Recommended Retention
- `news_articles`: 180 to 365 days
- `news_intelligence_snapshots`: up to 365 days
- `news_asset_links`: retained with snapshots/articles
- Oversized `raw_metadata` blobs should be pruned or compacted if needed.

## Pruning
- Use `pruneOldNewsSnapshots(retentionDays)` from news intelligence service/repository flows.
- Suggested schedule:
  - Daily retention run
  - Keep at least 180 days unless storage pressure requires shorter windows.

## Safety
- Never overwrite known-good snapshot data because an extraction run fails.
- Keep content hash and provider identifiers for deterministic dedupe and traceability.
