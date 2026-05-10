create table if not exists app.news_articles (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_article_id text,
  title text not null,
  url text not null,
  source_name text not null,
  published_at timestamptz not null,
  fetched_at timestamptz not null,
  language text,
  summary text,
  content_hash text not null unique,
  raw_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists app.news_intelligence_snapshots (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references app.news_articles(id) on delete cascade,
  content_hash text not null,
  sentiment_score numeric(6,4) not null,
  sentiment_label text not null,
  relevance_score numeric(6,4) not null,
  urgency_score numeric(6,4) not null,
  novelty_score numeric(6,4) not null,
  risk_score numeric(6,2) not null,
  opportunity_score numeric(6,2) not null,
  confidence numeric(6,4) not null,
  market_impact_horizon text not null default 'unknown',
  entities jsonb not null default '[]'::jsonb,
  topics jsonb not null default '[]'::jsonb,
  event_types jsonb not null default '[]'::jsonb,
  affected_signals jsonb not null default '[]'::jsonb,
  affected_risk_factors jsonb not null default '[]'::jsonb,
  extracted_indicators jsonb not null default '{}'::jsonb,
  decision_hints jsonb not null default '[]'::jsonb,
  explanation jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists app.news_asset_links (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references app.news_articles(id) on delete cascade,
  snapshot_id uuid references app.news_intelligence_snapshots(id) on delete cascade,
  asset_id text,
  symbol text not null,
  asset_class text not null,
  relevance_score numeric(6,4) not null default 0,
  impact_score numeric(6,4) not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_news_articles_provider_article_id
  on app.news_articles (provider, provider_article_id)
  where provider_article_id is not null;

create unique index if not exists idx_news_articles_url_provider
  on app.news_articles (provider, url);

create index if not exists idx_news_articles_published_at
  on app.news_articles (published_at desc);

create index if not exists idx_news_articles_content_hash
  on app.news_articles (content_hash);

create index if not exists idx_news_snapshots_created_at
  on app.news_intelligence_snapshots (created_at desc);

create index if not exists idx_news_snapshots_risk_score
  on app.news_intelligence_snapshots (risk_score desc);

create index if not exists idx_news_snapshots_urgency_score
  on app.news_intelligence_snapshots (urgency_score desc);

create index if not exists idx_news_links_symbol
  on app.news_asset_links (symbol, created_at desc);

create index if not exists idx_news_links_asset_class
  on app.news_asset_links (asset_class, created_at desc);

create index if not exists idx_news_links_article_snapshot
  on app.news_asset_links (article_id, snapshot_id);

create index if not exists idx_news_snapshots_event_types_gin
  on app.news_intelligence_snapshots using gin (event_types);

create index if not exists idx_news_snapshots_topics_gin
  on app.news_intelligence_snapshots using gin (topics);

create index if not exists idx_news_snapshots_entities_gin
  on app.news_intelligence_snapshots using gin (entities);
