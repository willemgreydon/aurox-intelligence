import Link from 'next/link';
import type { Locale, SimulationLaneId } from '@repo/api-contracts';
import { AnalyticsTable } from '../../../components/tables/analytics-table';
import { Section } from '../../../components/ui/section';
import { WorkstationPageHeader } from '../../../components/asset/workstation-page-header';
import { CompactStatCard } from '../../../components/stats/compact-stat-card';
import { Card } from '../../../components/ui/card';
import { BrokerModeLaunchpad } from '../../../components/invest/broker-mode-launchpad';
import { PriceHistoryPanel } from '../../../components/charts/price-history-panel';
import { InvestableAssetCard } from '../../../components/invest/investable-asset-card';
import { MarketAssetRow } from '../../../components/invest/market-asset-row';
import { MarketViewToggle, type MarketViewMode } from '../../../components/invest/market-view-toggle';
import { QuickTradeActions } from '../../../components/invest/quick-trade-actions';
import {
  SimulatedOrderForm,
} from '../../../components/invest/simulation-action-form';
import { SimulationControlsCard } from '../../../components/invest/simulation-controls-card';
import { SimulationJournalTable } from '../../../components/invest/simulation-journal-table';
import type { TableColumn } from '../../../lib/dashboard/analytics-fixtures';
import { getMessages } from '../../../lib/i18n/messages';
import { formatDateTimeLabel, formatShortDateLabel } from '../../../lib/formatters';
import { getRequestLocale } from '../../../server/i18n/locale';
import {
  formatFreshnessLabel,
  formatPercentChange,
  formatUsdPrice,
  getQuoteTimestamp,
} from '../../../server/lib/quote-display';
import { getSimulationWorkstationStateForCurrentUser } from '../../../server/services/simulation-workstation-service';
import { loadMiniHistorySeries } from '../../../server/services/stock-simulation-service';
import { checkAiSimulationAgentAvailability } from '../../../server/services/ai-simulation-agent-service';
import { getMicroTradingGuardrailsForDisplay } from '../../../server/services/simulation-service';
import { AiSimulationAgentPanel } from '../../../components/invest/ai-simulation-agent-panel';
import { getSimulationJournalRowsForCurrentUser } from '../../../server/services/simulation-journal-service';
import { parsePreparedSimulationTicket, resolveTradeDisabledReason } from '../../../lib/simulation-prepare';
import { Disclosure } from '../../../components/ui/disclosure';
import { IntelligenceAnalysisTabs, type IntelligenceTab } from '../../../components/portfolio/intelligence-analysis-tabs';
import { SectionHeader } from '../../../components/ui/section-header';
import { assertSerializableProps } from '../../../lib/assert-serializable-props';
import { getAssetInspectHref } from '../../../lib/market-routes';
import { getMacroIntelligenceViewModel } from '../../../server/services/macro-intelligence-service';
import { evaluateSimulationQuoteUsability } from '../../../server/services/simulation-quote-usability';

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

function laneSupportsAssetClass(_laneId: SimulationLaneId, assetClass: 'stock' | 'etf' | 'crypto') {
  // Manual simulation lanes support stocks, ETFs, and crypto.
  return assetClass === 'stock' || assetClass === 'etf' || assetClass === 'crypto';
}

function resolvePreparedTicketLane(input: {
  preparedLane: SimulationLaneId;
  activeLane: SimulationLaneId | null;
  assetClass: 'stock' | 'etf' | 'crypto';
}) {
  if (!input.activeLane || input.preparedLane === input.activeLane) {
    return {
      lane: input.preparedLane,
      autoNormalized: false,
    };
  }

  if (laneSupportsAssetClass(input.activeLane, input.assetClass)) {
    return {
      lane: input.activeLane,
      autoNormalized: true,
    };
  }

  return {
    lane: input.preparedLane,
    autoNormalized: false,
  };
}

function formatSignedCurrency(value: number, locale: Locale, currency: 'USD' | 'EUR') {
  const formatted = formatCashCurrency(Math.abs(value), locale, currency);
  return value > 0
    ? `+${formatted}`
    : value < 0
      ? `-${formatted}`
      : formatCashCurrency(0, locale, currency);
}

function formatCashCurrency(value: number, locale: Locale, currency: 'USD' | 'EUR') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) {
    return '0.00%';
  }

  return `${value.toFixed(2)}%`;
}

