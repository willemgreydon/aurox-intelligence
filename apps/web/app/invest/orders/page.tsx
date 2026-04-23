import Link from 'next/link';
import type { Locale } from '@repo/api-contracts';
import { Section } from '../../../components/ui/section';
import { WorkstationPageHeader } from '../../../components/asset/workstation-page-header';
import { CompactStatCard } from '../../../components/stats/compact-stat-card';
import { Card } from '../../../components/ui/card';
import { AnalyticsTable } from '../../../components/tables/analytics-table';
import type { TableColumn } from '../../../lib/dashboard/analytics-fixtures';
import { formatDateTimeLabel } from '../../../lib/formatters';
import { getRequestLocale } from '../../../server/i18n/locale';
import { formatUsdPrice } from '../../../server/lib/quote-display';
import { requireCurrentSession } from '../../../server/auth/session';
import { getSimulationWorkstationStateForCurrentUser } from '../../../server/services/simulation-workstation-service';

export const dynamic = 'force-dynamic';

type OrderRow = {
  side: string;
  symbol: string;
  assetClass: string;
  status: string;
  quantity: string;
  executedPrice: string;
  grossAmount: string;
  cashEffect: string;
  realizedPnl: string;
  source: string;
  executedAt: string;
};

type TransactionRow = {
  type: string;
  symbol: string;
  description: string;
  cashDelta: string;
  realizedPnl: string;
  createdAt: string;
};

function formatSignedUsd(value: number, locale: Locale): string {
  const formatted = formatUsdPrice(Math.abs(value), locale, '—');
  return value > 0 ? `+${formatted}` : value < 0 ? `-${formatted}` : formatted;
}

function parseSource(notes: string | null): string {
  if (!notes) return 'Manual';
  if (notes.includes('ai_autonomous')) return 'AI autonomous';
  if (notes.includes('ai_assisted') || notes.includes('ai_suggested')) return 'AI suggested';
  return 'Manual';
}

