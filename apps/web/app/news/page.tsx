import { Section } from '../../components/ui/section';
import { WorkstationPageHeader } from '../../components/asset/workstation-page-header';
import { Card } from '../../components/ui/card';
import { getNewsStreamData } from '../../server/services/news-service';
import { listNewsIntelligenceSnapshots } from '../../server/services/news-intelligence-service';
import { getRequestLocale } from '../../server/i18n/locale';
import { getMessages } from '../../lib/i18n/messages';
import { formatDateTimeLabel } from '../../lib/formatters';
import { decodeHtmlEntities } from '../../lib/text/decode-html-entities';

export const dynamic = 'force-dynamic';

export default async function NewsPage() {
  const [news, snapshots, locale] = await Promise.all([
    getNewsStreamData(),
    listNewsIntelligenceSnapshots({ limit: 60 }),
    getRequestLocale(),
  ]);
  const messages = getMessages(locale);

  return (
    <>
      <Section className="dashboard-section dashboard-section--hero">
        <WorkstationPageHeader
          eyebrow={messages.footer.groupMarkets}
          title={messages.shell.nav.newsStream}
          description="Live market and company headlines across tracked symbols."
          summary={news.degraded ? 'Database unavailable - showing local fallback data.' : 'Provider-backed news stream with deduplicated headlines.'}
          statusLabel={news.degraded ? 'degraded' : messages.common.live.toLowerCase()}
          statusTone={news.degraded ? 'warning' : 'success'}
          meta={[
            { label: 'Articles', value: String(news.items.length) },
            { label: 'Snapshots', value: String(snapshots.length) },
            { label: messages.common.lastUpdated, value: formatDateTimeLabel(news.updatedAt, locale, messages.common.unavailable) },
          ]}
          actions={[{ href: '/invest', label: 'Open invest' }, { href: '/dashboard', label: messages.shell.nav.dashboard }]}
        />
      </Section>
      <Section className="dashboard-section">
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
    </>
  );
}
