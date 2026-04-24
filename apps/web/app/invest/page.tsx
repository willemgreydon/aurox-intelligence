import Link from 'next/link';
import { getUserWatchlist } from '@repo/db';
import { Section } from '../../components/ui/section';
import { WorkstationPageHeader } from '../../components/asset/workstation-page-header';
import { Card } from '../../components/ui/card';
import { CompactStatCard } from '../../components/stats/compact-stat-card';
import { InvestmentCapabilityCard } from '../../components/invest/investment-capability-card';
import { InvestableAssetCard } from '../../components/invest/investable-asset-card';
import { MarketAssetRow } from '../../components/invest/market-asset-row';
import { MarketViewToggle, type MarketViewMode } from '../../components/invest/market-view-toggle';
import { QuickTradeActions } from '../../components/invest/quick-trade-actions';
import { RecommendationCard } from '../../components/invest/recommendation-card';
import { BrokerModeLaunchpad } from '../../components/invest/broker-mode-launchpad';
import { RankedAssetsPanel } from '../../components/invest/ranked-assets-panel';
import { getMessages } from '../../lib/i18n/messages';
import { getOptionalCurrentSession } from '../../server/auth/session';
import { getRequestLocale } from '../../server/i18n/locale';
import { formatFreshnessLabel, formatPercentChange, formatUsdPrice } from '../../server/lib/quote-display';
import { getInvestOverviewData } from '../../server/services/invest-service';
import { getSimulationOverviewDataForUser, loadMiniHistorySeries } from '../../server/services/stock-simulation-service';

export const dynamic = 'force-dynamic';

