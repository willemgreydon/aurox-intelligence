import { notFound } from 'next/navigation';
import { SimulatedOrderForm, WatchlistToggleForm } from '../../../components/invest/simulation-action-form';
import { SymbolDetailView, type SymbolDetailNewsItem } from '../../../components/asset/symbol-detail-view';
import type { SymbolDetailTabId } from '../../../components/asset/symbol-detail-tabs';
import { getMessages } from '../../../lib/i18n/messages';
import { getRequestLocale } from '../../../server/i18n/locale';
import { getStockDetailPageData } from '../../../server/services/stock-simulation-service';
import { deriveAssetDecisionIntelligence } from '../../../server/services/decision-intelligence-service';
import { getSnapshotsForAsset } from '../../../server/services/news-intelligence-service';

export const dynamic = 'force-dynamic';

const VALID_TABS: SymbolDetailTabId[] = ['overview', 'signals', 'risk', 'journal', 'data'];

function resolveTab(value: string | undefined): SymbolDetailTabId {
  return VALID_TABS.includes(value as SymbolDetailTabId) ? (value as SymbolDetailTabId) : 'overview';
}

type StockDetailPageProps = {
  params: Promise<{ symbol: string }>;
  searchParams?: Promise<{ tab?: string }>;
};

export default async function StockDetailPage({ params, searchParams }: StockDetailPageProps) {
  const { symbol } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const activeTab = resolveTab(resolvedSearchParams?.tab);

  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  const stock = await getStockDetailPageData(symbol);
  const newsSnapshots = await getSnapshotsForAsset(symbol).catch(() => []);

  if (!stock) {
    notFound();
  }

  const decision = deriveAssetDecisionIntelligence({
    symbol: stock.asset.symbol,
    assetClass: 'stock',
    history: stock.history.map((point) => point.close),
    latestPrice: stock.quote?.price ?? null,
    dayMovePercent: stock.quote?.changePercent ?? null,
    quantity: stock.position?.quantity ?? 1,
    portfolioValue: stock.position?.marketValue ? Math.max(stock.position.marketValue * 4, 10000) : 100000,
    existingExposure: stock.position?.marketValue ?? 0,
  });

  const news: SymbolDetailNewsItem[] = newsSnapshots.slice(0, 3).map((snapshot) => ({
    id: snapshot.id,
    title: snapshot.article.title,
    riskScore: snapshot.riskScore,
    opportunityScore: snapshot.opportunityScore,
    sentimentScore: snapshot.sentimentScore,
    eventTypes: snapshot.eventTypes,
  }));

  const orderUiText = {
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

  // Public page: no session/lane gating (matches prior behavior). The sell form
  // is still gated on holding a position.
  const actions = (
    <>
      <WatchlistToggleForm
        assetId={stock.asset.assetId}
        symbol={stock.asset.symbol}
        assetClass="stock"
        active={stock.isWatched}
        label={stock.isWatched ? messages.dashboard.removeFromWatchlist : messages.dashboard.addToWatchlist}
      />
      <SimulatedOrderForm
        assetId={stock.asset.assetId}
        symbol={stock.asset.symbol}
        assetClass="stock"
        side="buy"
        label={messages.dashboard.buySimulated}
        showQuantityInput
        quantityLabel={messages.simulation.quantity}
        currentPrice={stock.quote?.price ?? null}
        currentHeldQuantity={stock.position?.quantity ?? 0}
        uiText={orderUiText}
      />
      <SimulatedOrderForm
        assetId={stock.asset.assetId}
        symbol={stock.asset.symbol}
        assetClass="stock"
        side="sell"
        label={messages.dashboard.sellSimulated}
        showQuantityInput
        quantityLabel={messages.simulation.quantity}
        currentPrice={stock.quote?.price ?? null}
        currentHeldQuantity={stock.position?.quantity ?? 0}
        disabled={!stock.position || stock.position.quantity <= 0}
        disabledReason={messages.simulation.validation.noOpenPositionToSell.replace('{{symbol}}', stock.asset.symbol)}
        uiText={orderUiText}
      />
    </>
  );

  return (
    <SymbolDetailView
      asset={stock.asset}
      quote={stock.quote}
      history={stock.history}
      position={stock.position}
      isWatched={stock.isWatched}
      decision={decision}
      assetClass="stock"
      locale={locale}
      messages={messages}
      activeTab={activeTab}
      historyEmptyMessage={messages.stocks.historyUnavailable}
      basePath={`/stocks/${encodeURIComponent(stock.asset.symbol)}`}
      backHref="/stocks"
      backLabel="Back to stocks"
      simulationHref="/invest/simulation"
      eyebrow="Stock detail"
      title={`${stock.asset.symbol} simulation workspace`}
      positionUnitLabel="shares"
      actions={actions}
      news={news}
    />
  );
}
