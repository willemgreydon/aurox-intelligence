import { Section } from '../../components/ui/section';
import { WorkstationPageHeader } from '../../components/asset/workstation-page-header';
import { Card } from '../../components/ui/card';
import { getNewsStreamData } from '../../server/services/news-service';
import { getRequestLocale } from '../../server/i18n/locale';
import { getMessages } from '../../lib/i18n/messages';
import { formatDateTimeLabel } from '../../lib/formatters';

export const dynamic = 'force-dynamic';

export default async function NewsPage() {
  const [news, locale] = await Promise.all([getNewsStreamData(), getRequestLocale()]);
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
            { label: messages.common.lastUpdated, value: formatDateTimeLabel(news.updatedAt, locale, messages.common.unavailable) },
          ]}
          actions={[{ href: '/invest', label: 'Open invest' }, { href: '/dashboard', label: messages.shell.nav.dashboard }]}
        />
      </Section>
      <Section className="dashboard-section">
        <div className="analytics-two-grid">
          {news.items.slice(0, 40).map((item) => (
            <Card className="analytics-card" key={item.id}>
              <div className="analytics-card__header">
                <div>
                  <div className="section__eyebrow">{item.source}</div>
                  <h3>{item.symbol}</h3>
                </div>
                <span className="status-pill status-pill--info">{formatDateTimeLabel(item.publishedAt, locale, messages.common.unavailable)}</span>
              </div>
              <div className="analytics-card__body">
                <p><strong>{item.title}</strong></p>
                <p>{item.summary || 'No summary available.'}</p>
                <p>Sentiment: {typeof item.sentimentScore === 'number' ? item.sentimentScore.toFixed(2) : 'n/a'} | Impact: {typeof item.impactScore === 'number' ? item.impactScore.toFixed(2) : 'n/a'}</p>
                <a href={item.url} target="_blank" rel="noreferrer">Read source</a>
              </div>
            </Card>
          ))}
        </div>
      </Section>
    </>
  );
}
