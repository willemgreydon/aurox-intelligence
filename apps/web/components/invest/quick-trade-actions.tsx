'use client';

import Link from 'next/link';
import type { SimulationAssetClass } from '@repo/api-contracts';
import { WatchlistToggleForm } from './simulation-action-form';
import { buildNoOpenPositionReason } from '../../lib/simulation-form-helpers';
import { buildSimulationPrepareHref } from '../../lib/simulation-prepare-url';

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
  hasSimulatedPosition?: boolean;
  source?: string;
};

export function QuickTradeActions({
  detailHref,
  detailLabel = 'Inspect',
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
  hasSimulatedPosition = false,
  source,
}: QuickTradeActionsProps) {
  const buyHref = buildSimulationPrepareHref({
    symbol,
    assetClass,
    lane: strategyLaneId,
    side: 'buy',
    source,
  });
  const sellHref = buildSimulationPrepareHref({
    symbol,
    assetClass,
    lane: strategyLaneId,
    side: 'sell',
    source,
  });

  if (!isAuthenticated) {
    return (
      <div className="asset-card-actions">
        <div className="asset-card-actions__grid">
          <Link href={detailHref} className="button button--secondary asset-card-action">
            {detailLabel}
          </Link>
          <Link href="/login" className="button button--secondary asset-card-action">
            Sign in
          </Link>
        </div>
        <div className="asset-card-actions__status-row">
          <span className="status-pill status-pill--neutral" style={{ fontSize: '0.65rem' }}>Simulation only</span>
          <span className="status-pill status-pill--neutral" style={{ fontSize: '0.65rem', cursor: 'default' }}>Live locked</span>
        </div>
      </div>
    );
  }

  const sellDisabled = disabled || !hasSimulatedPosition;
  const sellDisabledReason = !hasSimulatedPosition
    ? buildNoOpenPositionReason(symbol)
    : disabledReason;

  return (
    <div className="asset-card-actions">
      {/* Primary sim actions: Prepare Buy / Prepare Sell */}
      <div className="asset-card-actions__grid">
        {disabled ? (
          <span className="asset-card-actions__disabled-cell">
            <button type="button" className="button button--primary asset-card-action" disabled aria-disabled="true">
              Prepare Buy
            </button>
            {disabledReason && (
              <span className="asset-card-action-note" role="note">{disabledReason}</span>
            )}
          </span>
        ) : (
          <Link
            href={buyHref}
            className="button button--primary asset-card-action"
            aria-label={`Prepare simulation buy for ${symbol}`}
          >
            Prepare Buy
          </Link>
        )}

        {sellDisabled ? (
          <span className="asset-card-actions__disabled-cell">
            <button type="button" className="button button--secondary asset-card-action" disabled aria-disabled="true">
              Prepare Sell
            </button>
            {sellDisabledReason && (
              <span className="asset-card-action-note" role="note">{sellDisabledReason}</span>
            )}
          </span>
        ) : (
          <Link
            href={sellHref}
            className="button button--secondary asset-card-action"
            aria-label={`Prepare simulation sell for ${symbol}`}
          >
            Prepare Sell
          </Link>
        )}
      </div>

      {/* Secondary actions */}
      <div className="asset-card-actions__grid asset-card-actions__grid--secondary">
        <Link href={reviewRiskHref} className="button button--ghost asset-card-action asset-card-action--secondary">
          Review Risk
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
      </div>

      {/* Status badges */}
      <div className="asset-card-actions__status-row">
        <span className="status-pill status-pill--info" style={{ fontSize: '0.65rem' }}>SIM</span>
        <span className="status-pill status-pill--neutral" style={{ fontSize: '0.65rem', cursor: 'default' }}>Live locked</span>
      </div>
    </div>
  );
}
