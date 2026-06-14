import Link from 'next/link';
import { Section } from '../../components/ui/section';
import { WorkstationPageHeader } from '../../components/asset/workstation-page-header';
import { MarketAssetRow } from '../../components/invest/market-asset-row';
import { PaginatedAssetList } from '../../components/invest/paginated-asset-list';
import { QuickTradeActions } from '../../components/invest/quick-trade-actions';
import { requireCurrentSession } from '../../server/auth/session';
import { getSimulationPortfolioPageData, loadMiniHistorySeries } from '../../server/services/stock-simulation-service';
import { getAssetInspectHref } from '../../lib/market-routes';

export const dynamic = 'force-dynamic';

function formatPrice(price: number | null | undefined): string {
  if (typeof price !== 'number' || !Number.isFinite(price)) return 'Unavailable';
  return `$${price.toFixed(2)}`;
}

function formatChange(changePercent: number | null | undefined): string {
  if (typeof changePercent !== 'number' || !Number.isFinite(changePercent)) return 'n/a';
  return `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`;
}

function changeStance(changePercent: number | null | undefined): 'positive' | 'negative' | 'neutral' {
  if (typeof changePercent !== 'number') return 'neutral';
  if (changePercent > 0) return 'positive';
  if (changePercent < 0) return 'negative';
  return 'neutral';
}

export default async function WatchlistPage() {
  await requireCurrentSession('/login');
  const model = await getSimulationPortfolioPageData();
  const symbols = model.watchlist.map((row) => row.asset.symbol);
  const miniHistory = await loadMiniHistorySeries(symbols, 24);
  const heldSymbols = new Set(model.workspace.positions.map((position) => position.symbol));

  const gainers = model.watchlist.filter((row) => (row.quote?.changePercent ?? 0) > 0);
  const losers = model.watchlist.filter((row) => (row.quote?.changePercent ?? 0) < 0);
  const held = model.watchlist.filter((row) => heldSymbols.has(row.asset.symbol));

  // Pre-render watchlist rows so the list can be paginated client-side.
  const watchlistNodes = model.watchlist.map((row) => {
    const changePercent = row.quote?.changePercent;
    return {
      key: row.asset.assetId,
      node: (
        <MarketAssetRow
          symbol={row.asset.symbol}
          title={row.asset.name}
          category={row.asset.category}
          thesis={row.asset.thesis}
          priceLabel={formatPrice(row.quote?.price)}
          changeLabel={formatChange(changePercent)}
          freshnessLabel={
            row.quote?.observedAt
              ? new Date(row.quote.observedAt).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'stale'
          }
          actionAvailability={row.asset.isTradable ? 'simulated' : 'unavailable'}
          insightStance={changeStance(changePercent)}
          sparkline={miniHistory[row.asset.symbol] ?? []}
          actions={(
            <QuickTradeActions
              detailHref={getAssetInspectHref({ symbol: row.asset.symbol, assetClass: row.asset.assetClass })}
              assetId={row.asset.assetId}
              symbol={row.asset.symbol}
              assetClass={row.asset.assetClass as 'stock' | 'etf' | 'crypto'}
              isAuthenticated
              strategyLaneId="manual_multi_asset_lane"
              showWatchlist
              isWatched
              hasSimulatedPosition={heldSymbols.has(row.asset.symbol)}
            />
          )}
        />
      ),
    };
  });

  return (
    <>
      <Section className="dashboard-section dashboard-section--hero dashboard-section--compact">
        <WorkstationPageHeader
          eyebrow="WATCHLIST / SIMULATION"
          title="Watchlist"
          description="Tracked symbols with live quotes, sparklines, and simulation-first trade actions."
          summary="Simulation only. No live broker execution."
          statusLabel="SIMULATION"
          statusTone="info"
          meta={[
            { label: 'Watching', value: String(model.watchlist.length) },
            { label: 'Held', value: String(held.length) },
            { label: 'Gainers', value: String(gainers.length) },
            { label: 'Losers', value: String(losers.length) },
            { label: 'Open positions', value: String(model.workspace.summary.activeInvestmentCount) },
          ]}
          actions={[
            { href: '/invest/simulation', label: 'Open Simulation' },
            { href: '/invest/stocks', label: 'Browse Stocks' },
            { href: '/market', label: 'Market' },
          ]}
        />
      </Section>

      {/* Summary KPI strip */}
      {model.watchlist.length > 0 ? (
        <Section className="dashboard-section dashboard-section--compact">
          <div className="watchlist-kpi-rail">
            <article className="watchlist-kpi-card">
              <div className="watchlist-kpi-card__value">{model.watchlist.length}</div>
              <div className="watchlist-kpi-card__label">Symbols tracked</div>
            </article>
            <article className="watchlist-kpi-card">
              <div className="watchlist-kpi-card__value watchlist-kpi-card__value--success">{gainers.length}</div>
              <div className="watchlist-kpi-card__label">Gainers today</div>
            </article>
            <article className="watchlist-kpi-card">
              <div className="watchlist-kpi-card__value watchlist-kpi-card__value--danger">{losers.length}</div>
              <div className="watchlist-kpi-card__label">Losers today</div>
            </article>
            <article className="watchlist-kpi-card">
              <div className="watchlist-kpi-card__value watchlist-kpi-card__value--info">{held.length}</div>
              <div className="watchlist-kpi-card__label">Currently held</div>
            </article>
            <article className="watchlist-kpi-card">
              <div className="watchlist-kpi-card__value">{model.workspace.summary.activeInvestmentCount}</div>
              <div className="watchlist-kpi-card__label">Open positions</div>
            </article>
          </div>
        </Section>
      ) : null}

      {/* Watchlist table */}
      <Section className="dashboard-section">
        <div className="watchlist-workspace">
          <div className="watchlist-workspace__header">
            <div className="watchlist-workspace__title-group">
              <h2 className="watchlist-workspace__title">Watchlisted Symbols</h2>
              <p className="watchlist-workspace__subtitle">
                Buy, sell, remove, or navigate to full detail. All actions are simulation-first and safety-guarded.
              </p>
            </div>
            <div className="watchlist-workspace__header-actions">
              <Link href="/invest/stocks" className="button button--secondary">+ Add stocks</Link>
              <Link href="/invest/crypto" className="button button--secondary">+ Add crypto</Link>
            </div>
          </div>

          {model.watchlist.length === 0 ? (
            <div className="aurox-empty-state">
              <div className="aurox-empty-state__icon" aria-hidden="true">◎</div>
              <p className="aurox-empty-state__title">Your watchlist is empty</p>
              <p className="aurox-empty-state__body">
                Add symbols from Stocks, ETFs, or Crypto lanes to track them here.
              </p>
              <div className="aurox-empty-state__actions">
                <Link href="/invest/stocks" className="button button--primary">Browse stocks</Link>
                <Link href="/invest/crypto" className="button button--secondary">Browse crypto</Link>
              </div>
            </div>
          ) : (
            <>
              {/* Column headers */}
              <div className="watchlist-table-header" role="row" aria-label="Watchlist column headers">
                <span>Symbol</span>
                <span>Price</span>
                <span>Change</span>
                <span>Trend</span>
                <span>Freshness</span>
                <span>Status</span>
                <span>Signal</span>
                <span>Actions</span>
              </div>

              <PaginatedAssetList
                items={watchlistNodes}
                className="market-table watchlist-table"
                pageSize={20}
              />

              <p className="watchlist-workspace__disclaimer">
                Simulation only. No real capital at risk. All trade actions route through the simulation engine.
              </p>
            </>
          )}
        </div>
      </Section>
    </>
  );
}
