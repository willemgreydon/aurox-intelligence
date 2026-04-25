import Link from 'next/link';
import { cache, Suspense } from 'react';
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
import { getMessages, type AppMessages } from '../../lib/i18n/messages';
import { getOptionalCurrentSession } from '../../server/auth/session';
import { getRequestLocale } from '../../server/i18n/locale';
import { formatFreshnessLabel, formatPercentChange, formatUsdPrice } from '../../server/lib/quote-display';
import { getInvestOverviewData } from '../../server/services/invest-service';
import { getSimulationOverviewDataForUser } from '../../server/services/stock-simulation-service';
import type { Locale } from '@repo/api-contracts';

export const dynamic = 'force-dynamic';

const INVEST_PRIMARY_QUOTE_LIMIT = 64;
const INVEST_DEFERRED_QUOTE_LIMIT = 96;
const INVEST_DEFERRED_HISTORY_LIMIT = 40;
const INVEST_PRIORITY_SYMBOLS = ['SPY', 'QQQ', 'VTI', 'TLT', 'BINANCE:BTCUSDT', 'BINANCE:ETHUSDT'];

function withDevTiming<T>(label: string, load: () => Promise<T>): Promise<T> {
  const dev = process.env.NODE_ENV === 'development';
  const start = dev ? performance.now() : 0;
  return load()
    .then((result) => {
      if (dev) {
        console.debug(`[invest-loader] ${label}: ${(performance.now() - start).toFixed(0)}ms`);
      }
      return result;
    })
    .catch((error) => {
      if (dev) {
        console.debug(`[invest-loader] ${label} failed after ${(performance.now() - start).toFixed(0)}ms`);
      }
      throw error;
    });
}

const getInvestCriticalData = cache((locale: Locale, messages: AppMessages) =>
  withDevTiming('critical-overview', () =>
    getInvestOverviewData(locale, messages, {
      quoteSymbolLimit: INVEST_PRIMARY_QUOTE_LIMIT,
      includeHistory: false,
      preferredSymbols: INVEST_PRIORITY_SYMBOLS,
      pageContext: 'invest-critical',
    })),
);

const getInvestDeferredData = cache((locale: Locale, messages: AppMessages) =>
  withDevTiming('deferred-overview', () =>
    getInvestOverviewData(locale, messages, {
      quoteSymbolLimit: INVEST_DEFERRED_QUOTE_LIMIT,
      includeHistory: true,
      historySymbolLimit: INVEST_DEFERRED_HISTORY_LIMIT,
      preferredSymbols: INVEST_PRIORITY_SYMBOLS,
      pageContext: 'invest-deferred',
    })),
);

// ── Simulation stats (stream independently) ──────────────────────────────────

async function SimulationStats({
  userId,
  locale,
  unavailableLabel,
}: {
  userId: string;
  locale: Locale;
  unavailableLabel: string;
}) {
  const overview = await getSimulationOverviewDataForUser(userId);
  const summary = overview.summary;
  return (
    <>
      <CompactStatCard
        label="Simulation equity"
        value={formatUsdPrice(summary.equityValue, locale, unavailableLabel)}
        detail="Current paper-portfolio equity across the active simulation workspace."
      />
      <CompactStatCard
        label="Available cash"
        value={formatUsdPrice(summary.availableCash, locale, unavailableLabel)}
        detail="Cash currently available for new simulated orders."
      />
      <CompactStatCard
        label="Open positions"
        value={String(summary.activeInvestmentCount)}
        detail="Currently active simulated investments."
      />
    </>
  );
}

function SimulationStatsPlaceholder({ unavailableLabel }: { unavailableLabel: string }) {
  return (
    <>
      <CompactStatCard label="Simulation equity" value={unavailableLabel} detail="Current paper-portfolio equity across the active simulation workspace." />
      <CompactStatCard label="Available cash" value={unavailableLabel} detail="Cash currently available for new simulated orders." />
      <CompactStatCard label="Open positions" value="0" detail="Currently active simulated investments." />
    </>
  );
}

