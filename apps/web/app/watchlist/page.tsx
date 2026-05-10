import Link from 'next/link';
import { Section } from '../../components/ui/section';
import { WorkstationPageHeader } from '../../components/asset/workstation-page-header';
import { Card } from '../../components/ui/card';
import { MarketAssetRow } from '../../components/invest/market-asset-row';
import { QuickTradeActions } from '../../components/invest/quick-trade-actions';
import { requireCurrentSession } from '../../server/auth/session';
import { getSimulationPortfolioPageData, loadMiniHistorySeries } from '../../server/services/stock-simulation-service';
import { getAssetInspectHref } from '../../lib/market-routes';

export const dynamic = 'force-dynamic';

export default async function WatchlistPage() {
  await requireCurrentSession('/login');
  const model = await getSimulationPortfolioPageData();
  const symbols = model.watchlist.map((row) => row.asset.symbol);
  const miniHistory = await loadMiniHistorySeries(symbols, 24);
  const heldSymbols = new Set(model.workspace.positions.map((position) => position.symbol));

  return (
    <>
      <Section className="dashboard-section dashboard-section--hero dashboard-section--compact">
        <WorkstationPageHeader
          eyebrow="WATCHLIST / SIMULATION"
          title="Watchlist"
          description="Interactive watchlist lanes with simulation-only trade preparation."
          summary="Simulation only. No live broker execution."
          statusLabel="SIMULATION"
          statusTone="info"
          meta={[
            { label: 'Saved symbols', value: String(model.watchlist.length) },
            { label: 'Open positions', value: String(model.workspace.summary.activeInvestmentCount) },
          ]}
          actions={[
            { href: '/invest/simulation', label: 'Open Simulation' },
            { href: '/market', label: 'Open Market' },
          ]}
        />
      </Section>

      <Section className="dashboard-section">
        <Card className="analytics-card">
          <div className="analytics-card__header">
            <div>
              <div className="section__eyebrow">Watchlisted lanes</div>
              <h3>Buy / Sell / Remove / Detail</h3>
              <p>All actions remain simulation-first and safety-guarded.</p>
            </div>
          </div>
          <div className="analytics-card__body">
            {model.watchlist.length === 0 ? (
              <div className="aurox-empty-state">
                <p className="aurox-empty-state__title">Watchlist is empty.</p>
                <p className="aurox-empty-state__body">Add symbols from Stocks, ETFs, or Crypto lanes.</p>
                <Link href="/invest/stocks" className="button button--primary">Browse stocks</Link>
              </div>
            ) : (
              <div className="market-table">
                {model.watchlist.map((row) => {
                  const changePercent = row.quote?.changePercent;
                  return (
                    <MarketAssetRow
                      key={row.asset.assetId}
                      symbol={row.asset.symbol}
                      title={row.asset.name}
                      category={row.asset.category}
                      thesis={row.asset.thesis}
                      priceLabel={
                        typeof row.quote?.price === 'number' && Number.isFinite(row.quote.price)
                          ? `$${row.quote.price.toFixed(2)}`
                          : 'Unavailable'
                      }
                      changeLabel={
                        typeof changePercent === 'number' && Number.isFinite(changePercent)
                          ? `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`
                          : 'n/a'
                      }
                      freshnessLabel={row.quote?.observedAt ? new Date(row.quote.observedAt).toLocaleString('en-US') : 'stale'}
                      actionAvailability={row.asset.isTradable ? 'simulated' : 'unavailable'}
                      insightStance={typeof changePercent === 'number' ? (changePercent > 0 ? 'positive' : changePercent < 0 ? 'negative' : 'neutral') : 'neutral'}
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
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </Section>
    </>
  );
}
