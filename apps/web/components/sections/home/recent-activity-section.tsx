import type { Locale } from '@repo/api-contracts';
import { Section } from '../../ui/section';
import { formatShortDateLabel } from '../../../lib/formatters';

export type ActivityOrder = {
  symbol: string;
  side: 'buy' | 'sell';
  status: 'filled' | 'rejected' | 'cancelled';
  quantity: number;
  executedPrice: number;
  createdAt: string;
};

export type RecentActivityLabels = {
  eyebrow: string;
  title: string;
  empty: string;
  buy: string;
  sell: string;
  filled: string;
  rejected: string;
  cancelled: string;
};

function sideLabel(side: ActivityOrder['side'], labels: RecentActivityLabels): string {
  return side === 'buy' ? labels.buy : labels.sell;
}

function statusLabel(status: ActivityOrder['status'], labels: RecentActivityLabels): string {
  if (status === 'filled') return labels.filled;
  if (status === 'rejected') return labels.rejected;
  return labels.cancelled;
}

/**
 * The user's most recent simulation orders — a personal activity strip. Renders
 * only when there is real activity (the caller passes null/[] otherwise).
 */
export function RecentActivitySection({
  orders,
  labels,
  locale,
}: {
  orders: ActivityOrder[];
  labels: RecentActivityLabels;
  locale: Locale;
}) {
  const rows = orders.slice(0, 5);

  return (
    <Section className="section home-live home-activity">
      <div className="shell-container">
        <header className="home-live__header">
          <div className="section__eyebrow">{labels.eyebrow}</div>
          <h2 className="section__title home-live__title">{labels.title}</h2>
        </header>

        {rows.length === 0 ? (
          <p className="home-live__empty">{labels.empty}</p>
        ) : (
          <ul className="home-activity__list">
            {rows.map((order, index) => (
              <li key={`${order.symbol}-${order.createdAt}-${index}`} className="home-activity__row">
                <span className={`home-activity__side home-activity__side--${order.side}`}>
                  {sideLabel(order.side, labels)}
                </span>
                <span className="home-activity__detail">
                  <span className="tabular-nums">{order.quantity}</span>{' '}
                  <span className="home-activity__symbol">{order.symbol}</span>{' '}
                  <span className="home-activity__at">@ <span className="tabular-nums">${order.executedPrice.toFixed(2)}</span></span>
                </span>
                <span className={`home-activity__status home-activity__status--${order.status}`}>
                  {statusLabel(order.status, labels)}
                </span>
                <span className="home-activity__time">{formatShortDateLabel(order.createdAt, locale)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Section>
  );
}
