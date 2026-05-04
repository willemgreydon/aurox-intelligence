'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { NewsItem, NewsStreamResponse } from '@repo/api-contracts';
import { Card } from '../ui/card';

type NewsStreamWidgetProps = {
  news: NewsStreamResponse;
  title?: string;
};

type FeedTab = {
  id: 'core' | 'extended' | 'all';
  label: string;
  sources: string[];
};

const FEED_TABS: FeedTab[] = [
  { id: 'core', label: 'Core Sources', sources: ['MarketWatch', 'Yahoo Finance', 'Nasdaq'] },
  { id: 'extended', label: 'Extended Sources', sources: ['CNBC', 'Reuters', 'Financial Times'] },
  { id: 'all', label: 'All Sources', sources: [] },
];

function normalizeSource(value: string | null | undefined): string {
  if (!value) return 'Unknown source';
  const trimmed = value.trim();
  if (!trimmed) return 'Unknown source';
  const lower = trimmed.toLowerCase();
  if (lower.includes('marketwatch')) return 'MarketWatch';
  if (lower.includes('yahoo')) return 'Yahoo Finance';
  if (lower.includes('nasdaq')) return 'Nasdaq';
  if (lower.includes('cnbc')) return 'CNBC';
  if (lower.includes('reuters')) return 'Reuters';
  if (lower.includes('financial times') || lower === 'ft' || lower.includes('alphaville')) return 'Financial Times';
  return trimmed;
}

function buildColumns(items: NewsItem[], selectedTab: FeedTab): Array<{ source: string; items: NewsItem[] }> {
  const grouped = new Map<string, NewsItem[]>();
  for (const item of items) {
    const source = normalizeSource(item.source || item.provider);
    const sourceItems = grouped.get(source) ?? [];
    sourceItems.push(item);
    grouped.set(source, sourceItems);
  }

  const entries = Array.from(grouped.entries())
    .map(([source, sourceItems]) => ({
      source,
      items: sourceItems
        .slice()
        .sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime())
        .slice(0, 5),
      weight: sourceItems.length,
      latest: Math.max(...sourceItems.map((item) => new Date(item.publishedAt || 0).getTime())),
    }))
    .sort((a, b) => (b.weight !== a.weight ? b.weight - a.weight : b.latest - a.latest));

  if (selectedTab.id === 'all') {
    return entries.slice(0, 3).map(({ source, items: sourceItems }) => ({ source, items: sourceItems }));
  }

  const requested = selectedTab.sources.map((source) =>
    entries.find((entry) => entry.source.toLowerCase() === source.toLowerCase()),
  );

  const fallback = entries.filter(
    (entry) => !selectedTab.sources.some((name) => name.toLowerCase() === entry.source.toLowerCase()),
  );

  const combined = [...requested.filter(Boolean), ...fallback].slice(0, 3) as Array<{
    source: string;
    items: NewsItem[];
  }>;

  return combined;
}

export function NewsStreamWidget({ news, title = 'Market News' }: NewsStreamWidgetProps) {
  const [tabId, setTabId] = useState<FeedTab['id']>('core');
  const selectedTab: FeedTab = FEED_TABS.find((tab) => tab.id === tabId) ?? FEED_TABS[0]!;

  const columns = useMemo(() => buildColumns(news.items ?? [], selectedTab), [news.items, selectedTab.id]);

  return (
    <Card className="analytics-card home-news-card">
      <div className="analytics-card__header">
        <div>
          <div className="section__eyebrow">Markets & Data</div>
          <h3>{title}</h3>
          <p>{news.degraded ? 'Database unavailable - showing local fallback data.' : 'Latest market and company headlines.'}</p>
        </div>
        <span className={`status-pill status-pill--${news.degraded ? 'warning' : 'success'}`}>
          {news.degraded ? 'Degraded' : 'Live'}
        </span>
      </div>
      <div className="analytics-card__body">
        <div className="home-news-tabs" role="tablist" aria-label="News source groups">
          {FEED_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={tabId === tab.id}
              className={`home-news-tab ${tabId === tab.id ? 'home-news-tab--active' : ''}`}
              onClick={() => setTabId(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {columns.length > 0 ? (
          <div className="home-news-grid">
            {columns.map((column) => (
              <article key={column.source} className="home-news-source">
                <header className="home-news-source__header">
                  <h4>{column.source}</h4>
                  <span className="status-pill status-pill--neutral">{column.items.length} items</span>
                </header>
                {column.items.length > 0 ? (
                  <ul className="home-news-source__list">
                    {column.items.map((item) => (
                      <li key={item.id || `${column.source}-${item.url || item.title}`}>
                        {item.url ? (
                          <a href={item.url} target="_blank" rel="noreferrer noopener">
                            <strong>{item.symbol || item.tickers?.[0] || 'N/A'}</strong>
                            {item.title || 'Untitled headline'}
                          </a>
                        ) : (
                          <span className="home-news-source__text">
                            <strong>{item.symbol || item.tickers?.[0] || 'N/A'}</strong>
                            {item.title || 'Untitled headline'}
                          </span>
                        )}
                        {item.publishedAt ? (
                          <span className="home-news-source__meta">{new Date(item.publishedAt).toLocaleString('en-US')}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted">No headlines for this source.</p>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p>{news.message || 'No news items available.'}</p>
        )}
      </div>
      <div className="analytics-card__action-grid">
        <Link href="/news" className="button button--secondary">Open News Stream</Link>
      </div>
    </Card>
  );
}
