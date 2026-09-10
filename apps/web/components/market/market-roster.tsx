import { InvestableAssetCard } from '../invest/investable-asset-card';
import { MarketAssetRow } from '../invest/market-asset-row';
import { QuickTradeActions } from '../invest/quick-trade-actions';
import { StatePanel } from '../ui/state-panel';
import type { MarketViewMode } from '../invest/market-view-toggle';
import type { MarketRosterCardViewModel } from '../../server/mappers/market-roster-mapper';

type MarketRosterProps = {
  cards: MarketRosterCardViewModel[];
  viewMode: MarketViewMode;
  isAuthenticated: boolean;
  labels: {
    emptyTitle: string;
    emptyDescription: string;
    addToWatchlist: string;
    removeFromWatchlist: string;
  };
};

/**
 * Presentational market roster. Renders pre-shaped card view models
 * (read-model-rule) as either a responsive card grid or a dense list. All
 * financial/signal values are already derived in the mapper; this component
 * only lays them out and slots the client-side trade actions.
 */
export function MarketRoster({ cards, viewMode, isAuthenticated, labels }: MarketRosterProps) {
  if (cards.length === 0) {
    return <StatePanel title={labels.emptyTitle} description={labels.emptyDescription} tone="subtle" />;
  }

  return (
    <div className={viewMode === 'grid' ? 'analytics-two-grid' : 'market-list'}>
      {cards.map((card) => {
        const tradeActions = (
          <QuickTradeActions
            detailHref={card.detailHref}
            assetId={card.assetId}
            symbol={card.symbol}
            assetClass={card.assetClass}
            isAuthenticated={isAuthenticated}
            strategyLaneId={card.strategyLaneId}
            showWatchlist
            isWatched={card.isWatched}
            watchlistLabelAdd={labels.addToWatchlist}
            watchlistLabelRemove={labels.removeFromWatchlist}
          />
        );

        return viewMode === 'grid' ? (
          <InvestableAssetCard
            key={card.assetId}
            href={card.detailHref}
            title={card.title}
            symbol={card.symbol}
            categoryLabel={card.categoryLabel}
            thesis={card.thesis}
            priceLabel={card.priceLabel}
            changeLabel={card.changeLabel}
            freshnessLabel={card.freshnessLabel}
            actionAvailability={card.actionAvailability}
            insightStance={card.insightStance}
            riskSummary={card.riskSummary}
            riskLabel={card.riskLabel}
            sparkline={card.sparkline}
            miniChartModel={card.miniChartModel}
            signal={card.signal}
            actions={tradeActions}
          />
        ) : (
          <MarketAssetRow
            key={card.assetId}
            symbol={card.symbol}
            title={card.title}
            category={card.categoryLabel}
            thesis={card.thesis}
            priceLabel={card.priceLabel}
            changeLabel={card.changeLabel}
            freshnessLabel={card.freshnessLabel}
            actionAvailability={card.actionAvailability}
            insightStance={card.insightStance}
            sparkline={card.sparkline}
            miniChartModel={card.miniChartModel}
            signal={{
              score: card.signal.score,
              label: card.signal.label,
              confidence: card.signal.confidence,
              visualState: card.signal.visualState,
              explanation: card.signal.explanation,
            }}
            riskLabel={card.riskLabel}
            actions={<div className="market-row__action-grid">{tradeActions}</div>}
          />
        );
      })}
    </div>
  );
}