// ── Streaming: Data health card ───────────────────────────────────────────────

async function InvestDataHealthSection({ criticalDataPromise }: { criticalDataPromise: Promise<Awaited<ReturnType<typeof getInvestCriticalData>>> }) {
  const invest = await criticalDataPromise;
  return (
    <Card className="analytics-card">
      <div className="analytics-card__header">
        <div>
          <div className="section__eyebrow">Data source</div>
          <h3>Market data freshness</h3>
          <p>
            {invest.dataHealth.providerError
              ? 'Provider returned an error — quote context is partial or cached.'
              : `Quote context loaded from ${invest.dataHealth.provider.toUpperCase()}.`}
          </p>
        </div>
        <span className={`status-pill status-pill--${invest.dataHealth.freshnessTone}`}>
          {invest.dataHealth.freshnessLabel}
        </span>
      </div>
      <div className="analytics-strip">
        <CompactStatCard
          label="Provider"
          value={invest.dataHealth.provider.toUpperCase()}
          detail="Active market data source for this request."
        />
        <CompactStatCard
          label="Last updated"
          value={invest.lastUpdatedLabel}
          detail="Most recent quote observation across all tracked assets."
        />
        <CompactStatCard
          label="Freshness"
          value={invest.dataHealth.freshnessLabel}
          detail="live = <20 min · delayed = <2 h · stale = <24 h"
        />
        <CompactStatCard
          label="Symbols loaded"
          value={`${invest.dataHealth.symbolsLoaded} / ${invest.dataHealth.symbolsTotal}`}
          detail="Assets with a live or cached price observation."
        />
      </div>
      {invest.dataHealth.providerError ? (
        <div className="analytics-card__body">
          <p>Provider error: {invest.dataHealth.providerError}</p>
        </div>
      ) : null}
    </Card>
  );
}

function InvestDataHealthSkeleton() {
  return (
    <Card className="analytics-card shimmer-block" style={{ minHeight: '11rem' }}>
      <div className="analytics-card__header">
        <div>
          <div className="section__eyebrow">Data source</div>
          <h3>Market data freshness</h3>
        </div>
      </div>
    </Card>
  );
}

// ── Streaming: Recommendations ────────────────────────────────────────────────

async function RecommendationsSection({
  viewMode,
  criticalDataPromise,
}: {
  viewMode: MarketViewMode;
  criticalDataPromise: Promise<Awaited<ReturnType<typeof getInvestCriticalData>>>;
}) {
  const invest = await criticalDataPromise;
  const recommendations = invest.recommendations;
  const sparklineBySymbol = invest.sparklineBySymbol;

  if (recommendations.length === 0) {
    return (
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
    );
  }

  return (
    <div className={viewMode === 'grid' ? 'analytics-two-grid' : 'market-list'}>
      {recommendations.map((item) =>
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
            insightStance={
              item.action === 'avoid' || item.action === 'trim'
                ? 'negative'
                : item.action === 'accumulate'
                  ? 'positive'
                  : 'neutral'
            }
            sparkline={sparklineBySymbol[item.symbol] ?? []}
            actions={
              <div className="market-row__action-grid">
                <Link href="/invest/simulation" className="button button--secondary">
                  Open simulation
                </Link>
                <Link href="/invest/overview" className="button button--secondary">
                  Review thesis
                </Link>
              </div>
            }
          />
        ),
      )}
    </div>
  );
}

function RecommendationsSkeleton({ viewMode }: { viewMode: MarketViewMode }) {
  return (
    <div className={viewMode === 'grid' ? 'analytics-two-grid' : 'market-list'}>
      <div className="analytics-card shimmer-block" style={{ minHeight: '14rem' }} />
      <div className="analytics-card shimmer-block" style={{ minHeight: '14rem' }} />
    </div>
  );
}

// ── Streaming: Market ranking ─────────────────────────────────────────────────