function getAssetDetailHref(symbol: string, assetClass: 'stock' | 'etf' | 'crypto') {
  return getAssetInspectHref({ symbol, assetClass });
}

export default async function SimulationPage({
  searchParams,
}: {
  searchParams?: Promise<{ session?: string; lane?: string; assetView?: string; tab?: string; intent?: string; side?: string; symbol?: string; assetClass?: string; source?: string }>;
}) {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const assetViewMode: MarketViewMode =
    resolvedSearchParams?.assetView === 'list' ? 'list' : 'grid';

  const workstation = await getSimulationWorkstationStateForCurrentUser({
    sessionId: resolvedSearchParams?.session ?? null,
    assetLimit: 120,
    watchlistLimit: 40,
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
  const sparklineSymbols = [
    ...new Set([
      ...workstation.watchlist.map((item) => item.asset.symbol),
      ...workstation.tradableAssets.map((item) => item.asset.symbol),
    ]),
  ];
  // Run sparkline history and journal fetch in parallel — neither depends on
  // the other, and both can be slow under provider or DB pressure.
  const [sparklineBySymbol, journalRows] = await Promise.all([
    loadMiniHistorySeries(sparklineSymbols, 24),
    getSimulationJournalRowsForCurrentUser(60),
  ]);
  const macroContext = await getMacroIntelligenceViewModel();
  const heldSymbols = new Set(portfolio?.positions.map((position) => position.symbol) ?? []);
  const heldPositionsBySymbol = new Map(portfolio?.positions.map((position) => [position.symbol, position]) ?? []);
  const aiAgentAvailability = checkAiSimulationAgentAvailability();
  const microTrading = getMicroTradingGuardrailsForDisplay();
  const preparedTicket = parsePreparedSimulationTicket({
    intent: resolvedSearchParams?.intent,
    side: resolvedSearchParams?.side,
    symbol: resolvedSearchParams?.symbol,
    assetClass: resolvedSearchParams?.assetClass,
    lane: resolvedSearchParams?.lane ?? workstation.session?.laneId ?? undefined,
    source: resolvedSearchParams?.source,
  });
  const preparedAsset = preparedTicket
    ? workstation.tradableAssets.find((entry) => entry.asset.symbol === preparedTicket.symbol && entry.asset.assetClass === preparedTicket.assetClass)
    : null;
  const preparedLaneResolution = preparedTicket && preparedAsset
    ? resolvePreparedTicketLane({
      preparedLane: preparedTicket.lane,
      activeLane: workstation.session?.laneId ?? null,
      assetClass: preparedAsset.asset.assetClass,
    })
    : null;
  const preparedQuoteUsability = preparedAsset
    ? evaluateSimulationQuoteUsability({
      symbol: preparedAsset.asset.symbol,
      assetClass: preparedAsset.asset.assetClass,
      quote: preparedAsset.quote,
    })
    : null;
  const aiPanelLabels = {
    providerUnavailableSafeHold: messages.simulation.agent.providerUnavailableSafeHold,
    rawProviderError: messages.simulation.agent.rawProviderError,
    maxNotionalPerTrade: messages.simulation.agent.maxNotionalPerTrade,
    maxDailyNotional: messages.simulation.agent.maxDailyNotional,
    maxOpenExposure: messages.simulation.agent.maxOpenExposure,
    commonAmount: messages.simulation.agent.commonAmount,
    runAgent: messages.simulation.agent.runAgent,
    minimumForFieldTemplate: messages.simulation.agent.minimumForField,
  };
  assertSerializableProps('simulation.aiPanelLabels', aiPanelLabels);

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

  // ── Ledger tab panels (pre-rendered server JSX passed as ReactNode) ─────────
  // Built here so the secondary ledger content (holdings / journal / orders &
  // transactions / activity) can live behind one accessible tab group instead
  // of seven stacked full-width Sections. No data refetch — all rows are the
  // same server-computed values rendered once.
  const holdingsPanel = (
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
          unrealizedPnl: formatSignedCurrency(position.unrealizedPnl, locale, portfolio.summary.currency),
        }))}
        emptyMessage="No positions are open yet. Use the tradable universe below to start your paper portfolio."
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
          unrealizedPnl: formatSignedCurrency(position.realizedPnl, locale, portfolio.summary.currency),
        }))}
        emptyMessage="No closed investments yet."
        rowDetailsLabel={messages.table.rowDetails}
      />
    </div>
  );

  const journalPanel = <SimulationJournalTable rows={journalRows} />;

  const ordersPanel = (
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
          grossAmount: formatSignedCurrency(order.cashEffect, locale, portfolio.summary.currency),
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
          cashDelta: formatSignedCurrency(transaction.cashDelta, locale, portfolio.summary.currency),
          realizedPnl: formatSignedCurrency(transaction.realizedPnl, locale, portfolio.summary.currency),
          createdAt: formatDateTimeLabel(transaction.createdAt, locale),
        }))}
        emptyMessage={messages.simulation.emptyTransactions}
        rowDetailsLabel={messages.table.rowDetails}
      />
    </div>
  );

  const activityPanel = (
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
      <SimulationControlsCard />
      <Card className="analytics-card">
        <div className="analytics-card__header">
          <div>
            <div className="section__eyebrow">Micro trading mode</div>
            <h3>Simulation-only micro order guardrails</h3>
            <p>
              {microTrading.enabled ? 'Enabled via feature flag.' : 'Disabled by default. Enable FEATURE_SIM_MICRO_TRADING=true for simulation.'}
            </p>
          </div>
        </div>
        <div className="analytics-card__body">
          <p>Minimum simulated order size: {formatUsdPrice(microTrading.minimumSimulatedOrderNotional, locale, messages.common.unavailable)}</p>
          <p>Estimated fee impact: {microTrading.estimatedFeeImpactBps} bps</p>
          <p>Estimated spread impact: {microTrading.estimatedSpreadImpactBps} bps</p>
          <p>Estimated slippage impact: {microTrading.estimatedSlippageImpactBps} bps</p>
          <p>Max daily simulated trades: {microTrading.maxDailySimulatedTrades}</p>
          <p>Min confidence threshold: {(microTrading.minConfidenceThreshold * 100).toFixed(0)}%</p>
          <p>Max spread threshold: {microTrading.maxSpreadBpsThreshold} bps</p>
          <p>Max volatility threshold: {(microTrading.maxVolatilityThreshold * 100).toFixed(1)}%</p>
          <p><strong>Warning:</strong> {microTrading.highFrequencyRiskWarning}</p>
        </div>
      </Card>
    </div>
  );

  const ledgerTabParam = resolvedSearchParams?.tab;
  const ledgerDefaultTab =
    ledgerTabParam === 'journal' || ledgerTabParam === 'orders' || ledgerTabParam === 'activity'
      ? ledgerTabParam
      : 'holdings';

  const ledgerTabs: IntelligenceTab[] = [
    { id: 'holdings', label: 'Holdings', hint: String(portfolio.positions.length), panel: holdingsPanel },
    { id: 'journal', label: 'Journal', panel: journalPanel },
    { id: 'orders', label: 'Orders & transactions', hint: String(portfolio.orders.length), panel: ordersPanel },
    { id: 'activity', label: 'Activity', panel: activityPanel },
  ];

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
              value: formatCashCurrency(portfolio.summary.equityValue, locale, portfolio.summary.currency),
            },
            {
              label: 'Available cash',
              value: formatCashCurrency(portfolio.summary.availableCash, locale, portfolio.summary.currency),
            },
            { label: 'Cash currency', value: portfolio.summary.currency },
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

      {preparedTicket && preparedAsset ? (
        <Section className="dashboard-section dashboard-section--tinted">
          <Card className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">SIMULATION / PREPARED TICKET</div>
                <h3>{`Prepare ${preparedTicket.side === 'buy' ? 'Buy' : 'Sell'}: ${preparedAsset.asset.symbol}`}</h3>
                <p>Review the simulated order before submitting. No real money or broker execution is involved.</p>
                <p className="simulation-form__meta">
                  Macro context: {macroContext.regime.explanations[0] ?? 'Macro overlay unavailable.'}
                </p>
              </div>
              <div className="asset-card-actions__status-row">
                <span className="status-pill status-pill--info">Simulation only</span>
                <span className="status-pill status-pill--neutral">{preparedAsset.asset.assetClass.toUpperCase()}</span>
                <span className={`status-pill ${preparedTicket.side === 'buy' ? 'status-pill--success' : 'status-pill--warning'}`}>
                  {preparedTicket.side.toUpperCase()}
                </span>
                <span className="status-pill status-pill--neutral">{(preparedLaneResolution?.lane ?? preparedTicket.lane).replace(/_/g, ' ')}</span>
                {preparedLaneResolution?.autoNormalized ? (
                  <span className="status-pill status-pill--info">auto-aligned to active lane</span>
                ) : null}
                {preparedTicket.source && preparedTicket.source !== 'simulation' && (
                  <span className="status-pill status-pill--neutral">{preparedTicket.source}</span>
                )}
              </div>
            </div>
            <div className="analytics-card__body">
              <p>
                Quote: {formatUsdPrice(preparedAsset.quote?.price ?? null, locale, messages.common.unavailable)} · State:{' '}
                {preparedQuoteUsability?.reasonCode === 'CACHED_MARKET_CLOSED'
                  ? messages.simulation.form.cachedSimulationQuote
                  : preparedQuoteUsability?.reasonCode === 'DELAYED_QUOTE'
                    ? messages.simulation.form.delayedMarketQuote
                    : preparedQuoteUsability?.reasonCode === 'STALE_DURING_MARKET_HOURS'
                      ? messages.simulation.form.staleDuringMarketHours
                      : formatFreshnessLabel(
                        getQuoteTimestamp(preparedAsset.quote),
                        locale,
                        messages.common.unavailable,
                        preparedAsset.asset.assetClass,
                      )}
              </p>
              {preparedQuoteUsability?.warning ? (
                <p className="simulation-form__meta">{preparedQuoteUsability.warning}</p>
              ) : null}
              <div className="aurox-action-row" style={{ marginTop: '0.5rem', gap: '0.75rem' }}>
                <Link href="/invest/simulation" className="journal-action-link" aria-label="Clear prepared ticket">
                  {messages.simulation.form.clearPreparedTicket}
                </Link>
                <Link
                  href={getAssetDetailHref(preparedAsset.asset.symbol, preparedAsset.asset.assetClass)}
                  className="journal-action-link"
                  aria-label={`Open asset detail for ${preparedAsset.asset.symbol}`}
                >
                  {messages.simulation.form.openAssetDetail}
                </Link>
                <Link href="/invest/portfolio" className="journal-action-link" aria-label="Open portfolio">
                  {messages.simulation.form.openPortfolio}
                </Link>
              </div>
            </div>
            <div className="analytics-card__action-grid">
              <SimulatedOrderForm
                assetId={preparedAsset.asset.assetId}
                symbol={preparedAsset.asset.symbol}
                assetClass={preparedAsset.asset.assetClass}
                side={preparedTicket.side}
                strategyLaneId={preparedLaneResolution?.lane ?? preparedTicket.lane}
                simulationSessionId={workstation.session?.id ?? undefined}
                label={preparedTicket.side === 'buy' ? messages.dashboard.buySimulated : messages.dashboard.sellSimulated}
                showQuantityInput
                quantityLabel={messages.simulation.quantity}
                disabled={workstation.isReadOnly || preparedAsset.quote?.price == null || (preparedTicket.side === 'sell' && !heldPositionsBySymbol.has(preparedAsset.asset.symbol))}
                disabledReason={resolveTradeDisabledReason({
                  isReadOnly: workstation.isReadOnly,
                  statusMessage: workstation.statusMessage,
                  price: preparedAsset.quote?.price ?? null,
                  assetClass: preparedAsset.asset.assetClass,
                  symbol: preparedAsset.asset.symbol,
                  side: preparedTicket.side,
                  hasPosition: heldPositionsBySymbol.has(preparedAsset.asset.symbol),
                  freshEtfQuoteRequired: messages.simulation.validation.freshEtfQuoteRequired,
                  freshCryptoQuoteRequired: messages.simulation.validation.freshCryptoQuoteRequired,
                  noOpenPositionToSellTemplate: messages.simulation.validation.noOpenPositionToSell,
                })}
                currentPrice={preparedAsset.quote?.price ?? null}
                currentHeldQuantity={heldPositionsBySymbol.get(preparedAsset.asset.symbol)?.quantity ?? 0}
                sourceContext={preparedTicket.source}
                uiText={{
                  quantityMode: messages.simulation.quantity,
                  notionalMode: messages.simulation.form.notional,
                  notionalAmount: messages.simulation.form.notionalAmount,
                  quantityRequired: messages.simulation.validation.quantityRequired,
                  minimumShare: messages.simulation.validation.minimumShare,
                  minimumUnit: messages.simulation.validation.minimumUnit,
                  minimumQuantityTemplate: messages.simulation.validation.minimumQuantity,
                  wholeSharesOnly: messages.simulation.validation.wholeSharesOnly,
                  quantityStepMismatchTemplate: messages.simulation.validation.quantityStepMismatch,
                  minimumNotional: messages.simulation.validation.minimumNotional,
                  noOpenPositionToSellTemplate: messages.simulation.validation.noOpenPositionToSell,
                  closePosition: messages.simulation.chips.closePosition,
                  quoteReady: messages.simulation.form.quoteReady,
                  fetchingSimulationQuote: messages.simulation.form.fetchingSimulationQuote,
                  quoteNotReady: messages.simulation.form.quoteNotReady,
                  retryQuote: messages.simulation.form.retryQuote,
                  retryingInSeconds: messages.simulation.form.retryingInSeconds,
                  marketClosedUsingLatestQuote: messages.simulation.form.marketClosedUsingLatestQuote,
                  cachedQuoteSimulationWarning: messages.simulation.form.cachedSimulationQuote,
                  delayedQuoteSimulationWarning: messages.simulation.form.delayedMarketQuote,
                  quoteFreshnessLimited: messages.simulation.form.quoteFreshnessLimited,
                  simulationQuoteUnavailable: messages.simulation.form.simulationQuoteUnavailable,
                }}
              />
            </div>
          </Card>
        </Section>
      ) : null}

      {/* Headline metrics — the 5-6 figures a trader needs at a glance. The
          remaining metrics stay one click away in the disclosure below. */}
      <Section className="dashboard-section">
        <div className="analytics-strip">
          <CompactStatCard label={messages.simulation.cashBalance} value={formatCashCurrency(portfolio.summary.cashBalance, locale, portfolio.summary.currency)} detail="Total cash in the simulation account before reserve allocation." />
          <CompactStatCard label="Available cash" value={formatCashCurrency(portfolio.summary.availableCash, locale, portfolio.summary.currency)} detail="Cash currently available for new simulated orders." />
          <CompactStatCard label="Total equity" value={formatCashCurrency(portfolio.summary.equityValue, locale, portfolio.summary.currency)} detail="Cash plus the current market value of all open simulated positions." />
          <CompactStatCard label="Total return" value={formatPercent(portfolioReturn)} detail="Portfolio return versus the default 100,000 USD fictive starting balance." />
          <CompactStatCard label={messages.simulation.unrealizedPnl} value={formatSignedCurrency(portfolio.summary.unrealizedPnl, locale, portfolio.summary.currency)} detail="Open-position gain or loss versus average cost." />
          <CompactStatCard label={messages.simulation.realizedPnl} value={formatSignedCurrency(portfolio.summary.realizedPnl, locale, portfolio.summary.currency)} detail="Closed-position gains and losses already locked in by simulated sells." />
        </div>
      </Section>

      <Section className="dashboard-section">
        <Disclosure summary="All portfolio metrics" hint="9 more">
          <div className="analytics-strip">
            <CompactStatCard label="Reserved cash" value={formatCashCurrency(portfolio.summary.reservedCash, locale, portfolio.summary.currency)} detail="Reserved lane capital (currently 0 in this release)." />
            <CompactStatCard label="Invested capital" value={formatCashCurrency(portfolio.summary.investedCapital, locale, portfolio.summary.currency)} valueTone={portfolio.summary.investedCapital > 0 ? 'positive' : portfolio.summary.investedCapital < 0 ? 'negative' : 'neutral'} detail="Cost basis of all currently active simulated positions." />
            <CompactStatCard label={messages.simulation.portfolioValue} value={formatCashCurrency(portfolio.summary.portfolioValue, locale, portfolio.summary.currency)} valueTone={portfolio.summary.portfolioValue > 0 ? 'positive' : portfolio.summary.portfolioValue < 0 ? 'negative' : 'neutral'} detail="Current market value of open simulated positions." />
            <CompactStatCard label="Active investments" value={String(portfolio.summary.activeInvestmentCount)} detail="Open simulated positions currently running." />
            <CompactStatCard label="Closed investments" value={String(portfolio.summary.closedInvestmentCount)} detail="Previously open positions now fully closed." />
            <CompactStatCard label="FX conversion" value={portfolio.summary.fxConversionAvailable ? 'Available' : 'Unavailable'} detail={portfolio.summary.fxConversionNote} />
            <CompactStatCard label="Last simulated action" value={portfolio.orders[0]?.executedAt ? formatDateTimeLabel(portfolio.orders[0].executedAt, locale) : 'Unavailable'} detail="Most recent simulated order execution timestamp." />
            <CompactStatCard label="Last reset event" value={portfolio.transactions.find((tx) => tx.transactionType === 'reset')?.createdAt ? formatDateTimeLabel(portfolio.transactions.find((tx) => tx.transactionType === 'reset')!.createdAt, locale) : 'Unavailable'} detail="Most recent reset/control event timestamp." />
            <CompactStatCard label="Execution mode" value="Simulation only" detail="Live trading remains disabled and gated." />
          </div>
        </Disclosure>
      </Section>

      {/* Secondary ledger content behind one accessible tab group. */}
      <Section className="dashboard-section">
        <IntelligenceAnalysisTabs tabs={ledgerTabs} defaultTabId={ledgerDefaultTab} />
      </Section>

      <Section className="dashboard-section dashboard-section--tinted">
        <Disclosure summary="Lanes & exposure" hint={String(workstation.activityLanes.length)}>
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
        </Disclosure>
      </Section>

      <Section className="dashboard-section">
        <SectionHeader
          eyebrow="Markets"
          title="Observe & trade"
          description="Your watchlist and the tradable simulation universe — quote, freshness, and one-click simulated actions across stocks, ETFs, and crypto."
        />
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
          <MarketViewToggle
            basePath="/invest/simulation"
            view={assetViewMode}
            paramKey="assetView"
            query={{
              session: resolvedSearchParams?.session,
              lane: resolvedSearchParams?.lane,
            }}
          />
        </header>
        <div className={assetViewMode === 'grid' ? 'analytics-two-grid' : 'market-list'}>
          {workstation.watchlist.length > 0 ? (
            workstation.watchlist.map((item) => (
              assetViewMode === 'grid' ? (
                <InvestableAssetCard
                  key={item.asset.assetId}
                  href={getAssetDetailHref(item.asset.symbol, item.asset.assetClass)}
                  title={item.asset.name}
                  symbol={item.asset.symbol}
                  categoryLabel={item.asset.category}
                  thesis={item.asset.thesis}
                  priceLabel={formatUsdPrice(item.quote?.price ?? null, locale, messages.common.unavailable)}
                  changeLabel="Watchlist"
                  freshnessLabel={formatFreshnessLabel(getQuoteTimestamp(item.quote), locale, messages.common.unavailable, item.asset.assetClass)}
                  actionAvailability={item.asset.actionAvailability}
                  insightStance="neutral"
                  riskSummary={item.asset.riskSummary}
                  sparkline={sparklineBySymbol[item.asset.symbol] ?? []}
                  actions={(
                    <QuickTradeActions
                      detailHref={getAssetDetailHref(item.asset.symbol, item.asset.assetClass)}
                      assetId={item.asset.assetId}
                      symbol={item.asset.symbol}
                      assetClass={item.asset.assetClass}
                      strategyLaneId={workstation.session?.laneId ?? 'manual_stock_lane'}
                      simulationSessionId={workstation.session?.id ?? undefined}
                      disabled={workstation.isReadOnly}
                      disabledReason={workstation.isReadOnly ? workstation.statusMessage : undefined}
                      isAuthenticated
                      hasSimulatedPosition={heldSymbols.has(item.asset.symbol)}
                      source={`${item.asset.assetClass}-lane`}
                    />
                  )}
                />
              ) : (
                <MarketAssetRow
                  key={item.asset.assetId}
                  symbol={item.asset.symbol}
                  title={item.asset.name}
                  category={item.asset.category}
                  thesis={item.asset.thesis}
                  priceLabel={formatUsdPrice(item.quote?.price ?? null, locale, messages.common.unavailable)}
                  changeLabel="Watchlist"
                  freshnessLabel={formatFreshnessLabel(getQuoteTimestamp(item.quote), locale, messages.common.unavailable, item.asset.assetClass)}
                  actionAvailability={item.asset.actionAvailability}
                  insightStance="neutral"
                  sparkline={sparklineBySymbol[item.asset.symbol] ?? []}
                  actions={(
                    <div className="market-row__action-grid">
                      <QuickTradeActions
                        detailHref={getAssetDetailHref(item.asset.symbol, item.asset.assetClass)}
                        assetId={item.asset.assetId}
                        symbol={item.asset.symbol}
                        assetClass={item.asset.assetClass}
                        strategyLaneId={workstation.session?.laneId ?? 'manual_stock_lane'}
                        simulationSessionId={workstation.session?.id ?? undefined}
                        disabled={workstation.isReadOnly}
                        disabledReason={workstation.isReadOnly ? workstation.statusMessage : undefined}
                        isAuthenticated
                        hasSimulatedPosition={heldSymbols.has(item.asset.symbol)}
                        source={`${item.asset.assetClass}-lane`}
                      />
                    </div>
                  )}
                />
              )
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
              Manual multi-asset lane supports simulated stocks, ETFs, and crypto with fictive cash only. Live execution remains separately gated by broker readiness and policy controls.
            </p>
          </div>
        </header>
        <div className={assetViewMode === 'grid' ? 'analytics-two-grid' : 'market-list'}>
          {workstation.tradableAssets.map((entry) => (
            assetViewMode === 'grid' ? (
              <InvestableAssetCard
                key={entry.asset.assetId}
                href={getAssetDetailHref(entry.asset.symbol, entry.asset.assetClass)}
                title={entry.asset.name}
                symbol={entry.asset.symbol}
                categoryLabel={entry.asset.sector ?? entry.asset.category}
                thesis={entry.asset.thesis}
                priceLabel={formatUsdPrice(entry.quote?.price ?? null, locale, messages.common.unavailable)}
                changeLabel={formatFreshnessLabel(getQuoteTimestamp(entry.quote), locale, messages.common.unavailable, entry.asset.assetClass)}
                freshnessLabel={formatFreshnessLabel(getQuoteTimestamp(entry.quote), locale, messages.common.unavailable, entry.asset.assetClass)}
                actionAvailability={entry.asset.actionAvailability}
                insightStance={
                  entry.quote?.changePercent && entry.quote.changePercent < 0
                    ? 'negative'
                    : entry.quote?.changePercent && entry.quote.changePercent > 0
                      ? 'positive'
                      : 'neutral'
                }
                riskSummary={entry.asset.riskSummary}
                sparkline={sparklineBySymbol[entry.asset.symbol] ?? []}
                actions={(
                  <QuickTradeActions
                    detailHref={getAssetDetailHref(entry.asset.symbol, entry.asset.assetClass)}
                    assetId={entry.asset.assetId}
                    symbol={entry.asset.symbol}
                    assetClass={entry.asset.assetClass}
                    strategyLaneId={workstation.session?.laneId ?? 'manual_stock_lane'}
                    simulationSessionId={workstation.session?.id ?? undefined}
                    disabled={workstation.isReadOnly}
                    disabledReason={workstation.isReadOnly ? workstation.statusMessage : undefined}
                    isAuthenticated
                    showWatchlist
                    isWatched={entry.isWatched}
                    watchlistLabelAdd={messages.dashboard.addToWatchlist}
                    watchlistLabelRemove={messages.dashboard.removeFromWatchlist}
                    hasSimulatedPosition={heldSymbols.has(entry.asset.symbol)}
                    source={`${entry.asset.assetClass}-lane`}
                  />
                )}
              />
            ) : (
              <MarketAssetRow
                key={entry.asset.assetId}
                symbol={entry.asset.symbol}
                title={entry.asset.name}
                category={entry.asset.sector ?? entry.asset.category}
                thesis={entry.asset.thesis}
                priceLabel={formatUsdPrice(entry.quote?.price ?? null, locale, messages.common.unavailable)}
                changeLabel={formatPercentChange(entry.quote?.changePercent ?? null, messages.common.partial)}
                freshnessLabel={formatFreshnessLabel(getQuoteTimestamp(entry.quote), locale, messages.common.unavailable, entry.asset.assetClass)}
                actionAvailability={entry.asset.actionAvailability}
                insightStance={
                  entry.quote?.changePercent && entry.quote.changePercent < 0
                    ? 'negative'
                    : entry.quote?.changePercent && entry.quote.changePercent > 0
                      ? 'positive'
                      : 'neutral'
                }
                sparkline={sparklineBySymbol[entry.asset.symbol] ?? []}
                actions={(
                  <div className="market-row__action-grid">
                    <QuickTradeActions
                      detailHref={getAssetDetailHref(entry.asset.symbol, entry.asset.assetClass)}
                      assetId={entry.asset.assetId}
                      symbol={entry.asset.symbol}
                      assetClass={entry.asset.assetClass}
                      strategyLaneId={workstation.session?.laneId ?? 'manual_stock_lane'}
                      simulationSessionId={workstation.session?.id ?? undefined}
                      disabled={workstation.isReadOnly}
                      disabledReason={workstation.isReadOnly ? workstation.statusMessage : undefined}
                      isAuthenticated
                      showWatchlist
                      isWatched={entry.isWatched}
                      watchlistLabelAdd={messages.dashboard.addToWatchlist}
                      watchlistLabelRemove={messages.dashboard.removeFromWatchlist}
                      hasSimulatedPosition={heldSymbols.has(entry.asset.symbol)}
                      source={`${entry.asset.assetClass}-lane`}
                    />
                  </div>
                )}
              />
            )
          ))}
        </div>
      </Section>

      {/* Context & experimental tools — demoted below the action surface so they
          stop competing with the trade ticket and ledger for attention. */}
      <Section className="dashboard-section">
        <SectionHeader eyebrow="Context & tools" title="Insights and experimental tools" as="h2" />
        <Disclosure summary="Macro regime context" hint="simulation only">
          <Card className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">Macro regime panel</div>
                <h3>Simulation context only</h3>
                <p>{macroContext.simulationOnlyLabel}</p>
              </div>
            </div>
            <div className="analytics-card__body">
              <div className="observation-regime-grid">
                <article className="analytics-card observation-regime-card"><div className="analytics-stat__label">Inflation pressure</div><div className="analytics-stat__value">{macroContext.regime.inflationRegime.score.toFixed(2)}</div></article>
                <article className="analytics-card observation-regime-card"><div className="analytics-stat__label">Rates pressure</div><div className="analytics-stat__value">{macroContext.regime.ratesRegime.score.toFixed(2)}</div></article>
                <article className="analytics-card observation-regime-card"><div className="analytics-stat__label">Growth backdrop</div><div className="analytics-stat__value">{macroContext.regime.growthRegime.score.toFixed(2)}</div></article>
                <article className="analytics-card observation-regime-card"><div className="analytics-stat__label">Risk-on / risk-off</div><div className="analytics-stat__value">{macroContext.regime.riskRegime.score.toFixed(2)}</div></article>
              </div>
              <p className="simulation-form__meta">Sources: {macroContext.providerStatus.map((item) => `${item.provider}:${item.freshness}`).join(' | ') || 'unavailable'}</p>
            </div>
          </Card>
        </Disclosure>

        <Disclosure summary="Session diagnostics" hint={workstation.workstationStatus}>
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
        </Disclosure>

        <Disclosure summary="AI broker agent (experimental)">
          <Card className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">AI tools — experimental</div>
                <h3>AI Simulation Broker Agent</h3>
                <p>
                  AI-provider-powered simulation agent that analyzes your portfolio and proposes simulated
                  trades. Simulation-only. No real money. All proposals pass existing risk guards before
                  execution.
                </p>
              </div>
            </div>
            <div className="analytics-card__body">
              <AiSimulationAgentPanel
                isAvailable={aiAgentAvailability.available}
                unavailableReason={
                  aiAgentAvailability.available ? undefined : aiAgentAvailability.reason
                }
                providerWarning={aiAgentAvailability.warning}
                isReadOnly={workstation.isReadOnly}
                readOnlyReason={workstation.isReadOnly ? workstation.statusMessage : undefined}
                labels={{
                  ...aiPanelLabels
                }}
              />
            </div>
          </Card>
        </Disclosure>
      </Section>
    </>
  );
}

