import Link from 'next/link';
import type { Locale, SimulationLaneId } from '@repo/api-contracts';
import { AnalyticsTable } from '../../../components/tables/analytics-table';
import { Section } from '../../../components/ui/section';
import { WorkstationPageHeader } from '../../../components/asset/workstation-page-header';
import { CompactStatCard } from '../../../components/stats/compact-stat-card';
import { Card } from '../../../components/ui/card';
import { BrokerModeLaunchpad } from '../../../components/invest/broker-mode-launchpad';
import { PriceHistoryPanel } from '../../../components/charts/price-history-panel';
import {
  ResetSimulationAccountForm,
  SimulatedOrderForm,
  WatchlistToggleForm,
} from '../../../components/invest/simulation-action-form';
import type { TableColumn } from '../../../lib/dashboard/analytics-fixtures';
import { getMessages } from '../../../lib/i18n/messages';
import { formatDateTimeLabel, formatShortDateLabel } from '../../../lib/formatters';
import { getRequestLocale } from '../../../server/i18n/locale';
import {
  formatFreshnessLabel,
  formatUsdPrice,
  getQuoteTimestamp,
} from '../../../server/lib/quote-display';
import { getSimulationWorkstationStateForCurrentUser } from '../../../server/services/simulation-workstation-service';

export const dynamic = 'force-dynamic';

type PositionRow = {
  symbol: string;
  quantity: string;
  averageCost: string;
  marketPrice: string;
  allocation: string;
  unrealizedPnl: string;
};

type TransactionRow = {
  type: string;
  symbol: string;
  cashDelta: string;
  realizedPnl: string;
  createdAt: string;
};

type OrderRow = {
  side: string;
  symbol: string;
  quantity: string;
  executedPrice: string;
  grossAmount: string;
  createdAt: string;
};

type LaneRow = {
  lane: string;
  status: string;
  capitalLimit: string;
  allocated: string;
  available: string;
  activePositions: string;
  recentOrders: string;
};

function formatSignedCurrency(value: number, locale: Locale) {
  const formatted = formatUsdPrice(Math.abs(value), locale, 'Unavailable');
  return value > 0
    ? `+${formatted}`
    : value < 0
      ? `-${formatted}`
      : formatUsdPrice(0, locale, 'Unavailable');
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) {
    return '0.00%';
  }

  return `${value.toFixed(2)}%`;
}

function getAssetDetailHref(symbol: string, assetClass: 'stock' | 'etf' | 'crypto') {
  if (assetClass === 'stock') {
    return `/stocks/${symbol}`;
  }

  return assetClass === 'etf' ? '/invest/etfs' : '/invest/crypto';
}

