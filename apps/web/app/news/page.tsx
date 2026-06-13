import { Section } from '../../components/ui/section';
import { WorkstationPageHeader } from '../../components/asset/workstation-page-header';
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

function sentimentLabel(score: number): string {
  if (score >= 0.5) return 'Very Bullish';
  if (score >= 0.2) return 'Bullish';
  if (score >= -0.2) return 'Neutral';
  if (score >= -0.5) return 'Bearish';
  return 'Very Bearish';
}

function sentimentTone(score: number): string {
  if (score >= 0.2) return 'success';
  if (score >= -0.2) return 'neutral';
  return 'danger';
}

function riskTone(score: number): string {
  if (score >= 70) return 'danger';
  if (score >= 40) return 'warning';
  return 'success';
}

function opportunityTone(score: number): string {
  if (score >= 70) return 'success';
  if (score >= 40) return 'info';
  return 'neutral';
}

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default async function NewsPage() {
  const [newsResult, snapshotsResult, locale] = await Promise.all([
    withDbReadFallback('news:stream', EMPTY_NEWS, () => getNewsStreamData()),
    withDbReadFallback<NewsSnapshotRow[]>('news:snapshots', [], () =>
      listNewsIntelligenceSnapshots({ limit: 80 }),
    ),
    getRequestLocale(),
  ]);

  const news = newsResult.value;
  const snapshots = snapshotsResult.value;
  const degraded = news.degraded || newsResult.degraded;
  const messages = getMessages(locale);

  const highRisk = snapshots.filter((s) => s.riskScore >= 60);
  const highOpportunity = snapshots.filter((s) => s.opportunityScore >= 60);
  const avgSentiment =
    snapshots.length > 0
      ? snapshots.reduce((sum, s) => sum + s.sentimentScore, 0) / snapshots.length
      : 0;
  const urgentSnapshots = snapshots.filter((s) => s.urgencyScore >= 0.6);

  return (
    <>
      <Section className="dashboard-section dashboard-section--hero dashboard-section--compact">
        <WorkstationPageHeader
          eyebrow={messages.footer.groupMarkets}
          title={messages.shell.nav.newsStream}
          description="AI-analyzed market headlines with sentiment, risk, and opportunity scoring."
          summary={
            degraded
              ? 'Data partially degraded — showing available fallback headlines.'
              : 'Provider-backed news stream with deduplicated AI intelligence snapshots.'
          }
          statusLabel={degraded ? 'degraded' : messages.common.live.toLowerCase()}
          statusTone={degraded ? 'warning' : 'success'}
          meta={[
            { label: 'Articles', value: String(news.items.length) },
            { label: 'Analyzed', value: String(snapshots.length) },
            { label: 'High risk', value: String(highRisk.length) },
            { label: 'High opportunity', value: String(highOpportunity.length) },
            { label: messages.common.lastUpdated, value: formatDateTimeLabel(news.updatedAt, locale, messages.common.unavailable) },
          ]}
          actions={[
            { href: '/alerts', label: 'Alert Center' },
            { href: '/observe', label: 'Observer' },
            { href: '/signals', label: 'Signals' },
          ]}
        />
      </Section>

      {/* KPI strip */}
      <Section className="dashboard-section dashboard-section--compact">
        <div className="news-kpi-rail">
          <article className="news-kpi-card">
            <div className="news-kpi-card__value">{news.items.length}</div>
            <div className="news-kpi-card__label">Live articles</div>
          </article>
          <article className="news-kpi-card">
            <div className={`news-kpi-card__value news-kpi-card__value--${sentimentTone(avgSentiment)}`}>
              {sentimentLabel(avgSentiment)}
            </div>
            <div className="news-kpi-card__label">Market sentiment</div>
          </article>
          <article className="news-kpi-card">
            <div className="news-kpi-card__value news-kpi-card__value--danger">{highRisk.length}</div>
            <div className="news-kpi-card__label">High-risk signals</div>
          </article>
          <article className="news-kpi-card">
            <div className="news-kpi-card__value news-kpi-card__value--success">{highOpportunity.length}</div>
            <div className="news-kpi-card__label">Opportunities</div>
          </article>
          <article className="news-kpi-card">
            <div className="news-kpi-card__value news-kpi-card__value--warning">{urgentSnapshots.length}</div>
            <div className="news-kpi-card__label">Urgent items</div>
          </article>
        </div>
      </Section>

      {/* Degraded banner */}
      {degraded ? (
        <Section className="dashboard-section dashboard-section--compact">
          <div className="alert-degraded-banner" role="alert">
            <span aria-hidden="true">⚠</span>
            {news.message ?? 'News data is partially degraded. Showing available data.'}
          </div>
        </Section>
      ) : null}

      {/* Main content: two-column layout */}
      <Section className="dashboard-section">
        <div className="news-workspace">

          {/* Left: Intelligence snapshots */}
          <div className="news-workspace__primary">
            <div className="news-section-header">
              <h2 className="news-section-header__title">AI Intelligence Snapshots</h2>
              <span className="news-section-header__count status-pill status-pill--info">{snapshots.length}</span>
            </div>

            {snapshots.length === 0 ? (
              <div className="aurox-empty-state">
                <div className="aurox-empty-state__icon" aria-hidden="true">◎</div>
                <p className="aurox-empty-state__title">No intelligence snapshots yet</p>
                <p className="aurox-empty-state__body">
                  Snapshots are generated when news articles are analyzed. Check back shortly.
                </p>
              </div>
            ) : (
              <div className="news-snapshot-list">
                {snapshots.map((row) => (
                  <article key={row.id} className="news-snapshot-card">
                    <div className="news-snapshot-card__header">
                      <div className="news-snapshot-card__meta">
                        <span className="news-snapshot-card__source">{row.article.sourceName}</span>
                        <time
                          className="news-snapshot-card__time"
                          dateTime={row.article.publishedAt}
                          title={new Date(row.article.publishedAt).toLocaleString('en-US')}
                        >
                          {timeAgo(row.article.publishedAt)}
                        </time>
                      </div>
                      <div className="news-snapshot-card__badges">
                        <span className={`status-pill status-pill--${sentimentTone(row.sentimentScore)}`}>
                          {sentimentLabel(row.sentimentScore)}
                        </span>
                        {row.urgencyScore >= 0.6 ? (
                          <span className="status-pill status-pill--warning">Urgent</span>
                        ) : null}
                      </div>
                    </div>

                    <h3 className="news-snapshot-card__title">
                      <a
                        href={row.article.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="news-snapshot-card__title-link"
                      >
                        {row.article.title}
                      </a>
                    </h3>

                    {row.article.summary ? (
                      <p className="news-snapshot-card__summary">
                        {decodeHtmlEntities(row.article.summary).trim()}
                      </p>
                    ) : null}

                    {/* Score bars */}
                    <div className="news-snapshot-card__scores">
                      <div className="news-score-item">
                        <span className="news-score-item__label">Sentiment</span>
                        <div className="news-score-item__bar-track">
                          <div
                            className={`news-score-item__bar news-score-item__bar--${sentimentTone(row.sentimentScore)}`}
                            style={{ width: `${Math.abs(row.sentimentScore) * 100}%` }}
                            aria-label={`Sentiment: ${(row.sentimentScore * 100).toFixed(0)}%`}
                          />
                        </div>
                        <span className="news-score-item__value">{(row.sentimentScore * 100).toFixed(0)}</span>
                      </div>
                      <div className="news-score-item">
                        <span className="news-score-item__label">Risk</span>
                        <div className="news-score-item__bar-track">
                          <div
                            className={`news-score-item__bar news-score-item__bar--${riskTone(row.riskScore)}`}
                            style={{ width: `${row.riskScore}%` }}
                            aria-label={`Risk: ${row.riskScore.toFixed(0)}`}
                          />
                        </div>
                        <span className="news-score-item__value">{row.riskScore.toFixed(0)}</span>
                      </div>
                      <div className="news-score-item">
                        <span className="news-score-item__label">Opportunity</span>
                        <div className="news-score-item__bar-track">
                          <div
                            className={`news-score-item__bar news-score-item__bar--${opportunityTone(row.opportunityScore)}`}
                            style={{ width: `${row.opportunityScore}%` }}
                            aria-label={`Opportunity: ${row.opportunityScore.toFixed(0)}`}
                          />
                        </div>
                        <span className="news-score-item__value">{row.opportunityScore.toFixed(0)}</span>
                      </div>
                      <div className="news-score-item">
                        <span className="news-score-item__label">Urgency</span>
                        <div className="news-score-item__bar-track">
                          <div
                            className="news-score-item__bar news-score-item__bar--warning"
                            style={{ width: `${row.urgencyScore * 100}%` }}
                            aria-label={`Urgency: ${(row.urgencyScore * 100).toFixed(0)}%`}
                          />
                        </div>
                        <span className="news-score-item__value">{(row.urgencyScore * 100).toFixed(0)}%</span>
                      </div>
                    </div>

                    {/* Event types */}
                    {row.eventTypes.length > 0 ? (
                      <div className="news-snapshot-card__tags">
                        <span className="news-snapshot-card__tags-label">Events:</span>
                        {row.eventTypes.slice(0, 5).map((evt) => (
                          <span key={evt} className="news-tag">{evt}</span>
                        ))}
                      </div>
                    ) : null}

                    {/* Decision hints */}
                    {row.decisionHints.length > 0 ? (
                      <div className="news-snapshot-card__hints">
                        <span className="news-snapshot-card__hints-label">Decision hints:</span>
                        <ul className="news-hints-list">
                          {row.decisionHints.map((hint, i) => (
                            <li key={i} className="news-hints-list__item">{hint}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    <div className="news-snapshot-card__footer">
                      <a
                        href={row.article.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="news-snapshot-card__read-link"
                      >
                        Read source ↗
                      </a>
                      <span className="news-snapshot-card__confidence">
                        Conf: {row.confidence !== null && row.confidence !== undefined ? `${(row.confidence * 100).toFixed(0)}%` : 'n/a'}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          {/* Right: Live stream */}
          <div className="news-workspace__secondary">
            <div className="news-section-header">
              <h2 className="news-section-header__title">Live News Stream</h2>
              <span className="news-section-header__count status-pill status-pill--info">{news.items.length}</span>
            </div>

            {news.items.length === 0 ? (
              <div className="aurox-empty-state">
                <div className="aurox-empty-state__icon" aria-hidden="true">◎</div>
                <p className="aurox-empty-state__title">No live articles available</p>
                <p className="aurox-empty-state__body">
                  News stream is loading or provider data is temporarily unavailable.
                </p>
              </div>
            ) : (
              <div className="news-stream-list">
                {news.items.slice(0, 60).map((item) => (
                  <article key={item.id} className="news-stream-item">
                    <div className="news-stream-item__meta">
                      <span className="news-stream-item__source">{item.source}</span>
                      <time
                        className="news-stream-item__time"
                        dateTime={item.publishedAt}
                        title={new Date(item.publishedAt).toLocaleString('en-US')}
                      >
                        {timeAgo(item.publishedAt)}
                      </time>
                    </div>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="news-stream-item__title"
                    >
                      {item.title}
                    </a>
                    {item.summary ? (
                      <p className="news-stream-item__summary">
                        {decodeHtmlEntities(item.summary).trim().slice(0, 160)}
                        {item.summary.length > 160 ? '…' : ''}
                      </p>
                    ) : null}
                    {item.categories && item.categories.length > 0 ? (
                      <div className="news-stream-item__tags">
                        {item.categories.slice(0, 3).map((cat) => (
                          <span key={cat} className="news-tag news-tag--stream">{cat}</span>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </div>

        </div>
      </Section>
    </>
  );
}
