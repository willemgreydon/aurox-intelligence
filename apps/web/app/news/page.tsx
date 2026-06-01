import { Section } from '../../components/ui/section';
import { WorkstationPageHeader } from '../../components/asset/workstation-page-header';
import { Card } from '../../components/ui/card';
import { getNewsStreamData } from '../../server/services/news-service';
import { listNewsIntelligenceSnapshots } from '../../server/services/news-intelligence-service';
import { getRequestLocale } from '../../server/i18n/locale';
import { getMessages } from '../../lib/i18n/messages';
import { formatDateTimeLabel } from '../../lib/formatters';
import { decodeHtmlEntities } from '../../lib/text/decode-html-entities';
import { withDbReadFallback } from '../../server/lib/db-runtime';
import type { NewsStreamResponse } from '@repo/api-contracts';

type NewsSnapshotRow = Awaited<ReturnType<typeof listNewsIntelligenceSnapshots>>[number];

export const dynamic = 'force-dynamic';

const EMPTY_NEWS: NewsStreamResponse = {
  items: [],
  providerHealth: [],
  updatedAt: new Date(0).toISOString(),
  degraded: true,
  message: 'Database unavailable — showing local fallback data.',
};

function sentimentTone(score: number | undefined): 'success' | 'danger' | 'neutral' {
  if (typeof score !== 'number') return 'neutral';
  if (score > 0.2) return 'success';
  if (score < -0.2) return 'danger';
  return 'neutral';
}

export default async function NewsPage() {
  // Both reads are wrapped so a provider timeout or an empty/missing snapshot
  // table degrades gracefully instead of throwing the page error boundary.
  const [newsResult, snapshotsResult, locale] = await Promise.all([
    withDbReadFallback('news:stream', EMPTY_NEWS, () => getNewsStreamData()),
    withDbReadFallback<NewsSnapshotRow[]>('news:snapshots', [], () =>
      listNewsIntelligenceSnapshots({ limit: 60 }),
    ),
    getRequestLocale(),
  ]);

  const news = newsResult.value;
  const snapshots = snapshotsResult.value;
  const degraded = news.degraded || newsResult.degraded;
  const messages = getMessages(locale);

  // Live provider stream is the primary content. DB intelligence snapshots are a
  // best-effort enrichment surfaced only when the ingestion pipeline has run.
  const liveItems = [...news.items].sort(
    (a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime(),
  );
  const hasLiveItems = liveItems.length > 0;
  const hasSnapshots = snapshots.length > 0;

  return (
    <>
      <Section className="dashboard-section dashboard-section--hero">
        <WorkstationPageHeader
          eyebrow={messages.footer.groupMarkets}
          title={messages.shell.nav.newsStream}
          description="Live market and company headlines across tracked symbols."
          summary={degraded ? 'News providers degraded — showing the latest available headlines.' : 'Provider-backed news stream with deduplicated headlines.'}
          statusLabel={degraded ? 'degraded' : messages.common.live.toLowerCase()}
          statusTone={degraded ? 'warning' : 'success'}
          meta={[
            { label: 'Articles', value: String(liveItems.length) },
            { label: 'Snapshots', value: String(snapshots.length) },
            { label: messages.common.lastUpdated, value: formatDateTimeLabel(news.updatedAt, locale, messages.common.unavailable) },
          ]}
          actions={[{ href: '/invest', label: 'Open invest' }, { href: '/dashboard', label: messages.shell.nav.dashboard }]}
        />
      </Section>

      <Section className="dashboard-section">
        {hasLiveItems ? (
          <div className="analytics-two-grid">
            {liveItems.slice(0, 60).map((item) => {
              const summary = decodeHtmlEntities(item.summary || '').replace(/\s+/g, ' ').trim();
              const symbol = item.symbol || item.tickers?.[0] || '';
              return (
                <Card className="analytics-card" key={item.id || `${item.source}-${item.url}`}>
                  <div className="analytics-card__header">
                    <div>
                      <div className="section__eyebrow">{item.source || item.provider}</div>
                      <h3>{decodeHtmlEntities(item.title)}</h3>
                    </div>
                    <span className="status-pill status-pill--info">
                      {formatDateTimeLabel(item.publishedAt, locale, messages.common.unavailable)}
                    </span>
                  </div>
                  <div className="analytics-card__body">
                    <p>{summary || 'No summary available.'}</p>
                    <div className="news-score-row">
                      {symbol ? <span className="status-pill status-pill--neutral">{symbol}</span> : null}
                      {typeof item.sentimentScore === 'number' ? (
                        <span className={`status-pill status-pill--${sentimentTone(item.sentimentScore)}`}>
                          Sentiment {item.sentimentScore.toFixed(2)}
                        </span>
                      ) : null}
                      {item.stale ? <span className="status-pill status-pill--warning">Stale</span> : null}
                    </div>
                    {item.url ? (
                      <a href={item.url} target="_blank" rel="noreferrer">Read source</a>
                    ) : null}
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="aurox-empty-state">
            <p className="aurox-empty-state__title">No headlines available right now</p>
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>
              {degraded
                ? 'News providers are temporarily degraded. Headlines will appear once a provider recovers.'
                : 'No recent headlines were returned for the tracked symbols.'}
            </p>
          </div>
        )}
      </Section>

      {hasSnapshots ? (
        <Section className="dashboard-section">
          <div className="section__header">
            <div className="section__eyebrow">News intelligence</div>
            <h2 className="section__title">Scored headlines and decision context</h2>
            <p className="section__description">
              Persisted intelligence snapshots with sentiment, risk, and opportunity scoring.
            </p>
          </div>
          <div className="analytics-two-grid">
            {snapshots.slice(0, 40).map((row) => (
              <Card className="analytics-card" key={row.id}>
                <div className="analytics-card__header">
                  <div>
                    <div className="section__eyebrow">{row.article.sourceName}</div>
                    <h3>{row.article.title}</h3>
                  </div>
                  <span className="status-pill status-pill--info">{formatDateTimeLabel(row.article.publishedAt, locale, messages.common.unavailable)}</span>
                </div>
                <div className="analytics-card__body">
                  <p>{decodeHtmlEntities(row.article.summary || '').trim() || 'No summary available.'}</p>
                  <div className="news-score-row">
                    <span className="status-pill status-pill--info">Sentiment {row.sentimentScore.toFixed(2)}</span>
                    <span className="status-pill status-pill--warning">Risk {row.riskScore.toFixed(0)}</span>
                    <span className="status-pill status-pill--success">Opportunity {row.opportunityScore.toFixed(0)}</span>
                    <span className="status-pill status-pill--neutral">Urgency {(row.urgencyScore * 100).toFixed(0)}%</span>
                  </div>
                  <p>{row.eventTypes.length > 0 ? `Events: ${row.eventTypes.join(', ')}` : 'Events: none detected'}</p>
                  <p>{row.decisionHints.length > 0 ? row.decisionHints.join(' ') : 'No decision hints.'}</p>
                  <a href={row.article.url} target="_blank" rel="noreferrer">Read source</a>
                </div>
              </Card>
            ))}
          </div>
        </Section>
      ) : null}
    </>
  );
}
