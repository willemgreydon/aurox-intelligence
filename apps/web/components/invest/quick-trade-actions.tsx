import Link from 'next/link';
import type { SimulationAssetClass } from '@repo/api-contracts';
import { WatchlistToggleForm } from './simulation-action-form';

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
  reviewRiskHref?: string;
  liveTradingEnabled?: boolean;
};

export function QuickTradeActions({
  detailHref,
  detailLabel = 'View details',
  assetId,
  symbol,
  assetClass,
  isAuthenticated,
  strategyLaneId,
  disabled = false,
  disabledReason,
  showWatchlist = false,
  isWatched = false,
  watchlistLabelAdd = 'Add to watchlist',
  watchlistLabelRemove = 'Remove from watchlist',
  reviewRiskHref = '/invest/live-readiness',
  liveTradingEnabled = false,
}: QuickTradeActionsProps) {
  const simulationHref = `/invest/simulation?symbol=${encodeURIComponent(symbol)}&assetClass=${encodeURIComponent(assetClass)}&lane=${encodeURIComponent(strategyLaneId)}`;

  if (!isAuthenticated) {
    return (
      <div className="analytics-card__actions">
        <Link href={detailHref} className="button button--primary">
          {detailLabel}
        </Link>
        <Link href={reviewRiskHref} className="button button--secondary">
          Review risk
        </Link>
        <Link href="/login" className="button button--secondary">
          Sign in to simulate
        </Link>
      </div>
    );
  }

  return (
    <>
      <Link href={detailHref} className="button button--primary">
        {detailLabel}
      </Link>
      <Link href={simulationHref} className="button button--secondary" aria-disabled={disabled} title={disabledReason}>
        Simulate trade
      </Link>
      <button
        type="button"
        className="button button--secondary"
        disabled={!liveTradingEnabled}
        title={liveTradingEnabled ? 'Live execution controls' : 'Live trading is disabled until readiness gates are satisfied.'}
        aria-label={liveTradingEnabled ? 'Open live trading controls' : 'Live trading disabled until readiness gates are satisfied'}
      >
        {liveTradingEnabled ? 'Live trade' : 'Live trade locked'}
      </button>
      <Link href={reviewRiskHref} className="button button--secondary">
        Review risk
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
    </>
  );
}
