import type { ClaudeFinanceLaneCard } from '@repo/api-contracts';
import { WatchlistToggleForm } from '../invest/simulation-action-form';
import { buildSimulationPrepareHrefForAsset } from '../../lib/simulation-prepare-url';

type StarredLaneCardProps = {
  lane: ClaudeFinanceLaneCard;
};

const stanceClass: Record<ClaudeFinanceLaneCard['changeStance'], string> = {
  positive: 'finance-lane__change--positive',
  negative: 'finance-lane__change--negative',
  neutral: 'finance-lane__change--neutral',
};

/**
 * Compact starred-lane card. Renders a pre-shaped read model — no quote math,
 * no provider calls. The star toggle reuses the existing DB-backed watchlist
 * action; "Details" routes to the canonical symbol detail/prepare surface.
 */
export function StarredLaneCard({ lane }: StarredLaneCardProps) {
  const detailHref = buildSimulationPrepareHrefForAsset({
    symbol: lane.symbol,
    assetClass: lane.assetClass,
    side: 'buy',
    source: 'claude-finance',
  });

  return (
    <article className="finance-lane">
      <div className="finance-lane__head">
        <div className="finance-lane__id">
          <span className="finance-lane__symbol">{lane.symbol}</span>
          <span className="finance-lane__class-badge">{lane.assetClass.toUpperCase()}</span>
          {lane.isOwned ? <span className="finance-lane__owned-badge">Owned</span> : null}
        </div>
        <div className="finance-lane__price">
          <span className="finance-lane__price-value">{lane.priceLabel}</span>
          <span className={`finance-lane__change ${stanceClass[lane.changeStance]}`}>{lane.changeLabel}</span>
        </div>
      </div>

      <p className="finance-lane__name">{lane.name}</p>
      <p className="finance-lane__meta">
        <span className="finance-lane__freshness">{lane.freshnessLabel}</span>
        <span className="finance-lane__category">{lane.category}</span>
      </p>

      <div className="finance-lane__actions">
        <WatchlistToggleForm
          assetId={lane.assetId}
          symbol={lane.symbol}
          assetClass={lane.assetClass}
          active={lane.isWatched}
          label={lane.isWatched ? `Unstar ${lane.symbol}` : `Star ${lane.symbol}`}
        />
        <a className="button button--secondary" href={detailHref}>
          Details
        </a>
      </div>
    </article>
  );
}
