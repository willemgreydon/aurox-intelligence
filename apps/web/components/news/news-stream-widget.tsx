import Link from 'next/link';
import type { NewsStreamResponse } from '@repo/api-contracts';
import { Card } from '../ui/card';

type NewsStreamWidgetProps = {
  news: NewsStreamResponse;
  title?: string;
};

export function NewsStreamWidget({ news, title = 'Market News' }: NewsStreamWidgetProps) {
  const top = news.items.slice(0, 4);
  return (
    <Card className="analytics-card">
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
        {top.length > 0 ? (
          <ul className="detail-slot-card__list">
            {top.map((item) => (
              <li key={item.id}>
                <strong>{item.symbol}</strong>: <a href={item.url} target="_blank" rel="noreferrer">{item.title}</a>
              </li>
            ))}
          </ul>
        ) : (
          <p>No news items available.</p>
        )}
      </div>
      <div className="analytics-card__action-grid">
        <Link href="/news" className="button button--secondary">Open News Stream</Link>
      </div>
    </Card>
  );
}
