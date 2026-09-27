import type { Locale } from '@repo/api-contracts';
import Link from 'next/link';
import { Section } from '../../ui/section';
import { formatShortDateLabel } from '../../../lib/formatters';

export type ActivityOrder = {
  symbol: string;
  side: 'buy' | 'sell';
  status: 'filled' | 'rejected' | 'cancelled';
  quantity: number;
  executedPrice: number;
  realizedPnl: number;
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
  notional: string;
  realized: string;
};

function sideLabel(side: ActivityOrder['side'], labels: RecentActivityLabels): string {
  return side === 'buy' ? labels.buy : labels.sell;
}

function statusLabel(status: ActivityOrder['status'], labels: RecentActivityLabels): string {
  if (status === 'filled') return labels.filled;
  if (status === 'rejected') return labels.rejected;
  return labels.cancelled;
}

function money(value: number): string {
  return `$${Math.abs(value).toFixed(2)}`;
}

function signedMoney(value: number): string {
  return `${value >= 0 ? '+' : '−'}${money(value)}`;
}

/**
 * The user's most recent simulation orders — a personal activity strip with the
 * order notional and realised P&L per row. Renders only when there is real
 * activity (the caller passes null/[] otherwise).
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
    <Section className="home-live home-activity">
      <header className="home-live__header">
        <div className="section__eyebrow">{labels.eyebrow}</div>
        <h2 className="section__title home-live__title">{labels.title}</h2>
      </header>

      {rows.length === 0 ? (
        <p className="home-live__empty">{labels.empty}</p>
      ) : (
        <ul className="home-activity__list">
          {rows.map((order, index) => {
            const notional = order.quantity * order.executedPrice;
            const hasRealized = order.status === 'filled' && Math.abs(order.realizedPnl) > 0.005;
            return (
              <li key={`${order.symbol}-${order.createdAt}-${index}`} className="home-activity__row">
                <span className={`home-activity__side home-activity__side--${order.side}`}>
                  <span className="home-activity__side-arrow" aria-hidden="true">{order.side === 'buy' ? '↗' : '↘'}</span>
                  {sideLabel(order.side, labels)}
                </span>
                <Link href={`/stocks/${order.symbol}`} className="home-activity__detail">
                  <span className="tabular-nums">{order.quantity}</span>{' '}
                  <span className="home-activity__symbol">{order.symbol}</span>{' '}
                  <span className="home-activity__at">@ <span className="tabular-nums">${order.executedPrice.toFixed(2)}</span></span>
                </Link>
                <span className="home-activity__notional">
                  <span className="home-activity__meta-label">{labels.notional}</span>
                  <span className="tabular-nums">{money(notional)}</span>
                </span>
                <span className="home-activity__realized">
                  {hasRealized ? (
                    <>
                      <span className="home-activity__meta-label">{labels.realized}</span>
                      <span className={`tabular-nums ${order.realizedPnl >= 0 ? 'is-positive' : 'is-negative'}`}>
                        {signedMoney(order.realizedPnl)}
                      </span>
                    </>
                  ) : null}
                </span>
                <span className={`home-activity__status home-activity__status--${order.status}`}>
                  {statusLabel(order.status, labels)}
                </span>
                <span className="home-activity__time">{formatShortDateLabel(order.createdAt, locale)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}