export default async function SimulationPage({
  searchParams,
}: {
  searchParams?: Promise<{ session?: string; lane?: string }>;
}) {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const workstation = await getSimulationWorkstationStateForCurrentUser({
    sessionId: resolvedSearchParams?.session ?? null,
  });

  const portfolio = workstation.workspace;
  const requestedLaneId = (
    resolvedSearchParams?.lane === 'manual_stock_lane' ||
    resolvedSearchParams?.lane === 'manual_multi_asset_lane' ||
    resolvedSearchParams?.lane === 'ai_copilot_lane' ||
    resolvedSearchParams?.lane === 'signal_follow_lane' ||
    resolvedSearchParams?.lane === 'agent_sandbox_lane'
      ? resolvedSearchParams.lane
      : null
  ) as SimulationLaneId | null;

  const defaultLaneId =
    requestedLaneId ??
    workstation.session?.laneId ??
    'manual_stock_lane';

  const activeLaneId = workstation.session?.laneId ?? null;
  const activeSessionId = workstation.session?.id ?? null;

  const localizedStatusMessage = (() => {
    switch (workstation.workstationStatus) {
      case 'empty':
        return messages.simulation.statusEmpty;
      case 'running':
        return workstation.statusMessage || messages.simulation.statusRunning;
      case 'paused':
        return messages.simulation.statusPaused;
      case 'stopped':
        return messages.simulation.statusStopped;
      case 'failed':
        return workstation.statusMessage || messages.simulation.statusFailed;
      case 'error':
        return workstation.statusMessage || messages.simulation.statusError;
      case 'degraded':
        return workstation.statusMessage || messages.simulation.statusDegraded;
      default:
        return workstation.statusMessage;
    }
  })();

  const statusTone =
    workstation.workstationStatus === 'running'
      ? 'success'
      : workstation.workstationStatus === 'paused' || workstation.workstationStatus === 'degraded'
        ? 'warning'
        : workstation.workstationStatus === 'empty'
          ? 'info'
          : 'danger';

  const positionColumns: Array<TableColumn<PositionRow>> = [
    { key: 'symbol', label: messages.simulation.symbolColumn },
    { key: 'quantity', label: messages.simulation.quantityColumn, align: 'right' },
    { key: 'averageCost', label: messages.simulation.averageCostColumn, align: 'right' },
    { key: 'marketPrice', label: messages.simulation.priceColumn, align: 'right' },
    { key: 'allocation', label: 'Allocation', align: 'right' },
    { key: 'unrealizedPnl', label: messages.simulation.unrealizedPnlColumn, align: 'right' },
  ];

  const transactionColumns: Array<TableColumn<TransactionRow>> = [
    { key: 'type', label: messages.simulation.typeColumn },
    { key: 'symbol', label: messages.simulation.symbolColumn },
    { key: 'cashDelta', label: messages.simulation.cashDeltaColumn, align: 'right' },
    { key: 'realizedPnl', label: messages.simulation.realizedPnlColumn, align: 'right' },
    { key: 'createdAt', label: messages.simulation.createdColumn, align: 'right' },
  ];

  const orderColumns: Array<TableColumn<OrderRow>> = [
    { key: 'side', label: 'Side' },
    { key: 'symbol', label: messages.simulation.symbolColumn },
    { key: 'quantity', label: messages.simulation.quantityColumn, align: 'right' },
    { key: 'executedPrice', label: 'Executed', align: 'right' },
    { key: 'grossAmount', label: 'Gross', align: 'right' },
    { key: 'createdAt', label: messages.simulation.createdColumn, align: 'right' },
  ];

  const laneColumns: Array<TableColumn<LaneRow>> = [
    { key: 'lane', label: 'Broker / strategy lane' },
    { key: 'status', label: 'Status' },
    { key: 'capitalLimit', label: 'Lane limit', align: 'right' },
    { key: 'allocated', label: 'Allocated', align: 'right' },
    { key: 'available', label: 'Available', align: 'right' },
    { key: 'activePositions', label: 'Active positions', align: 'right' },
    { key: 'recentOrders', label: 'Recent orders', align: 'right' },
  ];

  const portfolioReturn =
    !portfolio || portfolio.summary.equityValue === 0
      ? 0
      : ((portfolio.summary.equityValue - 100000) / 100000) * 100;

  if (!portfolio) {
    return (
      <>
        <Section className="dashboard-section dashboard-section--hero">
          <WorkstationPageHeader
            eyebrow={messages.simulation.navLabel}
            title="Paper portfolio"
            description="Track fictive cash, live-marked stock holdings, and an auditable transaction journal in one simulation workspace."
            summary={messages.common.simulationDisclosure}
            statusLabel={workstation.workstationStatus}
            statusTone={statusTone}
            meta={[
              { label: messages.common.lastUpdated, value: messages.common.unavailable },
              { label: 'Total equity', value: messages.common.unavailable },
              { label: 'Available cash', value: messages.common.unavailable },
            ]}
            actions={[
              { href: '/stocks', label: 'Browse stocks' },
              { href: '/invest', label: messages.shell.nav.investHome },
              { href: '/dashboard', label: messages.shell.nav.dashboard },
            ]}
          />
        </Section>

        <Section className="dashboard-section">
          <BrokerModeLaunchpad
            baseCapitalUsd={100000}
            isAuthenticated
            simulationHref="/invest/simulation"
            returnTo="/invest/simulation"
            defaultLaneId={defaultLaneId}
            activeSessionId={activeSessionId}
            activeLaneId={activeLaneId}
            title="Choose a simulation lane and start it"
            description="This page becomes fully interactive after you start or resume a simulation lane. The selected lane will be opened immediately and attached to this workstation."
          />
        </Section>

        <Section className="dashboard-section">
          <Card className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">Session state</div>
                <h3>Simulation session required</h3>
                <p>{localizedStatusMessage}</p>
              </div>
            </div>
            <div className="analytics-card__body">
              <p>No active simulation workspace is attached yet.</p>
              <p>Click <strong>Start simulation</strong> above to create or resume a lane session and unlock trading actions.</p>
            </div>
          </Card>
        </Section>
      </>
    );
  }

  return (
    <>
      <Section className="dashboard-section dashboard-section--hero">
        <WorkstationPageHeader
          eyebrow={messages.simulation.navLabel}
          title="Paper portfolio"
          description="Track fictive cash, live-marked stock holdings, and an auditable transaction journal in one simulation workspace."
          summary={messages.common.simulationDisclosure}
          statusLabel={workstation.workstationStatus}
          statusTone={statusTone}
          meta={[
            {
              label: messages.common.lastUpdated,
              value: formatDateTimeLabel(portfolio.summary.updatedAt, locale),
            },
            {
              label: 'Total equity',
              value: formatUsdPrice(portfolio.summary.equityValue, locale, messages.common.unavailable),
            },
            {
              label: 'Available cash',
              value: formatUsdPrice(portfolio.summary.availableCash, locale, messages.common.unavailable),
            },
          ]}
          actions={[
            { href: '/stocks', label: 'Browse stocks' },
            { href: '/invest', label: messages.shell.nav.investHome },
            { href: '/dashboard', label: messages.shell.nav.dashboard },
          ]}
        />
      </Section>

      <Section className="dashboard-section">
        <BrokerModeLaunchpad
          baseCapitalUsd={portfolio.summary.initialCashBalance}
          isAuthenticated
          simulationHref="/invest/simulation"
          returnTo="/invest/simulation"
          defaultLaneId={defaultLaneId}
          activeSessionId={activeSessionId}
          activeLaneId={activeLaneId}
          title="Current simulation lane"
          description="You can resume the current lane, switch to another supported lane, or adjust lane-level capital before continuing simulated trading."
        />
      </Section>

      <Section className="dashboard-section">
        <Card className="analytics-card">
          <div className="analytics-card__header">
            <div>
              <div className="section__eyebrow">Session state</div>
              <h3>Session status: {workstation.workstationStatus}</h3>
              <p>{localizedStatusMessage}</p>
            </div>
          </div>
          <div className="analytics-card__body">
            <p>Session: {workstation.session?.id ?? messages.common.unavailable}</p>
            <p>Lane: {workstation.session?.laneId ?? messages.common.unavailable}</p>
            <p>Observation: {workstation.session?.observationStatus ?? messages.common.unavailable}</p>
            <p>Trading actions: {workstation.isReadOnly ? 'Read-only' : 'Enabled in simulation'}</p>
          </div>
        </Card>
      </Section>

      <Section className="dashboard-section">
        <div className="analytics-strip">
          <CompactStatCard label={messages.simulation.cashBalance} value={formatUsdPrice(portfolio.summary.cashBalance, locale, messages.common.unavailable)} detail="Total cash in the simulation account before reserve allocation." />
          <CompactStatCard label="Available cash" value={formatUsdPrice(portfolio.summary.availableCash, locale, messages.common.unavailable)} detail="Cash currently available for new simulated orders." />
          <CompactStatCard label="Reserved cash" value={formatUsdPrice(portfolio.summary.reservedCash, locale, messages.common.unavailable)} detail="Reserved lane capital (currently 0 in this release)." />
          <CompactStatCard label="Invested capital" value={formatUsdPrice(portfolio.summary.investedCapital, locale, messages.common.unavailable)} detail="Cost basis of all currently active simulated positions." />
          <CompactStatCard label="Total equity" value={formatUsdPrice(portfolio.summary.equityValue, locale, messages.common.unavailable)} detail="Cash plus the current market value of all open stock positions." />
          <CompactStatCard label={messages.simulation.portfolioValue} value={formatUsdPrice(portfolio.summary.portfolioValue, locale, messages.common.unavailable)} detail="Current market value of open stock positions." />
          <CompactStatCard label="Active investments" value={String(portfolio.summary.activeInvestmentCount)} detail="Open simulated positions currently running." />
          <CompactStatCard label="Closed investments" value={String(portfolio.summary.closedInvestmentCount)} detail="Previously open positions now fully closed." />
          <CompactStatCard label={messages.simulation.unrealizedPnl} value={formatSignedCurrency(portfolio.summary.unrealizedPnl, locale)} detail="Open-position gain or loss versus average cost." />
          <CompactStatCard label={messages.simulation.realizedPnl} value={formatSignedCurrency(portfolio.summary.realizedPnl, locale)} detail="Closed-position gains and losses already locked in by simulated sells." />
          <CompactStatCard label="Total return" value={formatPercent(portfolioReturn)} detail="Portfolio return versus the default 100,000 USD fictive starting balance." />
        </div>
      </Section>

      <Section className="dashboard-section dashboard-section--tinted">
        <div className="analytics-main-grid">
          <PriceHistoryPanel
            title="Equity curve"
            subtitle="Snapshot history of total paper-portfolio equity."
            points={workstation.equityCurve.map((point) => ({
              label: formatShortDateLabel(point.timestamp, locale),
              timestamp: point.timestamp,
              open: point.close,
              high: point.close,
              low: point.close,
              close: point.close,
              volume: null,
            }))}
            note="Snapshots are simulation-only and marked using the latest cached stock prices."
            emptyMessage="Portfolio history will appear after the worker or trade flow records more than one snapshot."
          />
          <Card className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">Simulation controls</div>
                <h3>Reset and portfolio state</h3>
                <p>{messages.common.simulationDisclosure}</p>
              </div>
            </div>
            <div className="analytics-card__body">
              <p>Active positions: {portfolio.summary.activeInvestmentCount}</p>
              <p>Closed positions: {portfolio.summary.closedInvestmentCount}</p>
              <p>Recorded snapshots: {portfolio.snapshots.length}</p>
              <p>Recent transactions: {portfolio.transactions.length}</p>
              <p>Recent orders: {portfolio.orders.length}</p>
            </div>
            <ResetSimulationAccountForm label={messages.simulation.resetAccount} />
          </Card>
        </div>
      </Section>

      <Section className="dashboard-section">
        <div className="analytics-two-grid analytics-two-grid--tables">
          <AnalyticsTable
            title={messages.simulation.positions}
            subtitle="Holdings are valued with the latest cached stock quote when available."
            columns={positionColumns}
            rows={portfolio.positions.map((position) => ({
              symbol: position.symbol,
              quantity: position.quantity.toFixed(4),
              averageCost: formatUsdPrice(position.averageCost, locale, messages.common.unavailable),
              marketPrice:
                position.marketPrice === null
                  ? messages.common.unavailable
                  : formatUsdPrice(position.marketPrice, locale, messages.common.unavailable),
              allocation:
                portfolio.summary.portfolioValue > 0
                  ? formatPercent((position.marketValue / portfolio.summary.portfolioValue) * 100)
                  : '0.00%',
              unrealizedPnl: formatSignedCurrency(position.unrealizedPnl, locale),
            }))}
            emptyMessage="No stock positions are open yet. Use the stock list below to start your paper portfolio."
            rowDetailsLabel={messages.table.rowDetails}
          />
          <AnalyticsTable
            title="Closed investments"
            subtitle="Fully exited positions with realized PnL history."
            columns={positionColumns}
            rows={portfolio.closedPositions.map((position) => ({
              symbol: position.symbol,
              quantity: position.quantity.toFixed(4),
              averageCost: formatUsdPrice(position.averageCost, locale, messages.common.unavailable),
              marketPrice: messages.common.unavailable,
              allocation: '0.00%',
              unrealizedPnl: formatSignedCurrency(position.realizedPnl, locale),
            }))}
            emptyMessage="No closed investments yet."
            rowDetailsLabel={messages.table.rowDetails}
          />
        </div>
      </Section>

      <Section className="dashboard-section">
        <div className="analytics-two-grid analytics-two-grid--tables">
          <AnalyticsTable
            title="Recent simulated orders"
            subtitle="Order journal separated from cash transactions for clearer trading-activity auditing."
            columns={orderColumns}
            rows={portfolio.orders.map((order) => ({
              side: order.side.toUpperCase(),
              symbol: order.symbol,
              quantity: order.quantity.toFixed(4),
              executedPrice: formatUsdPrice(order.executedPrice, locale, messages.common.unavailable),
              grossAmount: formatSignedCurrency(order.cashEffect, locale),
              createdAt: formatDateTimeLabel(order.createdAt, locale),
            }))}
            emptyMessage="No simulated orders yet."
            rowDetailsLabel={messages.table.rowDetails}
          />
          <AnalyticsTable
            title={messages.simulation.transactions}
            subtitle="Every simulated cash movement is recorded in the portfolio journal."
            columns={transactionColumns}
            rows={portfolio.transactions.map((transaction) => ({
              type: transaction.transactionType,
              symbol: transaction.symbol ?? 'USD',
              cashDelta: formatSignedCurrency(transaction.cashDelta, locale),
              realizedPnl: formatSignedCurrency(transaction.realizedPnl, locale),
              createdAt: formatDateTimeLabel(transaction.createdAt, locale),
            }))}
            emptyMessage={messages.simulation.emptyTransactions}
            rowDetailsLabel={messages.table.rowDetails}
          />
        </div>
      </Section>

      <Section className="dashboard-section dashboard-section--tinted">
        <div className="analytics-two-grid analytics-two-grid--tables">
          <AnalyticsTable
            title="Broker and strategy lanes"
            subtitle="Simulation-only activity buckets. Planned lanes do not execute any autonomous live trades."
            columns={laneColumns}
            rows={workstation.activityLanes.map((lane) => ({
              lane: lane.label,
              status:
                lane.status === 'active'
                  ? 'Active (simulation)'
                  : lane.status === 'limited'
                    ? 'Limited support'
                    : 'Planned',
              capitalLimit: formatUsdPrice(lane.capitalLimit, locale, messages.common.unavailable),
              allocated: formatUsdPrice(lane.allocatedCapital, locale, messages.common.unavailable),
              available: formatUsdPrice(lane.availableCapital, locale, messages.common.unavailable),
              activePositions: String(lane.activePositions),
              recentOrders: String(lane.recentOrders),
            }))}
            emptyMessage="No lane activity is available."
            rowDetailsLabel={messages.table.rowDetails}
          />
          <Card className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">Asset exposure</div>
                <h3>Active exposure by asset class</h3>
                <p>Watchlist symbols are separate from active investments and do not affect PnL totals.</p>
              </div>
            </div>
            <div className="analytics-card__body">
              {workstation.positionsByAssetClass.map((entry) => (
                <p key={entry.assetClass}>
                  {entry.assetClass.toUpperCase()}: {entry.activeCount} active positions,{' '}
                  {formatUsdPrice(entry.marketValue, locale, messages.common.unavailable)} market value
                </p>
              ))}
              <p>{messages.common.simulationDisclosure}</p>
            </div>
          </Card>
        </div>
      </Section>

      <Section className="dashboard-section">
        <header className="dashboard-section-heading">
          <div>
            <div className="section__eyebrow">Watchlist</div>
            <h2 className="dashboard-section-heading__title">Saved assets and quick actions</h2>
            <p className="dashboard-section-heading__description">
              Saved assets stay one click away from detail, buy, and sell actions across stocks, ETFs, and crypto.
            </p>
          </div>
        </header>
        <div className="analytics-two-grid">
          {workstation.watchlist.length > 0 ? (
            workstation.watchlist.map((item) => (
              <Card key={item.asset.assetId} className="analytics-card">
                <div className="analytics-card__header">
                  <div>
                    <div className="section__eyebrow">{item.asset.category}</div>
                    <h3>{item.asset.symbol}</h3>
                    <p>{item.asset.name}</p>
                  </div>
                </div>
                <div className="analytics-card__body">
                  <p>{formatUsdPrice(item.quote?.price ?? null, locale, messages.common.unavailable)}</p>
                  <p>{formatFreshnessLabel(getQuoteTimestamp(item.quote), locale, messages.common.unavailable)}</p>
                  <p>{item.asset.thesis}</p>
                </div>
                <div className="analytics-card__action-grid">
                  <Link href={getAssetDetailHref(item.asset.symbol, item.asset.assetClass)} className="button button--secondary">
                    {messages.common.details}
                  </Link>
                  <SimulatedOrderForm
                    assetId={item.asset.assetId}
                    symbol={item.asset.symbol}
                    assetClass={item.asset.assetClass}
                    side="buy"
                    strategyLaneId={workstation.session?.laneId ?? 'manual_stock_lane'}
                    label={messages.dashboard.buySimulated}
                    simulationSessionId={workstation.session?.id}
                    disabled={workstation.isReadOnly}
                    disabledReason={workstation.isReadOnly ? workstation.statusMessage : undefined}
                  />
                  <SimulatedOrderForm
                    assetId={item.asset.assetId}
                    symbol={item.asset.symbol}
                    assetClass={item.asset.assetClass}
                    side="sell"
                    strategyLaneId={workstation.session?.laneId ?? 'manual_stock_lane'}
                    label={messages.dashboard.sellSimulated}
                    simulationSessionId={workstation.session?.id}
                    disabled={workstation.isReadOnly}
                    disabledReason={workstation.isReadOnly ? workstation.statusMessage : undefined}
                  />
                </div>
              </Card>
            ))
          ) : (
            <Card className="analytics-card">
              <div className="analytics-card__header">
                <div>
                  <div className="section__eyebrow">Watchlist</div>
                  <h3>No saved assets yet</h3>
                  <p>Save stocks, ETFs, or crypto assets to keep a multi-asset shortlist inside your simulation shell.</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </Section>

      <Section className="dashboard-section dashboard-section--tinted">
        <header className="dashboard-section-heading">
          <div>
            <div className="section__eyebrow">{messages.simulation.assetUniverse}</div>
            <h2 className="dashboard-section-heading__title">Tradable simulation universe</h2>
            <p className="dashboard-section-heading__description">
              Simulation trading now covers stocks, ETFs, and crypto. Live execution remains separately gated by broker readiness and policy controls.
            </p>
          </div>
        </header>
        <div className="analytics-two-grid">
          {workstation.tradableAssets.map((entry) => (
            <Card key={entry.asset.assetId} className="analytics-card">
              <div className="analytics-card__header">
                <div>
                  <div className="section__eyebrow">{entry.asset.sector ?? entry.asset.category}</div>
                  <h3>{entry.asset.name}</h3>
                  <p>{entry.asset.symbol}</p>
                </div>
              </div>
              <div className="analytics-card__body">
                <p>{formatUsdPrice(entry.quote?.price ?? null, locale, messages.common.unavailable)}</p>
                <p>{formatFreshnessLabel(getQuoteTimestamp(entry.quote), locale, messages.common.unavailable)}</p>
                <p>{entry.asset.thesis}</p>
                <p>{entry.asset.riskSummary}</p>
              </div>
              <div className="analytics-card__action-grid">
                <Link href={getAssetDetailHref(entry.asset.symbol, entry.asset.assetClass)} className="button button--secondary">
                  {messages.common.details}
                </Link>
                <WatchlistToggleForm
                  assetId={entry.asset.assetId}
                  symbol={entry.asset.symbol}
                  assetClass={entry.asset.assetClass}
                  active={entry.isWatched}
                  label={
                    entry.isWatched
                      ? messages.dashboard.removeFromWatchlist
                      : messages.dashboard.addToWatchlist
                  }
                />
                <SimulatedOrderForm
                  assetId={entry.asset.assetId}
                  symbol={entry.asset.symbol}
                  assetClass={entry.asset.assetClass}
                  side="buy"
                  strategyLaneId={workstation.session?.laneId ?? 'manual_stock_lane'}
                  label={messages.dashboard.buySimulated}
                  simulationSessionId={workstation.session?.id}
                  disabled={workstation.isReadOnly}
                  disabledReason={workstation.isReadOnly ? workstation.statusMessage : undefined}
                />
                <SimulatedOrderForm
                  assetId={entry.asset.assetId}
                  symbol={entry.asset.symbol}
                  assetClass={entry.asset.assetClass}
                  side="sell"
                  strategyLaneId={workstation.session?.laneId ?? 'manual_stock_lane'}
                  label={messages.dashboard.sellSimulated}
                  simulationSessionId={workstation.session?.id}
                  disabled={workstation.isReadOnly}
                  disabledReason={workstation.isReadOnly ? workstation.statusMessage : undefined}
                />
              </div>
            </Card>
          ))}
        </div>
      </Section>
    </>
  );
}