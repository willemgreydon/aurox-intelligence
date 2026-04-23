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

type OpenPositionRow = {
  symbol: string;
  assetClass: string;
  quantity: string;
  avgCost: string;
  lastPrice: string;
  marketValue: string;
  costBasis: string;
  unrealizedPnl: string;
  allocation: string;
};

type ClosedPositionRow = {
  symbol: string;
  assetClass: string;
  realizedPnl: string;
  closedAt: string;
};

function formatSignedUsd(value: number, locale: Locale): string {
  const formatted = formatUsdPrice(Math.abs(value), locale, '—');
  return value > 0 ? `+${formatted}` : value < 0 ? `-${formatted}` : formatted;
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '0.00%';
  return `${value.toFixed(2)}%`;
}

export default async function PortfolioPage() {
  await requireCurrentSession('/login');
  const locale = await getRequestLocale();
  const workstation = await getSimulationWorkstationStateForCurrentUser({ sessionId: null });
  const workspace = workstation.workspace;
  const summary = workspace?.summary ?? null;
  const totalMarketValue = summary?.portfolioValue ?? 0;

  const openColumns: Array<TableColumn<OpenPositionRow>> = [
    { key: 'symbol', label: 'Symbol' },
    { key: 'assetClass', label: 'Class' },
    { key: 'quantity', label: 'Quantity', align: 'right' },
    { key: 'avgCost', label: 'Avg cost', align: 'right' },
    { key: 'lastPrice', label: 'Last price', align: 'right' },
    { key: 'marketValue', label: 'Market value', align: 'right' },
    { key: 'unrealizedPnl', label: 'Unrealized P&L', align: 'right' },
    { key: 'allocation', label: 'Allocation', align: 'right' },
  ];

  const closedColumns: Array<TableColumn<ClosedPositionRow>> = [
    { key: 'symbol', label: 'Symbol' },
    { key: 'assetClass', label: 'Class' },
    { key: 'realizedPnl', label: 'Realized P&L', align: 'right' },
    { key: 'closedAt', label: 'Closed at', align: 'right' },
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
          eyebrow="Invest / Portfolio"
          title="Simulation portfolio"
          description="Open and closed positions with live mark-to-market pricing. Values update from latest available quotes."
          summary={
            summary
              ? `${summary.positionCount} open position${summary.positionCount !== 1 ? 's' : ''} · ${formatUsdPrice(summary.portfolioValue, locale, '—')} market value · ${formatSignedUsd(summary.unrealizedPnl, locale)} unrealized P&L`
              : 'No simulation account active. Start a session to begin tracking positions.'
          }
          statusLabel={workstation.workstationStatus}
          statusTone={statusTone}
          meta={[
            { label: 'Market value', value: summary ? formatUsdPrice(summary.portfolioValue, locale, '—') : '—' },
            { label: 'Cash balance', value: summary ? formatUsdPrice(summary.cashBalance, locale, '—') : '—' },
            { label: 'Equity', value: summary ? formatUsdPrice(summary.equityValue, locale, '—') : '—' },
          ]}
          actions={[
            { href: '/invest', label: 'Invest hub' },
            { href: '/invest/simulation', label: 'Simulation' },
            { href: '/invest/orders', label: 'Orders' },
            { href: '/invest/overview', label: 'Overview' },
          ]}
        />
      </Section>

      <Section className="dashboard-section">
        <div className="analytics-strip">
          <CompactStatCard
            label="Equity"
            value={summary ? formatUsdPrice(summary.equityValue, locale, '—') : '—'}
            detail="Cash plus current market value of all open positions."
          />
          <CompactStatCard
            label="Market value"
            value={summary ? formatUsdPrice(summary.portfolioValue, locale, '—') : '—'}
            detail="Sum of market values for all open positions."
          />
          <CompactStatCard
            label="Cash balance"
            value={summary ? formatUsdPrice(summary.cashBalance, locale, '—') : '—'}
            detail="Available simulation cash after all executed orders."
          />
          <CompactStatCard
            label="Unrealized P&L"
            value={summary ? formatSignedUsd(summary.unrealizedPnl, locale) : '—'}
            detail="Floating P&L on open positions based on latest prices."
          />
          <CompactStatCard
            label="Realized P&L"
            value={summary ? formatSignedUsd(summary.realizedPnl, locale) : '—'}
            detail="Cumulative P&L from all closed positions."
          />
        </div>
      </Section>

      <Section className="dashboard-section">
        <AnalyticsTable
          title="Open positions"
          subtitle="Active simulation positions. Allocation is each position's market value as a percentage of total portfolio market value. Unrealized P&L uses the latest available market price; falls back to average cost when price data is unavailable."
          columns={openColumns}
          rows={(workspace?.positions ?? []).map((pos) => {
            const allocation = totalMarketValue > 0 ? (pos.marketValue / totalMarketValue) * 100 : 0;
            return {
              symbol: pos.symbol,
              assetClass: pos.assetClass,
              quantity: pos.quantity.toFixed(4),
              avgCost: formatUsdPrice(pos.averageCost, locale, '—'),
              lastPrice: pos.marketPrice !== null ? formatUsdPrice(pos.marketPrice, locale, '—') : '—',
              marketValue: formatUsdPrice(pos.marketValue, locale, '—'),
              costBasis: formatUsdPrice(pos.costBasis, locale, '—'),
              unrealizedPnl: formatSignedUsd(pos.unrealizedPnl, locale),
              allocation: formatPercent(allocation),
            };
          })}
          emptyMessage="No open positions. Start a simulation session and place buy orders to build your portfolio."
          rowDetailsLabel="Details"
        />
      </Section>

      {(workspace?.closedPositions ?? []).length > 0 ? (
        <Section className="dashboard-section dashboard-section--tinted">
          <AnalyticsTable
            title="Closed positions"
            subtitle="Fully exited positions and their realized P&L contribution."
            columns={closedColumns}
            rows={(workspace?.closedPositions ?? []).map((pos) => ({
              symbol: pos.symbol,
              assetClass: pos.assetClass,
              realizedPnl: formatSignedUsd(pos.realizedPnl, locale),
              closedAt: pos.closedAt ? formatDateTimeLabel(pos.closedAt, locale) : '—',
            }))}
            emptyMessage="No closed positions yet."
            rowDetailsLabel="Details"
          />
        </Section>
      ) : null}

      {workspace === null ? (
        <Section className="dashboard-section">
          <Card className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">Getting started</div>
                <h3>No simulation account</h3>
                <p>
                  Your simulation portfolio will appear here once you start a session and place your first order.
                </p>
              </div>
            </div>
            <div className="analytics-card__action-grid">
              <Link href="/invest/simulation" className="button button--primary">
                Start simulation
              </Link>
              <Link href="/invest/broker-modes" className="button button--secondary">
                Choose broker mode
              </Link>
            </div>
          </Card>
        </Section>
      ) : null}
    </>
  );
}