export default async function InvestPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string }>;
}) {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  const params = searchParams ? await searchParams : {};
  const viewMode: MarketViewMode = params?.view === 'list' ? 'list' : 'grid';

  const [invest, auth] = await Promise.all([
    getInvestOverviewData(locale, messages),
    getOptionalCurrentSession(),
  ]);

  const [watchlist, simulationOverview] = auth
    ? await Promise.all([
        getUserWatchlist(auth.user.id),
        getSimulationOverviewDataForUser(auth.user.id),
      ])
    : [[], null];

  const recommendations = invest.recommendations;

  const stockGroup = invest.groupedAssets.find((g) => g.assetClass === 'stock');
  const stocks = stockGroup?.items ?? [];
  const simulationSummary = simulationOverview?.summary ?? null;
  const sparklineSymbols = [
    ...new Set([
      ...stocks.map((item) => item.symbol),
      ...recommendations.map((item) => item.symbol),
    ]),
  ];
  const sparklineBySymbol = await loadMiniHistorySeries(sparklineSymbols, 24);

  return (
    <>
      <Section className="dashboard-section dashboard-section--hero">
        <WorkstationPageHeader
          eyebrow={messages.shell.nav.investHome}
          title="Investing and simulation"
          description="Research market ideas, save a watchlist, and manage paper-trading sessions in one place."
          summary={messages.common.simulationDisclosure}
          statusLabel="simulation"
          statusTone="info"
          meta={[
            {
              label: messages.common.lastUpdated,
              value: invest.lastUpdatedLabel ?? messages.common.unavailable,
            },
            {
              label: 'Watchlist',
              value: String(watchlist.length),
            },
            {
              label: 'Simulation equity',
              value: simulationSummary
                ? formatUsdPrice(simulationSummary.equityValue, locale, messages.common.unavailable)
                : messages.common.unavailable,
            },
          ]}
          actions={[
            { href: '/invest/simulation', label: messages.simulation.navLabel },
            { href: '/stocks', label: 'Browse stocks' },
            { href: '/dashboard', label: messages.shell.nav.dashboard },
          ]}
        />
      </Section>

      <Section className="dashboard-section">
        <BrokerModeLaunchpad
          baseCapitalUsd={100000}
          isAuthenticated={Boolean(auth)}
          simulationHref="/invest/simulation"
          returnTo="/invest/simulation"
          defaultLaneId="manual_stock_lane"
          title="Start or resume simulation"
          description="Choose a supported lane and open the simulation workstation in a running state."
        />
      </Section>

      <Section className="dashboard-section">
        <div className="analytics-strip">
          <CompactStatCard
            label="Simulation equity"
            value={
              simulationSummary
                ? formatUsdPrice(
                    simulationSummary.equityValue,
                    locale,
                    messages.common.unavailable,
                  )
                : messages.common.unavailable
            }
            detail="Current paper-portfolio equity across the active simulation workspace."
          />
          <CompactStatCard
            label="Available cash"
            value={
              simulationOverview
                ? formatUsdPrice(
                    simulationSummary?.availableCash ?? null,
                    locale,
                    messages.common.unavailable,
                  )
                : messages.common.unavailable
            }
            detail="Cash currently available for new simulated orders."
          />
          <CompactStatCard
            label="Open positions"
            value={simulationSummary ? String(simulationSummary.activeInvestmentCount) : '0'}
            detail="Currently active simulated investments."
          />
          <CompactStatCard
            label="Saved watchlist"
            value={String(watchlist.length)}
            detail="Stocks you pinned for faster access."
          />
        </div>
      </Section>

      <Section className="dashboard-section dashboard-section--tinted">
        <div className="analytics-two-grid">
          <InvestmentCapabilityCard
            title="Paper trading"
            description="Simulation-only buy and sell execution with auditable order and transaction history."
            statusLabel="Ready"
            statusTone="success"
          />
          <InvestmentCapabilityCard
            title="Live brokerage"
            description="Real broker execution is not enabled in this release."
            statusLabel="Disabled"
            statusTone="info"
          />
          <InvestmentCapabilityCard
            title="Stocks"
            description="Supported in research, watchlist, detail pages, and manual simulation."
            statusLabel="Supported"
            statusTone="success"
          />
          <InvestmentCapabilityCard
            title="ETFs and crypto"
            description="Supported in research surfaces and manual multi-asset simulation lanes."
            statusLabel="Supported"
            statusTone="success"
          />
        </div>
      </Section>

      <Section className="dashboard-section">
        <header className="dashboard-section-heading">
          <div>
            <div className="section__eyebrow">Recommendations</div>
            <h2 className="dashboard-section-heading__title">Current market ideas</h2>
            <p className="dashboard-section-heading__description">
              Research candidates with thesis, risk framing, and fast simulation entry points.
            </p>
          </div>
          <MarketViewToggle basePath="/invest" view={viewMode} />
        </header>

        {recommendations.length > 0 ? (
          <div className={viewMode === 'grid' ? 'analytics-two-grid' : 'market-list'}>
            {recommendations.map((item) => (
              viewMode === 'grid' ? (
                <RecommendationCard
                  key={item.symbol}
                  symbol={item.symbol}
                  action={item.action}
                  confidence={item.confidence}
                  summary={item.summary}
                  reasons={item.reasons}
                  sparkline={sparklineBySymbol[item.symbol] ?? []}
                />
              ) : (
                <MarketAssetRow
                  key={item.symbol}
                  symbol={item.symbol}
                  title={`Recommendation: ${item.action}`}
                  category={`Confidence ${(item.confidence * 100).toFixed(0)}%`}
                  thesis={item.summary}
                  priceLabel={item.reasons[0] ?? 'No primary reason'}
                  changeLabel={item.riskNotice}
                  freshnessLabel={item.isPersonalized ? 'Personalized' : 'Market-wide'}
                  actionAvailability="simulated"
                  insightStance={item.action === 'avoid' || item.action === 'trim' ? 'negative' : item.action === 'accumulate' ? 'positive' : 'neutral'}
                  sparkline={sparklineBySymbol[item.symbol] ?? []}
                  actions={(
                    <div className="market-row__action-grid">
                      <Link href="/invest/simulation" className="button button--secondary">
                        Open simulation
                      </Link>
                      <Link href="/invest/overview" className="button button--secondary">
                        Review thesis
                      </Link>
                    </div>
                  )}
                />
              )
            ))}
          </div>
        ) : (
          <Card className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">Recommendations</div>
                <h3>No valid recommendations available</h3>
                <p>
                  The recommendation feed returned incomplete items. The page stays available while
                  invalid entries are skipped.
                </p>
              </div>
            </div>
          </Card>
        )}
      </Section>

      <Section className="dashboard-section">
        <header className="dashboard-section-heading">
          <div>
            <div className="section__eyebrow">Intelligence</div>
            <h2 className="dashboard-section-heading__title">Market ranking</h2>
            <p className="dashboard-section-heading__description">
              Deterministic composite score ranking across all tracked assets. Scores reflect signal,
              factor, regime, and risk inputs from available market data.
            </p>
          </div>
        </header>

        {invest.rankedAssets.length > 0 ? (
          <Card className="analytics-card">
            <RankedAssetsPanel items={invest.rankedAssets.slice(0, 25)} />
          </Card>
        ) : (
          <Card className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">Intelligence</div>
                <h3>No ranking data available</h3>
                <p>Rankings will appear once market data has been loaded for tracked assets.</p>
              </div>
            </div>
          </Card>
        )}
      </Section>

      <Section className="dashboard-section">
        <header className="dashboard-section-heading">
          <div>
            <div className="section__eyebrow">Investable stocks</div>
            <h2 className="dashboard-section-heading__title">Stock universe</h2>
            <p className="dashboard-section-heading__description">
              Manual simulation is enabled for stocks with cached or live quote support.
            </p>
          </div>
        </header>

        {stocks.length > 0 ? (
          <div className={viewMode === 'grid' ? 'analytics-two-grid' : 'market-list'}>
            {stocks.map((item) => {
              const isWatched = watchlist.some((w) => w.assetId === item.assetId);

              return (
                viewMode === 'grid' ? (
                  <InvestableAssetCard
                    key={item.assetId}
                    href={`/stocks/${item.symbol}`}
                    title={item.name}
                    symbol={item.symbol}
                    categoryLabel={item.sector ?? item.category}
                    thesis={item.thesis}
                    priceLabel={formatUsdPrice(item.price, locale, messages.common.unavailable)}
                    changeLabel={formatPercentChange(item.changePercent, messages.common.partial)}
                    freshnessLabel={formatFreshnessLabel(
                      item.lastUpdatedAt,
                      locale,
                      messages.common.unavailable,
                    )}
                    actionAvailability={item.actionAvailability}
                    insightStance={item.insightStance}
                    riskSummary={item.riskSummary}
                    sparkline={sparklineBySymbol[item.symbol] ?? []}
                    actions={(
                      <QuickTradeActions
                        detailHref={`/stocks/${item.symbol}`}
                        assetId={item.assetId}
                        symbol={item.symbol}
                        assetClass="stock"
                        isAuthenticated={Boolean(auth)}
                        strategyLaneId="manual_stock_lane"
                        showWatchlist
                        isWatched={isWatched}
                        watchlistLabelAdd={messages.dashboard.addToWatchlist}
                        watchlistLabelRemove={messages.dashboard.removeFromWatchlist}
                      />
                    )}
                  />
                ) : (
                  <MarketAssetRow
                    key={item.assetId}
                    symbol={item.symbol}
                    title={item.name}
                    category={item.sector ?? item.category}
                    thesis={item.thesis}
                    priceLabel={formatUsdPrice(item.price, locale, messages.common.unavailable)}
                    changeLabel={formatPercentChange(item.changePercent, messages.common.partial)}
                    freshnessLabel={formatFreshnessLabel(item.lastUpdatedAt, locale, messages.common.unavailable)}
                    actionAvailability={item.actionAvailability}
                    insightStance={item.insightStance}
                    sparkline={sparklineBySymbol[item.symbol] ?? []}
                    actions={(
                      <div className="market-row__action-grid">
                        <QuickTradeActions
                          detailHref={`/stocks/${item.symbol}`}
                          assetId={item.assetId}
                          symbol={item.symbol}
                          assetClass="stock"
                          isAuthenticated={Boolean(auth)}
                          strategyLaneId="manual_stock_lane"
                          showWatchlist
                          isWatched={isWatched}
                          watchlistLabelAdd={messages.dashboard.addToWatchlist}
                          watchlistLabelRemove={messages.dashboard.removeFromWatchlist}
                        />
                      </div>
                    )}
                  />
                )
              );
            })}
          </div>
        ) : (
          <Card className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">Investable stocks</div>
                <h3>No stock entries available</h3>
                <p>
                  The stock universe is currently empty or unavailable. Check back once market data
                  has been loaded.
                </p>
              </div>
            </div>
          </Card>
        )}
      </Section>

      <Section className="dashboard-section dashboard-section--tinted">
        <div className="analytics-two-grid">
          <Card className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">Bank connectivity</div>
                <h3>Bank and broker connections</h3>
                <p>
                  Connection surfaces for real-world brokerage remain intentionally disabled in this
                  simulation-first release.
                </p>
              </div>
              <span className="status-pill status-pill--info">Simulation-first</span>
            </div>
          </Card>
          <Card className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">Safety model</div>
                <h3>No live execution</h3>
                <p>All trade actions in this release are restricted to simulated paper trading.</p>
              </div>
            </div>
            <div className="analytics-card__body">
              <p>Real brokerage APIs are not connected.</p>
              <p>Simulation sessions can be started, resumed, reset, and audited without touching real capital.</p>
            </div>
          </Card>
        </div>
      </Section>
    </>
  );
}
