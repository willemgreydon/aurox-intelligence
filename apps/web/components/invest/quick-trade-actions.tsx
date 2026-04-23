import Link from 'next/link';
import type { SimulationAssetClass } from '@repo/api-contracts';
import { SimulatedOrderForm, WatchlistToggleForm } from './simulation-action-form';

type QuickTradeActionsProps = {
  detailHref: string;
  detailLabel?: string;
  assetId: string;
  symbol: string;
  assetClass: SimulationAssetClass;
  isAuthenticated: boolean;
  strategyLaneId:
    | 'manual_stock_lane'
    | 'manual_multi_asset_lane'
    | 'ai_copilot_lane'
    | 'signal_follow_lane'
    | 'agent_sandbox_lane';
  simulationSessionId?: string;
  disabled?: boolean;
  disabledReason?: string;
  showWatchlist?: boolean;
  isWatched?: boolean;
  watchlistLabelAdd?: string;
  watchlistLabelRemove?: string;
};

export function QuickTradeActions({
  detailHref,
  detailLabel = 'Details',
  assetId,
  symbol,
  assetClass,
  isAuthenticated,
  strategyLaneId,
  simulationSessionId,
  disabled = false,
  disabledReason,
  showWatchlist = false,
  isWatched = false,
  watchlistLabelAdd = 'Add to watchlist',
  watchlistLabelRemove = 'Remove from watchlist',
}: QuickTradeActionsProps) {
  if (!isAuthenticated) {
    return (
      <div className="analytics-card__actions">
        <Link href={detailHref} className="button button--secondary">
          {detailLabel}
        </Link>
        <Link href="/login" className="button button--primary">
          Sign in to trade
        </Link>
      </div>
    );
  }

  return (
    <>
      <Link href={detailHref} className="button button--secondary">
        {detailLabel}
      </Link>
      {showWatchlist ? (
        <WatchlistToggleForm
          assetId={assetId}
          symbol={symbol}
          assetClass={assetClass}
          active={isWatched}
          label={isWatched ? watchlistLabelRemove : watchlistLabelAdd}
        />
      ) : null}
      <SimulatedOrderForm
        assetId={assetId}
        symbol={symbol}
        assetClass={assetClass}
        side="buy"
        strategyLaneId={strategyLaneId}
        simulationSessionId={simulationSessionId}
        label="Simulate buy"
        disabled={disabled}
        disabledReason={disabledReason}
      />
      <SimulatedOrderForm
        assetId={assetId}
        symbol={symbol}
        assetClass={assetClass}
        side="sell"
        strategyLaneId={strategyLaneId}
        simulationSessionId={simulationSessionId}
        label="Simulate sell"
        disabled={disabled}
        disabledReason={disabledReason}
      />
    </>
  );
}