export default async function OrdersPage() {
  await requireCurrentSession('/login');
  const locale = await getRequestLocale();
  const workstation = await getSimulationWorkstationStateForCurrentUser({ sessionId: null });
  const workspace = workstation.workspace;
  const orders = workspace?.orders ?? [];
  const transactions = workspace?.transactions ?? [];

  const filledOrders = orders.filter((o) => o.status === 'filled');
  const todayPrefix = new Date().toISOString().slice(0, 10);
  const todayOrders = filledOrders.filter((o) => o.executedAt.slice(0, 10) === todayPrefix);
  const totalRealizedPnl = filledOrders.reduce((sum, o) => sum + o.realizedPnl, 0);

  const orderColumns: Array<TableColumn<OrderRow>> = [
    { key: 'side', label: 'Side' },
    { key: 'symbol', label: 'Symbol' },
    { key: 'assetClass', label: 'Class' },
    { key: 'status', label: 'Status' },
    { key: 'quantity', label: 'Quantity', align: 'right' },
    { key: 'executedPrice', label: 'Fill price', align: 'right' },
    { key: 'grossAmount', label: 'Gross', align: 'right' },
    { key: 'cashEffect', label: 'Cash effect', align: 'right' },
    { key: 'realizedPnl', label: 'Realized P&L', align: 'right' },
    { key: 'source', label: 'Source' },
    { key: 'executedAt', label: 'Executed', align: 'right' },
  ];

  const transactionColumns: Array<TableColumn<TransactionRow>> = [
    { key: 'type', label: 'Type' },
    { key: 'symbol', label: 'Asset' },
    { key: 'description', label: 'Description' },
    { key: 'cashDelta', label: 'Cash Δ', align: 'right' },
    { key: 'realizedPnl', label: 'Realized P&L', align: 'right' },
    { key: 'createdAt', label: 'Time', align: 'right' },
  ];

  const statusTone =
    workstation.workstationStatus === 'running'
      ? 'success'
      : workstation.workstationStatus === 'empty'
        ? 'info'
        : workstation.workstationStatus === 'paused' || workstation.workstationStatus === 'degraded'
          ? 'warning'
          : 'danger';

  return (
    <>
      <Section className="dashboard-section dashboard-section--hero">
        <WorkstationPageHeader
          eyebrow="Invest / Orders"
          title="Order history"
          description="All simulation orders and the full transaction journal. Every fill, reset, and funding event is recorded here."
          summary={
            workspace
              ? `${filledOrders.length} total filled order${filledOrders.length !== 1 ? 's' : ''} · ${todayOrders.length} today · cumulative realized P&L ${formatSignedUsd(totalRealizedPnl, locale)}`
              : 'No simulation account active. Start a session to begin placing orders.'
          }
          statusLabel={workstation.workstationStatus}
          statusTone={statusTone}
          meta={[
            { label: 'Total orders', value: String(filledOrders.length) },
            { label: 'Orders today', value: String(todayOrders.length) },
            { label: 'Realized P&L', value: formatSignedUsd(totalRealizedPnl, locale) },
          ]}
          actions={[
            { href: '/invest', label: 'Invest hub' },
            { href: '/invest/simulation', label: 'Simulation' },
            { href: '/invest/portfolio', label: 'Portfolio' },
            { href: '/invest/overview', label: 'Overview' },
          ]}
        />
      </Section>

      <Section className="dashboard-section">
        <div className="analytics-strip">
          <CompactStatCard
            label="Total filled"
            value={String(filledOrders.length)}
            detail="Cumulative filled simulation orders across all sessions."
          />
          <CompactStatCard
            label="Today"
            value={String(todayOrders.length)}
            detail="Orders filled in the current calendar day."
          />
          <CompactStatCard
            label="Buy orders"
            value={String(filledOrders.filter((o) => o.side === 'buy').length)}
            detail="Total filled buy orders."
          />
          <CompactStatCard
            label="Sell orders"
            value={String(filledOrders.filter((o) => o.side === 'sell').length)}
            detail="Total filled sell orders."
          />
          <CompactStatCard
            label="Realized P&L"
            value={formatSignedUsd(totalRealizedPnl, locale)}
            detail="Cumulative realized P&L from all sell orders."
          />
        </div>
      </Section>

      <Section className="dashboard-section">
        <AnalyticsTable
          title="Filled orders"
          subtitle="All executed simulation orders. Cash effect is the net cash impact: negative for buys, positive for sells. Source is derived from the order notes field."
          columns={orderColumns}
          rows={orders.map((order) => ({
            side: order.side.toUpperCase(),
            symbol: order.symbol,
            assetClass: order.assetClass,
            status: order.status,
            quantity: order.quantity.toFixed(4),
            executedPrice: formatUsdPrice(order.executedPrice, locale, '—'),
            grossAmount: formatUsdPrice(order.grossAmount, locale, '—'),
            cashEffect: formatSignedUsd(order.cashEffect, locale),
            realizedPnl: order.realizedPnl !== 0 ? formatSignedUsd(order.realizedPnl, locale) : '—',
            source: parseSource(order.notes),
            executedAt: formatDateTimeLabel(order.executedAt, locale),
          }))}
          emptyMessage="No orders yet. Start a simulation session and place your first order."
          rowDetailsLabel="Details"
        />
      </Section>

      <Section className="dashboard-section dashboard-section--tinted">
        <AnalyticsTable
          title="Transaction journal"
          subtitle="Full double-entry journal of every cash movement. Includes initial funding, all buys and sells, and account resets."
          columns={transactionColumns}
          rows={transactions.map((tx) => ({
            type: tx.transactionType,
            symbol: tx.symbol ?? '—',
            description: tx.description,
            cashDelta: formatSignedUsd(tx.cashDelta, locale),
            realizedPnl: tx.realizedPnl !== 0 ? formatSignedUsd(tx.realizedPnl, locale) : '—',
            createdAt: formatDateTimeLabel(tx.createdAt, locale),
          }))}
          emptyMessage="No transactions recorded yet."
          rowDetailsLabel="Details"
        />
      </Section>

      {workspace === null ? (
        <Section className="dashboard-section">
          <Card className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">Getting started</div>
                <h3>No simulation account</h3>
                <p>Order history appears here once you start a simulation session.</p>
              </div>
            </div>
            <div className="analytics-card__action-grid">
              <Link href="/invest/simulation" className="button button--primary">
                Start simulation
              </Link>
            </div>
          </Card>
        </Section>
      ) : null}
    </>
  );
}
