import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { SimulatedOrderForm, WatchlistToggleForm } from '../../../../components/invest/simulation-action-form';
import { SymbolDetailView } from '../../../../components/asset/symbol-detail-view';
import type { SymbolDetailTabId } from '../../../../components/asset/symbol-detail-tabs';
import { getMessages } from '../../../../lib/i18n/messages';
import { getRequestLocale } from '../../../../server/i18n/locale';
import { getOptionalCurrentSession } from '../../../../server/auth/session';
import { getInvestableAssetDetailPageData } from '../../../../server/services/stock-simulation-service';
import { getSimulationSessionTradingContextForUser } from '../../../../server/services/simulation-workstation-service';
import { deriveAssetDecisionIntelligence } from '../../../../server/services/decision-intelligence-service';

export const dynamic = 'force-dynamic';

const VALID_TABS: SymbolDetailTabId[] = ['overview', 'signals', 'risk', 'journal', 'data'];

function resolveTab(value: string | undefined): SymbolDetailTabId {
  return VALID_TABS.includes(value as SymbolDetailTabId) ? (value as SymbolDetailTabId) : 'overview';
}

type StockDetailPageProps = {
  params: Promise<{ symbol: string }>;
  searchParams?: Promise<{ tab?: string }>;
};

export async function generateMetadata({ params }: StockDetailPageProps): Promise<Metadata> {
  const { symbol } = await params;
  const upperSymbol = decodeURIComponent(symbol).trim().toUpperCase();
  return {
    title: `${upperSymbol} Stock Intelligence | Aurox Intelligence`,
    description: `Simulation-mode research and order planning for ${upperSymbol}. Signal scores, risk overlay, and paper-trading actions.`,
  };
}

