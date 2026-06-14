'use client';

import Link from 'next/link';
import type { SimulationAssetClass } from '@repo/api-contracts';
import { WatchlistToggleForm } from './simulation-action-form';
import { buildNoOpenPositionReason } from '../../lib/simulation-form-helpers';
import { buildSimulationPrepareHref } from '../../lib/simulation-prepare-url';
import { resolveInspectHref } from '../../lib/inspect-link';
import {
  getSimulationAssetActionState,
  type SimulationActionAvailability,
  type SimulationActionDisabledCode,
} from '../../lib/simulation-asset-action-state';

/**
 * Localizable strings. Every field has an English default so existing call
 * sites that pass nothing keep their current copy; the simulation page passes
 * `messages`-derived strings to route the whole component through i18n.
 */
type QuickTradeActionLabels = Partial<{
  buy: string;
  sell: string;
  reviewRisk: string;
  signIn: string;
  simulationOnly: string;
  liveLocked: string;
  /** Template; `{{symbol}}` is replaced. */
  noOpenPosition: string;
  assetPlanned: string;
  assetUnavailable: string;
}>;

type QuickTradeActionsProps = {
  detailHref?: string;
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
  /** Drives planned/unavailable gating; defaults to a tradable simulation asset. */
  actionAvailability?: SimulationActionAvailability;
  showWatchlist?: boolean;
  isWatched?: boolean;
  watchlistLabelAdd?: string;
  watchlistLabelRemove?: string;
  reviewRiskHref?: string;
  hasSimulatedPosition?: boolean;
  source?: string;
  labels?: QuickTradeActionLabels;
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
  actionAvailability = 'simulated',
  showWatchlist = false,
  isWatched = false,
  watchlistLabelAdd = 'Add to watchlist',
  watchlistLabelRemove = 'Remove from watchlist',
  reviewRiskHref = '/invest/live-readiness',
  hasSimulatedPosition = false,
  source,
  labels,
}: QuickTradeActionsProps) {
  const buyLabel = labels?.buy ?? 'Prepare Buy';
  const sellLabel = labels?.sell ?? 'Prepare Sell';
  const reviewRiskLabel = labels?.reviewRisk ?? 'Review Risk';

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
  const inspectHref = resolveInspectHref({ symbol, assetClass, detailHref });

  if (!isAuthenticated) {
    return (
      <div className="asset-card-actions">
        <div className="asset-card-actions__grid">
          {inspectHref ? (
            <Link href={inspectHref} className="button button--secondary asset-card-action">
              {detailLabel}
            </Link>
          ) : (
            <button type="button" className="button button--secondary asset-card-action" disabled aria-disabled="true">
              {detailLabel}
            </button>
          )}
          <Link href="/login" className="button button--secondary asset-card-action">
            {labels?.signIn ?? 'Sign in'}
          </Link>
        </div>
        <div className="asset-card-actions__status-row">
          <span className="status-pill status-pill--neutral" style={{ fontSize: '0.65rem' }}>{labels?.simulationOnly ?? 'Simulation only'}</span>
          <span className="status-pill status-pill--neutral" style={{ fontSize: '0.65rem', cursor: 'default' }}>{labels?.liveLocked ?? 'Live locked'}</span>
        </div>
      </div>
    );
  }

  const actionState = getSimulationAssetActionState({
    isAuthenticated,
    isReadOnly: disabled,
    actionAvailability,
    hasOpenPosition: hasSimulatedPosition,
  });

  // Map a disabled code to its (localized) assistive reason. Reasons are exposed
  // via `title` + a visually-hidden description (aria-describedby) — never a loud,
  // repeated inline note on every card.
  function reasonForCode(code: SimulationActionDisabledCode | null): string | undefined {
    switch (code) {
      case 'read_only':
        return disabledReason;
      case 'quote_unusable':
        return disabledReason ?? 'Fresh quote required before simulation execution.';
      case 'asset_planned':
        return labels?.assetPlanned ?? 'Planned — simulation trading not yet available.';
      case 'asset_unavailable':
        return labels?.assetUnavailable ?? 'Not available for simulation.';
      case 'no_open_position':
        return labels?.noOpenPosition
          ? labels.noOpenPosition.replace('{{symbol}}', symbol)
          : buildNoOpenPositionReason(symbol);
      default:
        return undefined;
    }
  }

  const buyReason = reasonForCode(actionState.buyDisabledCode);
  const sellReason = reasonForCode(actionState.sellDisabledCode);
  const buyDescId = `${assetId}-buy-reason`;
  const sellDescId = `${assetId}-sell-reason`;

  return (
    <div className="asset-card-actions">
      {/* Primary sim actions: Prepare Buy / Prepare Sell */}
      <div className="asset-card-actions__grid">
        {actionState.canPrepareBuy ? (
          <Link
            href={buyHref}
            className="button button--primary asset-card-action"
            aria-label={`Prepare simulation buy for ${symbol}`}
          >
            {buyLabel}
          </Link>
        ) : (
          <span className="asset-card-actions__disabled-cell">
            <button
              type="button"
              className="button button--primary asset-card-action"
              disabled
              aria-disabled="true"
              aria-label={`${buyLabel} ${symbol} (unavailable)`}
              title={buyReason}
              aria-describedby={buyReason ? buyDescId : undefined}
            >
              {buyLabel}
            </button>
            {buyReason && (
              <span id={buyDescId} className="sr-only">{buyReason}</span>
            )}
          </span>
        )}

        {actionState.canPrepareSell ? (
          <Link
            href={sellHref}
            className="button button--secondary asset-card-action"
            aria-label={`Prepare simulation sell for ${symbol}`}
          >
            {sellLabel}
          </Link>
        ) : (
          <span className="asset-card-actions__disabled-cell">
            <button
              type="button"
              className="button button--secondary asset-card-action"
              disabled
              aria-disabled="true"
              aria-label={`${sellLabel} ${symbol} (unavailable)`}
              title={sellReason}
              aria-describedby={sellReason ? sellDescId : undefined}
            >
              {sellLabel}
            </button>
            {sellReason && (
              <span id={sellDescId} className="sr-only">{sellReason}</span>
            )}
          </span>
        )}
      </div>

      {/* Secondary actions */}
      <div className="asset-card-actions__grid asset-card-actions__grid--secondary">
        <Link href={reviewRiskHref} className="button button--ghost asset-card-action asset-card-action--secondary">
          {reviewRiskLabel}
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
        <span className="status-pill status-pill--neutral" style={{ fontSize: '0.65rem', cursor: 'default' }}>{labels?.liveLocked ?? 'Live locked'}</span>
      </div>
    </div>
  );
}