async function MarketRankingSection({
  deferredDataPromise,
}: {
  deferredDataPromise: Promise<Awaited<ReturnType<typeof getInvestDeferredData>>>;
}) {
  const invest = await deferredDataPromise;

  if (invest.rankedAssets.length === 0) {
    return (
      <Card className="analytics-card">
        <div className="analytics-card__header">
          <div>
            <div className="section__eyebrow">Intelligence</div>
            <h3>No ranking data available</h3>
            <p>Rankings will appear once market data has been loaded for tracked assets.</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="analytics-card">
      <RankedAssetsPanel items={invest.rankedAssets.slice(0, 25)} />
    </Card>
  );
}

function MarketRankingSkeleton() {
  return (
    <div className="analytics-card shimmer-block" style={{ minHeight: '20rem' }} />
  );
}

// ── Streaming: Stock universe ─────────────────────────────────────────────────

async function StockUniverseSection({
  locale,
  messages,
  viewMode,
  isAuthenticated,
  watchlist,
  deferredDataPromise,
}: {
  locale: Locale;
  messages: AppMessages;
  viewMode: MarketViewMode;
  isAuthenticated: boolean;
  watchlist: Array<{ assetId: string }>;
  deferredDataPromise: Promise<Awaited<ReturnType<typeof getInvestDeferredData>>>;
}) {
  const invest = await deferredDataPromise;
  const stockGroup = invest.groupedAssets.find((g) => g.assetClass === 'stock');
  const stocks = stockGroup?.items ?? [];
  const sparklineBySymbol = invest.sparklineBySymbol;

  if (stocks.length === 0) {
    return (
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
    );
  }

  return (
    <div className={viewMode === 'grid' ? 'analytics-two-grid' : 'market-list'}>
      {stocks.map((item) => {
        const isWatched = watchlist.some((w) => w.assetId === item.assetId);
        const decision = invest.decisionBySymbol[item.symbol];

        return viewMode === 'grid' ? (
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
            riskLabel={decision?.risk.label}
            sparkline={sparklineBySymbol[item.symbol] ?? []}
            signal={decision ? {
              score: decision.signal.score,
              label: decision.signal.label,
              confidence: decision.signal.confidence,
              explanation: decision.signal.explanation,
              indicators: decision.signal.contributingIndicators,
              visualState: decision.signal.visualState,
            } : undefined}
            actions={
              <QuickTradeActions
                detailHref={`/stocks/${item.symbol}`}
                assetId={item.assetId}
                symbol={item.symbol}
                assetClass="stock"
                isAuthenticated={isAuthenticated}
                strategyLaneId="manual_stock_lane"
                showWatchlist
                isWatched={isWatched}
                watchlistLabelAdd={messages.dashboard.addToWatchlist}
                watchlistLabelRemove={messages.dashboard.removeFromWatchlist}
              />
            }
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
            signal={decision ? {
              score: decision.signal.score,
              label: decision.signal.label,
              confidence: decision.signal.confidence,
              visualState: decision.signal.visualState,
              explanation: decision.signal.explanation,
            } : undefined}
            riskLabel={decision?.risk.label}
            actions={
              <div className="market-row__action-grid">
                <QuickTradeActions
                  detailHref={`/stocks/${item.symbol}`}
                  assetId={item.assetId}
                  symbol={item.symbol}
                  assetClass="stock"
                  isAuthenticated={isAuthenticated}
                  strategyLaneId="manual_stock_lane"
                  showWatchlist
                  isWatched={isWatched}
                  watchlistLabelAdd={messages.dashboard.addToWatchlist}
                  watchlistLabelRemove={messages.dashboard.removeFromWatchlist}
                />
              </div>
            }
          />
        );
      })}
    </div>
  );
}

function StockUniverseSkeleton({ viewMode }: { viewMode: MarketViewMode }) {
  return (
    <div className={viewMode === 'grid' ? 'analytics-two-grid' : 'market-list'}>
      <div className="analytics-card shimmer-block" style={{ minHeight: '18rem' }} />
      <div className="analytics-card shimmer-block" style={{ minHeight: '18rem' }} />
      <div className="analytics-card shimmer-block" style={{ minHeight: '18rem' }} />
      <div className="analytics-card shimmer-block" style={{ minHeight: '18rem' }} />
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function InvestPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string }>;
}) {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  const params = searchParams ? await searchParams : {};
  const viewMode: MarketViewMode = params?.view === 'list' ? 'list' : 'grid';

  // Auth is fast — await it so watchlist and auth-gated sections render immediately.
  const auth = await getOptionalCurrentSession();
  // Watchlist is awaited here so the hero meta and stat strip show the count without waiting
  // for market read models. Critical and deferred invest data are requested once and streamed
  // through Suspense boundaries below.
  const watchlist = auth ? await getUserWatchlist(auth.user.id) : [];
  const criticalDataPromise = getInvestCriticalData(locale, messages);
  const deferredDataPromise = getInvestDeferredData(locale, messages);

  return (
    <>
      {/* ── Shell (renders immediately) ───────────────────────────────────── */}
      <Section className="dashboard-section dashboard-section--hero">
        <WorkstationPageHeader
          eyebrow={messages.shell.nav.investHome}
          title="Investing and simulation"
          description="Research market ideas, save a watchlist, and manage paper-trading sessions in one place."
          summary={messages.common.simulationDisclosure}
          statusLabel="simulation"
          statusTone="info"
          meta={[
            { label: 'Watchlist', value: String(watchlist.length) },
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

      {/* ── Data freshness (streams in) ───────────────────────────────────── */}
      <Section className="dashboard-section">
        <Suspense fallback={<InvestDataHealthSkeleton />}>
          <InvestDataHealthSection criticalDataPromise={criticalDataPromise} />
        </Suspense>
      </Section>

      {/* ── Simulation stats strip (watchlist count immediate; sim stats stream) */}
      <Section className="dashboard-section">
        <div className="analytics-strip">
          <Suspense fallback={<SimulationStatsPlaceholder unavailableLabel={messages.common.unavailable} />}>
            {auth ? (
              <SimulationStats userId={auth.user.id} locale={locale} unavailableLabel={messages.common.unavailable} />
            ) : (
              <SimulationStatsPlaceholder unavailableLabel={messages.common.unavailable} />
            )}
          </Suspense>
          <CompactStatCard
            label="Saved watchlist"
            value={String(watchlist.length)}
            detail="Stocks you pinned for faster access."
          />
        </div>
      </Section>

      {/* ── Capabilities (renders immediately — static content) ───────────── */}
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
            description="Browse, research, and guarded simulation execution are supported for ETFs and crypto in the manual multi-asset lane with fictive cash only."
            statusLabel="Supported"
            statusTone="success"
          />
        </div>
      </Section>

      {/* ── Recommendations (streams in) ──────────────────────────────────── */}
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
        <Suspense fallback={<RecommendationsSkeleton viewMode={viewMode} />}>
          <RecommendationsSection viewMode={viewMode} criticalDataPromise={criticalDataPromise} />
        </Suspense>
      </Section>

      {/* ── Market ranking (streams in) ───────────────────────────────────── */}
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
        <Suspense fallback={<MarketRankingSkeleton />}>
          <MarketRankingSection deferredDataPromise={deferredDataPromise} />
        </Suspense>
      </Section>

      {/* ── Stock universe (streams in) ───────────────────────────────────── */}
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
        <Suspense fallback={<StockUniverseSkeleton viewMode={viewMode} />}>
          <StockUniverseSection
            locale={locale}
            messages={messages}
            viewMode={viewMode}
            isAuthenticated={Boolean(auth)}
            watchlist={watchlist}
            deferredDataPromise={deferredDataPromise}
          />
        </Suspense>
      </Section>

      {/* ── Bank/safety (renders immediately — static content) ────────────── */}
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