export default async function InvestStockDetailPage({ params, searchParams }: StockDetailPageProps) {
  const { symbol: rawSymbol } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const activeTab = resolveTab(resolvedSearchParams?.tab);

  // Normalise: URL-decode, trim whitespace, uppercase for lookup.
  const symbol = decodeURIComponent(rawSymbol).trim().toUpperCase();

  // Reject obviously malformed symbols (empty string or excessively long).
  if (!symbol || symbol.length > 20) {
    notFound();
  }

  const locale = await getRequestLocale();
  const messages = getMessages(locale);

  const asset = await getInvestableAssetDetailPageData(symbol, 'stock');
  const hasQuotePrice = typeof asset?.quote?.price === 'number' && Number.isFinite(asset.quote.price);

  if (!asset) {
    notFound();
  }

  const decision = deriveAssetDecisionIntelligence({
    symbol: asset.asset.symbol,
    assetClass: 'stock',
    history: asset.history.map((point) => point.close),
    latestPrice: asset.quote?.price ?? null,
    dayMovePercent: asset.quote?.changePercent ?? null,
    quantity: asset.position?.quantity ?? 1,
    portfolioValue: asset.position?.marketValue ? Math.max(asset.position.marketValue * 4, 10000) : 100000,
    existingExposure: asset.position?.marketValue ?? 0,
  });

  const auth = await getOptionalCurrentSession();
  const sessionContext = auth
    ? await getSimulationSessionTradingContextForUser(auth.user.id).catch(() => null)
    : null;

  const isSimulationTradable =
    asset.asset.isSimulated &&
    asset.asset.isTradable &&
    asset.asset.actionAvailability !== 'unavailable';

  const disabledReason = (() => {
    if (!isSimulationTradable) {
      return 'Simulation trading for this asset is not active yet.';
    }
    if (!sessionContext || !sessionContext.sessionId) {
      return 'Start the manual stock simulation lane to place stock simulation orders.';
    }
    if (sessionContext.isReadOnly) {
      return sessionContext.statusMessage;
    }
    if (sessionContext.laneId !== 'manual_stock_lane') {
      return 'Switch to the manual stock lane to simulate stock orders.';
    }
    if (sessionContext.assetScope !== 'stock' && sessionContext.assetScope !== 'multi-asset') {
      return `The active session is scoped to ${sessionContext.assetScope?.toUpperCase() ?? 'another asset class'} assets.`;
    }
    if (!hasQuotePrice) {
      return `A fresh quote is required to place orders for ${asset.asset.symbol}.`;
    }
    return undefined;
  })();
  const tradingDisabled = Boolean(disabledReason);

  const uiText = {
    quantityMode: messages.simulation.quantity,
    notionalMode: 'Notional',
    notionalAmount: 'Notional amount',
    quantityRequired: messages.simulation.validation.quantityRequired,
    minimumShare: messages.simulation.validation.minimumShare,
    minimumUnit: messages.simulation.validation.minimumUnit,
    minimumQuantityTemplate: messages.simulation.validation.minimumQuantity,
    wholeSharesOnly: messages.simulation.validation.wholeSharesOnly,
    quantityStepMismatchTemplate: messages.simulation.validation.quantityStepMismatch,
    minimumNotional: messages.simulation.validation.minimumNotional,
    noOpenPositionToSellTemplate: messages.simulation.validation.noOpenPositionToSell,
    closePosition: messages.simulation.chips.closePosition,
  };

  // Session/lane-gated action subtree built here so gating never leaks into the
  // shared view (the public /stocks route builds its own, ungated, subtree).
  const actions = (
    <>
      <WatchlistToggleForm
        assetId={asset.asset.assetId}
        symbol={asset.asset.symbol}
        assetClass="stock"
        active={asset.isWatched}
        label={asset.isWatched ? messages.dashboard.removeFromWatchlist : messages.dashboard.addToWatchlist}
      />
      <SimulatedOrderForm
        assetId={asset.asset.assetId}
        symbol={asset.asset.symbol}
        assetClass="stock"
        side="buy"
        strategyLaneId="manual_stock_lane"
        simulationSessionId={sessionContext?.sessionId ?? undefined}
        label={messages.dashboard.buySimulated}
        showQuantityInput
        quantityLabel={messages.simulation.quantity}
        disabled={tradingDisabled}
        disabledReason={disabledReason}
        currentPrice={asset.quote?.price ?? null}
        currentHeldQuantity={asset.position?.quantity ?? 0}
        sourceContext="stock-lane"
        uiText={uiText}
      />
      <SimulatedOrderForm
        assetId={asset.asset.assetId}
        symbol={asset.asset.symbol}
        assetClass="stock"
        side="sell"
        strategyLaneId="manual_stock_lane"
        simulationSessionId={sessionContext?.sessionId ?? undefined}
        label={messages.dashboard.sellSimulated}
        showQuantityInput
        quantityLabel={messages.simulation.quantity}
        disabled={tradingDisabled || !asset.position || asset.position.quantity <= 0}
        disabledReason={
          !asset.position || asset.position.quantity <= 0
            ? messages.simulation.validation.noOpenPositionToSell.replace('{{symbol}}', asset.asset.symbol)
            : disabledReason
        }
        currentPrice={asset.quote?.price ?? null}
        currentHeldQuantity={asset.position?.quantity ?? 0}
        sourceContext="stock-lane"
        uiText={uiText}
      />
    </>
  );

  return (
    <SymbolDetailView
      asset={asset.asset}
      quote={asset.quote}
      history={asset.history}
      position={asset.position}
      isWatched={asset.isWatched}
      decision={decision}
      assetClass="stock"
      locale={locale}
      messages={messages}
      activeTab={activeTab}
      historyEmptyMessage={messages.marketGraph.noData}
      basePath={`/invest/stocks/${encodeURIComponent(asset.asset.symbol)}`}
      backHref="/invest/stocks"
      backLabel="Back to stocks"
      simulationHref="/invest/simulation?lane=manual_stock_lane"
      eyebrow="Stocks / Detail"
      title={`${asset.asset.symbol} equity lane`}
      positionUnitLabel="units"
      actions={actions}
    />
  );
}
