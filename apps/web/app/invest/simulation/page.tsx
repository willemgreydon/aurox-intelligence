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
import { PaginatedAssetList } from '../../../components/invest/paginated-asset-list';
import { SimulationBoundaryNotice } from '../../../components/invest/simulation-boundary-notice';
import {
  TradableUniverseExplorer,
  type UniverseExplorerItem,
} from '../../../components/invest/tradable-universe-explorer';
import { classifyQuoteFreshness } from '../../../lib/quote-freshness-display';
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
import { getPreTradeRiskGate } from '../../../server/services/pre-trade-risk-service';
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

// Closed positions report REALIZED P&L (already locked in), not unrealized, and
// have no live market price / allocation — so they use their own column set
// rather than borrowing the open-holdings columns.
type ClosedPositionRow = {
  symbol: string;
  quantity: string;
  averageCost: string;
  realizedPnl: string;
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

  // Localized labels for the quick-trade action buttons so the whole control
  // renders in the active locale (no hardcoded English in the German workspace).
  const quickTradeLabels = {
    buy: messages.simulation.actions.prepareBuy,
    sell: messages.simulation.actions.prepareSell,
    reviewRisk: messages.simulation.actions.reviewRisk,
    signIn: messages.simulation.actions.signIn,
    simulationOnly: messages.simulation.actions.simulationOnly,
    liveLocked: messages.simulation.actions.liveLocked,
    planned: messages.simulation.actions.planned,
    unavailable: messages.simulation.actions.unavailable,
    noOpenPosition: messages.simulation.actions.noOpenPosition,
  };

  const positionColumns: Array<TableColumn<PositionRow>> = [
    { key: 'symbol', label: messages.simulation.symbolColumn },
    { key: 'quantity', label: messages.simulation.quantityColumn, align: 'right' },
    { key: 'averageCost', label: messages.simulation.averageCostColumn, align: 'right' },
    { key: 'marketPrice', label: messages.simulation.priceColumn, align: 'right' },
    { key: 'allocation', label: messages.simulation.allocationColumn, align: 'right' },
    { key: 'unrealizedPnl', label: messages.simulation.unrealizedPnlColumn, align: 'right' },
  ];

  const closedPositionColumns: Array<TableColumn<ClosedPositionRow>> = [
    { key: 'symbol', label: messages.simulation.symbolColumn },
    { key: 'quantity', label: messages.simulation.quantityColumn, align: 'right' },
    { key: 'averageCost', label: messages.simulation.averageCostColumn, align: 'right' },
    { key: 'realizedPnl', label: messages.simulation.realizedPnlColumn, align: 'right' },
  ];

  const transactionColumns: Array<TableColumn<TransactionRow>> = [
    { key: 'type', label: messages.simulation.typeColumn },
    { key: 'symbol', label: messages.simulation.symbolColumn },
    { key: 'cashDelta', label: messages.simulation.cashDeltaColumn, align: 'right' },
    { key: 'realizedPnl', label: messages.simulation.realizedPnlColumn, align: 'right' },
    { key: 'createdAt', label: messages.simulation.createdColumn, align: 'right' },
  ];

  const orderColumns: Array<TableColumn<OrderRow>> = [
    { key: 'side', label: messages.simulation.sideColumn },
    { key: 'symbol', label: messages.simulation.symbolColumn },
    { key: 'quantity', label: messages.simulation.quantityColumn, align: 'right' },
    { key: 'executedPrice', label: messages.simulation.executedColumn, align: 'right' },
    { key: 'grossAmount', label: messages.simulation.grossColumn, align: 'right' },
    { key: 'createdAt', label: messages.simulation.createdColumn, align: 'right' },
  ];

  const laneColumns: Array<TableColumn<LaneRow>> = [
    { key: 'lane', label: messages.simulation.laneColumn },
    { key: 'status', label: messages.simulation.statusColumn },
    { key: 'capitalLimit', label: messages.simulation.laneLimitColumn, align: 'right' },
    { key: 'allocated', label: messages.simulation.allocatedColumn, align: 'right' },
    { key: 'available', label: messages.simulation.availableColumn, align: 'right' },
    { key: 'activePositions', label: messages.simulation.activePositionsColumn, align: 'right' },
    { key: 'recentOrders', label: messages.simulation.recentOrdersColumn, align: 'right' },
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
  const preparedRiskGate = preparedTicket && preparedAsset
    ? await getPreTradeRiskGate({
      symbol: preparedAsset.asset.symbol,
      assetClass: preparedAsset.asset.assetClass,
      side: preparedTicket.side,
      laneId: preparedLaneResolution?.lane ?? preparedTicket.lane,
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
            title={messages.simulation.paperPortfolioTitle}
            description={messages.simulation.paperPortfolioDescription}
            summary={messages.common.simulationDisclosure}
            statusLabel={workstation.workstationStatus}
            statusTone={statusTone}
            meta={[
              { label: messages.common.lastUpdated, value: messages.common.unavailable },
              { label: messages.simulation.totalEquityLabel, value: messages.common.unavailable },
              { label: messages.simulation.availableCashLabel, value: messages.common.unavailable },
            ]}
            actions={[
              { href: '/stocks', label: messages.simulation.browseStocks },
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
            title={messages.simulation.chooseLaneTitle}
            description={messages.simulation.chooseLaneDescription}
          />
        </Section>

        <Section className="dashboard-section">
          <Card className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">{messages.simulation.sessionStateEyebrow}</div>
                <h3>{messages.simulation.sessionRequiredTitle}</h3>
                <p>{localizedStatusMessage}</p>
              </div>
            </div>
            <div className="analytics-card__body">
              <p>{messages.simulation.noActiveWorkspace}</p>
              <p>{messages.simulation.startSimulationHintBefore}<strong>{messages.simulation.startSimulationHintAction}</strong>{messages.simulation.startSimulationHintAfter}</p>
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
        subtitle={messages.simulation.holdingsSubtitle}
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
        emptyMessage={messages.simulation.holdingsEmptyMessage}
        rowDetailsLabel={messages.table.rowDetails}
      />
      <AnalyticsTable
        title={messages.simulation.closedInvestmentsTitle}
        subtitle={messages.simulation.closedInvestmentsSubtitle}
        columns={closedPositionColumns}
        rows={portfolio.closedPositions.map((position) => ({
          symbol: position.symbol,
          quantity: position.quantity.toFixed(4),
          averageCost: formatUsdPrice(position.averageCost, locale, messages.common.unavailable),
          realizedPnl: formatSignedCurrency(position.realizedPnl, locale, portfolio.summary.currency),
        }))}
        emptyMessage={messages.simulation.closedInvestmentsEmptyMessage}
        rowDetailsLabel={messages.table.rowDetails}
      />
    </div>
  );

  const journalPanel = <SimulationJournalTable rows={journalRows} />;

  const ordersPanel = (
    <div className="analytics-two-grid analytics-two-grid--tables">
      <AnalyticsTable
        title={messages.simulation.recentOrdersTitle}
        subtitle={messages.simulation.recentOrdersSubtitle}
        columns={orderColumns}
        rows={portfolio.orders.map((order) => ({
          side: order.side.toUpperCase(),
          symbol: order.symbol,
          quantity: order.quantity.toFixed(4),
          executedPrice: formatUsdPrice(order.executedPrice, locale, messages.common.unavailable),
          grossAmount: formatSignedCurrency(order.cashEffect, locale, portfolio.summary.currency),
          createdAt: formatDateTimeLabel(order.createdAt, locale),
        }))}
        emptyMessage={messages.simulation.recentOrdersEmptyMessage}
        rowDetailsLabel={messages.table.rowDetails}
      />
      <AnalyticsTable
        title={messages.simulation.transactions}
        subtitle={messages.simulation.transactionsSubtitle}
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
        title={messages.simulation.equityCurveTitle}
        subtitle={messages.simulation.equityCurveSubtitle}
        points={workstation.equityCurve.map((point) => ({
          label: formatShortDateLabel(point.timestamp, locale),
          timestamp: point.timestamp,
          open: point.close,
          high: point.close,
          low: point.close,
          close: point.close,
          volume: null,
        }))}
        note={messages.simulation.equityCurveNote}
        emptyMessage={messages.simulation.equityCurveEmptyMessage}
      />
      <SimulationControlsCard />
      <Card className="analytics-card">
        <div className="analytics-card__header">
          <div>
            <div className="section__eyebrow">{messages.simulation.microTradingEyebrow}</div>
            <h3>{messages.simulation.microTradingTitle}</h3>
            <p>
              {microTrading.enabled ? messages.simulation.microTradingEnabled : messages.simulation.microTradingDisabled}
            </p>
          </div>
        </div>
        <div className="analytics-card__body">
          <p>{messages.simulation.microMinOrderSize} {formatUsdPrice(microTrading.minimumSimulatedOrderNotional, locale, messages.common.unavailable)}</p>
          <p>{messages.simulation.microFeeImpact} {microTrading.estimatedFeeImpactBps} bps</p>
          <p>{messages.simulation.microSpreadImpact} {microTrading.estimatedSpreadImpactBps} bps</p>
          <p>{messages.simulation.microSlippageImpact} {microTrading.estimatedSlippageImpactBps} bps</p>
          <p>{messages.simulation.microMaxDailyTrades} {microTrading.maxDailySimulatedTrades}</p>
          <p>{messages.simulation.microMinConfidence} {(microTrading.minConfidenceThreshold * 100).toFixed(0)}%</p>
          <p>{messages.simulation.microMaxSpread} {microTrading.maxSpreadBpsThreshold} bps</p>
          <p>{messages.simulation.microMaxVolatility} {(microTrading.maxVolatilityThreshold * 100).toFixed(1)}%</p>
          <p><strong>{messages.simulation.microWarningLabel}</strong> {microTrading.highFrequencyRiskWarning}</p>
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
    { id: 'holdings', label: messages.simulation.tabHoldings, hint: String(portfolio.positions.length), panel: holdingsPanel },
    { id: 'journal', label: messages.simulation.tabJournal, panel: journalPanel },
    { id: 'orders', label: messages.simulation.tabOrdersTransactions, hint: String(portfolio.orders.length), panel: ordersPanel },
    { id: 'activity', label: messages.simulation.tabActivity, panel: activityPanel },
  ];

  // Localized labels for the tradable-universe explorer (controls + summary).
  // Freshness chip labels reuse the shared common.freshness* set.
  const universeExplorerLabels = {
    ...messages.simulation.universe,
    freshnessLive: messages.dashboard.freshnessLive,
    freshnessDelayed: messages.dashboard.freshnessDelayed,
    freshnessMarketClosed: messages.dashboard.freshnessMarketClosed,
    freshnessStale: messages.dashboard.freshnessStale,
    freshnessPartial: messages.dashboard.freshnessPartial,
    freshnessUnavailable: messages.dashboard.freshnessUnavailable,
  };

  // Build the universe items (filterable facts + the pre-rendered card/row node).
  // Freshness facts come from the central classifier so filtering, the summary,
  // and the card label all agree on each asset's state.
  const universeExplorerItems: UniverseExplorerItem[] = workstation.tradableAssets.map((entry) => {
    const sector = entry.asset.sector ?? entry.asset.category;
    const isHeld = heldSymbols.has(entry.asset.symbol);
    const freshness = classifyQuoteFreshness({
      assetClass: entry.asset.assetClass,
      timestamp: getQuoteTimestamp(entry.quote),
      price: entry.quote?.price ?? null,
      provider: (entry.quote as { source?: string } | undefined)?.source ?? null,
    });
    const node =
      assetViewMode === 'grid' ? (
        <InvestableAssetCard
          href={getAssetDetailHref(entry.asset.symbol, entry.asset.assetClass)}
          title={entry.asset.name}
          symbol={entry.asset.symbol}
          categoryLabel={sector}
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
              actionAvailability={entry.asset.actionAvailability}
              isAuthenticated
              showWatchlist
              isWatched={entry.isWatched}
              watchlistLabelAdd={messages.dashboard.addToWatchlist}
              watchlistLabelRemove={messages.dashboard.removeFromWatchlist}
              hasSimulatedPosition={isHeld}
              source={`${entry.asset.assetClass}-lane`}
              labels={quickTradeLabels}
            />
          )}
        />
      ) : (
        <MarketAssetRow
          symbol={entry.asset.symbol}
          title={entry.asset.name}
          category={sector}
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
                actionAvailability={entry.asset.actionAvailability}
                isAuthenticated
                showWatchlist
                isWatched={entry.isWatched}
                watchlistLabelAdd={messages.dashboard.addToWatchlist}
                watchlistLabelRemove={messages.dashboard.removeFromWatchlist}
                hasSimulatedPosition={isHeld}
                source={`${entry.asset.assetClass}-lane`}
                labels={quickTradeLabels}
              />
            </div>
          )}
        />
      );
    return {
      key: entry.asset.assetId,
      symbol: entry.asset.symbol,
      searchText: `${entry.asset.symbol} ${entry.asset.name} ${sector}`.toLowerCase(),
      assetClass: entry.asset.assetClass,
      sector,
      support: entry.asset.actionAvailability,
      freshnessState: freshness.state,
      isHeld,
      isWatched: entry.isWatched,
      sellable: isHeld && freshness.isTradableForSimulation,
      node,
    };
  });

  // Watchlist nodes for client-side pagination (same prev/next pattern as the
  // universe and the dedicated lane pages).
  const watchlistItems = workstation.watchlist.map((item) => ({
    key: item.asset.assetId,
    node:
      assetViewMode === 'grid' ? (
        <InvestableAssetCard
          href={getAssetDetailHref(item.asset.symbol, item.asset.assetClass)}
          title={item.asset.name}
          symbol={item.asset.symbol}
          categoryLabel={item.asset.category}
          thesis={item.asset.thesis}
          priceLabel={formatUsdPrice(item.quote?.price ?? null, locale, messages.common.unavailable)}
          changeLabel={messages.simulation.universe.summaryWatchlist}
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
              actionAvailability={item.asset.actionAvailability}
              isAuthenticated
              hasSimulatedPosition={heldSymbols.has(item.asset.symbol)}
              source={`${item.asset.assetClass}-lane`}
              labels={quickTradeLabels}
            />
          )}
        />
      ) : (
        <MarketAssetRow
          symbol={item.asset.symbol}
          title={item.asset.name}
          category={item.asset.category}
          thesis={item.asset.thesis}
          priceLabel={formatUsdPrice(item.quote?.price ?? null, locale, messages.common.unavailable)}
          changeLabel={messages.simulation.universe.summaryWatchlist}
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
                actionAvailability={item.asset.actionAvailability}
                isAuthenticated
                hasSimulatedPosition={heldSymbols.has(item.asset.symbol)}
                source={`${item.asset.assetClass}-lane`}
                labels={quickTradeLabels}
              />
            </div>
          )}
        />
      ),
  }));

  const universePaginationLabels = {
    paginationTemplate: messages.simulation.universe.paginationTemplate,
    previous: messages.simulation.universe.paginationPrevious,
    next: messages.simulation.universe.paginationNext,
  };

  return (
    <>
      <Section className="dashboard-section dashboard-section--hero">
        <WorkstationPageHeader
          eyebrow={messages.simulation.navLabel}
          title={messages.simulation.paperPortfolioTitle}
          description={messages.simulation.paperPortfolioDescription}
          summary={messages.common.simulationDisclosure}
          statusLabel={workstation.workstationStatus}
          statusTone={statusTone}
          meta={[
            {
              label: messages.common.lastUpdated,
              value: formatDateTimeLabel(portfolio.summary.updatedAt, locale),
            },
            {
              label: messages.simulation.totalEquityLabel,
              value: formatCashCurrency(portfolio.summary.equityValue, locale, portfolio.summary.currency),
            },
            {
              label: messages.simulation.availableCashLabel,
              value: formatCashCurrency(portfolio.summary.availableCash, locale, portfolio.summary.currency),
            },
            { label: messages.simulation.cashCurrencyLabel, value: portfolio.summary.currency },
          ]}
          actions={[
            { href: '/stocks', label: messages.simulation.browseStocks },
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
          title={messages.simulation.currentLaneTitle}
          description={messages.simulation.currentLaneDescription}
        />
      </Section>

      {preparedTicket && preparedAsset ? (
        <Section className="dashboard-section dashboard-section--tinted">
          <Card className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">{messages.simulation.preparedTicketEyebrow}</div>
                <h3>{messages.simulation.prepareTicketTitle.replace('{{side}}', preparedTicket.side === 'buy' ? messages.simulation.buy : messages.simulation.sell).replace('{{symbol}}', preparedAsset.asset.symbol)}</h3>
                <p>{messages.simulation.prepareTicketDescription}</p>
                <p className="simulation-form__meta">
                  {messages.simulation.macroContextLabel} {macroContext.regime.explanations[0] ?? messages.simulation.macroOverlayUnavailable}
                </p>
              </div>
              <div className="asset-card-actions__status-row">
                <span className="status-pill status-pill--info">{messages.simulation.actions.simulationOnly}</span>
                <span className="status-pill status-pill--neutral">{preparedAsset.asset.assetClass.toUpperCase()}</span>
                <span className={`status-pill ${preparedTicket.side === 'buy' ? 'status-pill--success' : 'status-pill--warning'}`}>
                  {preparedTicket.side.toUpperCase()}
                </span>
                <span className="status-pill status-pill--neutral">{(preparedLaneResolution?.lane ?? preparedTicket.lane).replace(/_/g, ' ')}</span>
                {preparedLaneResolution?.autoNormalized ? (
                  <span className="status-pill status-pill--info">{messages.simulation.autoAlignedToActiveLane}</span>
                ) : null}
                {preparedTicket.source && preparedTicket.source !== 'simulation' && (
                  <span className="status-pill status-pill--neutral">{preparedTicket.source}</span>
                )}
              </div>
            </div>
            <div className="analytics-card__body">
              <p>
                {messages.simulation.quoteLabel} {formatUsdPrice(preparedAsset.quote?.price ?? null, locale, messages.common.unavailable)} · {messages.simulation.stateLabel}{' '}
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
                <Link href="/invest/simulation" className="journal-action-link" aria-label={messages.simulation.form.clearPreparedTicket}>
                  {messages.simulation.form.clearPreparedTicket}
                </Link>
                <Link
                  href={getAssetDetailHref(preparedAsset.asset.symbol, preparedAsset.asset.assetClass)}
                  className="journal-action-link"
                  aria-label={messages.simulation.openAssetDetailAria.replace('{{symbol}}', preparedAsset.asset.symbol)}
                >
                  {messages.simulation.form.openAssetDetail}
                </Link>
                <Link href="/invest/portfolio" className="journal-action-link" aria-label={messages.simulation.form.openPortfolio}>
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
                riskGate={preparedRiskGate ?? undefined}
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
          <CompactStatCard label={messages.simulation.cashBalance} value={formatCashCurrency(portfolio.summary.cashBalance, locale, portfolio.summary.currency)} detail={messages.simulation.cashBalanceDetail} />
          <CompactStatCard label={messages.simulation.availableCashLabel} value={formatCashCurrency(portfolio.summary.availableCash, locale, portfolio.summary.currency)} detail={messages.simulation.availableCashDetail} />
          <CompactStatCard label={messages.simulation.totalEquityLabel} value={formatCashCurrency(portfolio.summary.equityValue, locale, portfolio.summary.currency)} detail={messages.simulation.totalEquityDetail} />
          <CompactStatCard label={messages.simulation.totalReturnLabel} value={formatPercent(portfolioReturn)} detail={messages.simulation.totalReturnDetail} />
          <CompactStatCard label={messages.simulation.unrealizedPnl} value={formatSignedCurrency(portfolio.summary.unrealizedPnl, locale, portfolio.summary.currency)} detail={messages.simulation.unrealizedPnlDetail} />
          <CompactStatCard label={messages.simulation.realizedPnl} value={formatSignedCurrency(portfolio.summary.realizedPnl, locale, portfolio.summary.currency)} detail={messages.simulation.realizedPnlDetail} />
        </div>
      </Section>

      <Section className="dashboard-section">
        <Disclosure summary={messages.simulation.allMetricsSummary} hint={messages.simulation.allMetricsHint}>
          <div className="analytics-strip">
            <CompactStatCard label={messages.simulation.reservedCashLabel} value={formatCashCurrency(portfolio.summary.reservedCash, locale, portfolio.summary.currency)} detail={messages.simulation.reservedCashDetail} />
            <CompactStatCard label={messages.simulation.investedCapitalLabel} value={formatCashCurrency(portfolio.summary.investedCapital, locale, portfolio.summary.currency)} valueTone={portfolio.summary.investedCapital > 0 ? 'positive' : portfolio.summary.investedCapital < 0 ? 'negative' : 'neutral'} detail={messages.simulation.investedCapitalDetail} />
            <CompactStatCard label={messages.simulation.portfolioValue} value={formatCashCurrency(portfolio.summary.portfolioValue, locale, portfolio.summary.currency)} valueTone={portfolio.summary.portfolioValue > 0 ? 'positive' : portfolio.summary.portfolioValue < 0 ? 'negative' : 'neutral'} detail={messages.simulation.portfolioValueDetail} />
            <CompactStatCard label={messages.simulation.activeInvestmentsLabel} value={String(portfolio.summary.activeInvestmentCount)} detail={messages.simulation.activeInvestmentsDetail} />
            <CompactStatCard label={messages.simulation.closedInvestmentsLabel} value={String(portfolio.summary.closedInvestmentCount)} detail={messages.simulation.closedInvestmentsDetail} />
            <CompactStatCard label={messages.simulation.fxConversionLabel} value={portfolio.summary.fxConversionAvailable ? messages.simulation.fxAvailable : messages.common.unavailable} detail={portfolio.summary.fxConversionNote} />
            <CompactStatCard label={messages.simulation.lastSimulatedActionLabel} value={portfolio.orders[0]?.executedAt ? formatDateTimeLabel(portfolio.orders[0].executedAt, locale) : messages.common.unavailable} detail={messages.simulation.lastSimulatedActionDetail} />
            <CompactStatCard label={messages.simulation.lastResetEventLabel} value={portfolio.transactions.find((tx) => tx.transactionType === 'reset')?.createdAt ? formatDateTimeLabel(portfolio.transactions.find((tx) => tx.transactionType === 'reset')!.createdAt, locale) : messages.common.unavailable} detail={messages.simulation.lastResetEventDetail} />
            <CompactStatCard label={messages.simulation.executionModeLabel} value={messages.simulation.actions.simulationOnly} detail={messages.simulation.executionModeDetail} />
          </div>
        </Disclosure>
      </Section>

      {/* Secondary ledger content behind one accessible tab group. */}
      <Section className="dashboard-section">
        <IntelligenceAnalysisTabs tabs={ledgerTabs} defaultTabId={ledgerDefaultTab} />
      </Section>

      <Section className="dashboard-section dashboard-section--tinted">
        <Disclosure summary={messages.simulation.lanesExposureSummary} hint={String(workstation.activityLanes.length)}>
          <div className="analytics-two-grid analytics-two-grid--tables">
            <AnalyticsTable
              title={messages.simulation.brokerStrategyLanesTitle}
              subtitle={messages.simulation.brokerStrategyLanesSubtitle}
              columns={laneColumns}
              rows={workstation.activityLanes.map((lane) => ({
                lane: lane.label,
                status:
                  lane.status === 'active'
                    ? messages.simulation.laneStatusActive
                    : lane.status === 'limited'
                      ? messages.simulation.laneStatusLimited
                      : messages.simulation.laneStatusPlanned,
                capitalLimit: formatUsdPrice(lane.capitalLimit, locale, messages.common.unavailable),
                allocated: formatUsdPrice(lane.allocatedCapital, locale, messages.common.unavailable),
                available: formatUsdPrice(lane.availableCapital, locale, messages.common.unavailable),
                activePositions: String(lane.activePositions),
                recentOrders: String(lane.recentOrders),
              }))}
              emptyMessage={messages.simulation.noLaneActivity}
              rowDetailsLabel={messages.table.rowDetails}
            />
            <Card className="analytics-card">
              <div className="analytics-card__header">
                <div>
                  <div className="section__eyebrow">{messages.simulation.assetExposureEyebrow}</div>
                  <h3>{messages.simulation.assetExposureTitle}</h3>
                  <p>{messages.simulation.assetExposureDescription}</p>
                </div>
              </div>
              <div className="analytics-card__body">
                {workstation.positionsByAssetClass.map((entry) => (
                  <p key={entry.assetClass}>
                    {entry.assetClass.toUpperCase()}: {entry.activeCount} {messages.simulation.activePositionsLabel},{' '}
                    {formatUsdPrice(entry.marketValue, locale, messages.common.unavailable)} {messages.simulation.marketValueLabel}
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
          eyebrow={messages.simulation.marketsEyebrow}
          title={messages.simulation.observeTradeTitle}
          description={messages.simulation.observeTradeDescription}
        />
      </Section>

      <Section className="dashboard-section">
        <header className="dashboard-section-heading">
          <div>
            <div className="section__eyebrow">{messages.simulation.universe.summaryWatchlist}</div>
            <h2 className="dashboard-section-heading__title">{messages.simulation.savedAssetsTitle}</h2>
            <p className="dashboard-section-heading__description">
              {messages.simulation.savedAssetsDescription}
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
        {workstation.watchlist.length > 0 ? (
          <PaginatedAssetList
            items={watchlistItems}
            className={assetViewMode === 'grid' ? 'analytics-two-grid' : 'market-list'}
            pageSize={assetViewMode === 'grid' ? 12 : 20}
            labels={universePaginationLabels}
          />
        ) : (
          <Card className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">{messages.simulation.universe.summaryWatchlist}</div>
                <h3>{messages.simulation.noSavedAssetsTitle}</h3>
                <p>{messages.simulation.noSavedAssetsDescription}</p>
              </div>
            </div>
          </Card>
        )}
      </Section>

      <Section className="dashboard-section dashboard-section--tinted">
        <header className="dashboard-section-heading">
          <div>
            <div className="section__eyebrow">{messages.simulation.assetUniverse}</div>
            <h2 className="dashboard-section-heading__title">{messages.simulation.assetUniverse}</h2>
            <p className="dashboard-section-heading__description">
              {messages.simulation.tradableUniverseDescription}
            </p>
          </div>
        </header>
        <TradableUniverseExplorer
          items={universeExplorerItems}
          viewMode={assetViewMode}
          labels={universeExplorerLabels}
        />
      </Section>

      {/* Context & experimental tools — demoted below the action surface so they
          stop competing with the trade ticket and ledger for attention. */}
      <Section className="dashboard-section">
        <SectionHeader eyebrow={messages.simulation.contextToolsEyebrow} title={messages.simulation.contextToolsTitle} as="h2" />
        <Disclosure summary={messages.simulation.macroRegimeSummary} hint={messages.simulation.macroRegimeHint}>
          <Card className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">{messages.simulation.macroRegimePanelEyebrow}</div>
                <h3>{messages.simulation.simulationContextOnlyTitle}</h3>
                <p>{macroContext.simulationOnlyLabel}</p>
              </div>
            </div>
            <div className="analytics-card__body">
              <div className="observation-regime-grid">
                <article className="analytics-card observation-regime-card"><div className="analytics-stat__label">{messages.simulation.inflationPressureLabel}</div><div className="analytics-stat__value">{macroContext.regime.inflationRegime.score.toFixed(2)}</div></article>
                <article className="analytics-card observation-regime-card"><div className="analytics-stat__label">{messages.simulation.ratesPressureLabel}</div><div className="analytics-stat__value">{macroContext.regime.ratesRegime.score.toFixed(2)}</div></article>
                <article className="analytics-card observation-regime-card"><div className="analytics-stat__label">{messages.simulation.growthBackdropLabel}</div><div className="analytics-stat__value">{macroContext.regime.growthRegime.score.toFixed(2)}</div></article>
                <article className="analytics-card observation-regime-card"><div className="analytics-stat__label">{messages.simulation.riskOnOffLabel}</div><div className="analytics-stat__value">{macroContext.regime.riskRegime.score.toFixed(2)}</div></article>
              </div>
              <p className="simulation-form__meta">{messages.simulation.sourcesLabel} {macroContext.providerStatus.map((item) => `${item.provider}:${item.freshness}`).join(' | ') || messages.simulation.sourcesUnavailable}</p>
            </div>
          </Card>
        </Disclosure>

        <Disclosure summary={messages.simulation.sessionDiagnosticsSummary} hint={workstation.workstationStatus}>
          <Card className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">{messages.simulation.sessionStateEyebrow}</div>
                <h3>{messages.simulation.sessionStatusLabel} {workstation.workstationStatus}</h3>
                <p>{localizedStatusMessage}</p>
              </div>
            </div>
            <div className="analytics-card__body">
              <p>{messages.simulation.sessionFieldLabel} {workstation.session?.id ?? messages.common.unavailable}</p>
              <p>{messages.simulation.laneFieldLabel} {workstation.session?.laneId ?? messages.common.unavailable}</p>
              <p>{messages.simulation.observationFieldLabel} {workstation.session?.observationStatus ?? messages.common.unavailable}</p>
              <p>{messages.simulation.tradingActionsFieldLabel} {workstation.isReadOnly ? messages.simulation.tradingReadOnly : messages.simulation.tradingEnabledInSimulation}</p>
            </div>
          </Card>
        </Disclosure>

        <Disclosure summary={messages.simulation.aiBrokerAgentSummary}>
          <Card className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">{messages.simulation.aiToolsEyebrow}</div>
                <h3>{messages.simulation.aiBrokerAgentTitle}</h3>
                <p>
                  {messages.simulation.aiBrokerAgentDescription}
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

      <SimulationBoundaryNotice
        variant="footer"
        label={messages.simulation.actions.simulationOnly}
        message={messages.common.simulationDisclosure}
      />
    </>
  );
}

