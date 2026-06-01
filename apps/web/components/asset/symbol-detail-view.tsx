import Link from 'next/link';
import type { ReactNode } from 'react';
import type { CatalogAsset, PersistedMarketHistoryBar, PersistedMarketQuoteSnapshot } from '@repo/db';
import type { Locale } from '@repo/api-contracts';
import { DetailSlotCard } from './detail-slot-card';
import { WorkstationPageHeader } from './workstation-page-header';
import { CompactStatCard } from '../stats/compact-stat-card';
import { Section } from '../ui/section';
import { Card } from '../ui/card';
import { SignalSummary } from '../signals/signal-summary';
import { TradeRiskOverlay } from '../invest/trade-risk-overlay';
import { AssetPriceExplorer } from './asset-price-explorer';
import { SymbolDetailTabs, type SymbolDetailTab, type SymbolDetailTabId } from './symbol-detail-tabs';
import { formatDateTimeLabel } from '../../lib/formatters';
import { formatFreshnessLabel, formatPercentChange, formatUsdPrice, getQuoteTimestamp } from '../../server/lib/quote-display';
import type { getMessages } from '../../lib/i18n/messages';

type AppMessages = ReturnType<typeof getMessages>;

type DetailPosition = {
  quantity: number;
  averageCost: number;
  marketValue: number;
  unrealizedPnl: number;
} | null;

type DetailDecision = {
  signal: {
    score: number;
    label: Parameters<typeof SignalSummary>[0]['label'];
    visualState: Parameters<typeof SignalSummary>[0]['visualState'];
    confidence: number;
    explanation: string;
    contributingIndicators: string[];
  };
  risk: {
    label: 'Low' | 'Medium' | 'High' | 'Extreme';
    exposureImpactPercent: number;
    stopLossSuggestion: number;
    drawdownWarning: string | null;
    liquidityWarning: string | null;
    concentrationWarning: string | null;
  };
};

export type SymbolDetailNewsItem = {
  id: string;
  title: string;
  riskScore: number;
  opportunityScore: number;
  sentimentScore: number;
  eventTypes: string[];
};

export type SymbolDetailViewModel = {
  asset: CatalogAsset;
  quote: PersistedMarketQuoteSnapshot | null;
  history: PersistedMarketHistoryBar[];
  position: DetailPosition;
  isWatched: boolean;
  decision: DetailDecision;
  /** Asset class drives volatility scale, labels, and the 24/7 badge. */
  assetClass: 'stock' | 'etf' | 'crypto';
  locale: Locale;
  messages: AppMessages;
  activeTab: SymbolDetailTabId;
  /** Per-page chart empty-state message (differs between routes). */
  historyEmptyMessage: string;
  /** Navigation + routing. */
  basePath: string;
  backHref: string;
  backLabel: string;
  simulationHref: string;
  /** Header eyebrow/title differ slightly per route. */
  eyebrow: string;
  title: string;
  positionUnitLabel: string;
  /** Pre-rendered Buy/Sell/Watch action subtree (built per-page so session/lane
      gating stays page-specific and never leaks into the shared view). */
  actions: ReactNode;
  /** Optional news items (only the public /stocks route supplies these). */
  news?: SymbolDetailNewsItem[];
  /** Query params to preserve across tab navigation. */
  query?: Record<string, string | undefined>;
};

/**
 * Shared symbol-detail layout: hero summary + URL-param tabs + the single
 * active tab panel. Server Component — the tab bar is Link-based, so the
 * page server-renders only the active panel and never crosses the RSC boundary
 * with ReactNode panel props.
 *
 * Per-page differences (session/lane gating, news, empty-state copy) are passed
 * in via the view-model so this component stays route-agnostic and reusable for
 * stock / etf / crypto detail pages.
 */
export function SymbolDetailView(vm: SymbolDetailViewModel) {
  const { asset, quote, messages, locale } = vm;
  const quoteTimestamp = getQuoteTimestamp(quote);
  const hasQuotePrice = typeof quote?.price === 'number' && Number.isFinite(quote.price);

  const tabs: SymbolDetailTab[] = [
    { id: 'overview', label: messages.common.overview },
    { id: 'signals', label: messages.common.signals },
    { id: 'risk', label: messages.common.risk },
    { id: 'journal', label: messages.common.journal },
    { id: 'data', label: messages.common.data },
  ];

  const isOwned = Boolean(vm.position && vm.position.quantity > 0);

  return (
    <>
      <Section className="dashboard-section dashboard-section--hero">
        <WorkstationPageHeader
          eyebrow={vm.eyebrow}
          title={vm.title}
          description={asset.name}
          summary={messages.common.simulationDisclosure}
          statusLabel={hasQuotePrice ? messages.status.nominal : messages.status.attention}
          statusTone={hasQuotePrice ? 'success' : 'warning'}
          meta={[
            {
              label: messages.common.lastUpdated,
              value: quoteTimestamp ? formatDateTimeLabel(quoteTimestamp, locale) : messages.common.unavailable,
            },
            { label: messages.common.quote, value: formatUsdPrice(quote?.price ?? null, locale, messages.common.unavailable) },
            { label: messages.common.move, value: formatPercentChange(quote?.changePercent ?? null, messages.common.partial) },
          ]}
          actions={[
            { href: vm.backHref, label: vm.backLabel },
            { href: vm.simulationHref, label: messages.simulation.navLabel },
            { href: '/dashboard', label: messages.shell.nav.dashboard },
          ]}
        />
      </Section>

      {/* Identity badge row — asset class, market hours, freshness, ownership. */}
      <Section className="dashboard-section">
        <div className="asset-badge-row" aria-label="Asset context">
          <span className="asset-badge asset-badge--class">{vm.assetClass.toUpperCase()}</span>
          {vm.assetClass === 'crypto' ? (
            <span className="asset-badge asset-badge--accent">24/7 market</span>
          ) : (
            <span className="asset-badge asset-badge--muted">Market-hours pricing</span>
          )}
          <span className={`asset-badge ${hasQuotePrice ? 'asset-badge--ok' : 'asset-badge--warn'}`}>
            {formatFreshnessLabel(quoteTimestamp, locale, messages.common.unavailable, vm.assetClass)}
          </span>
          {isOwned ? <span className="asset-badge asset-badge--owned">Held in simulation</span> : null}
          <span className="asset-badge asset-badge--sim">Simulation only</span>
        </div>
      </Section>

      {/* Hero summary strip — quote / move / signal / risk / position at a glance. */}
      <Section className="dashboard-section">
        <div className="analytics-strip">
          <CompactStatCard
            label={messages.common.currentQuote}
            value={formatUsdPrice(quote?.price ?? null, locale, messages.common.unavailable)}
            detail="Latest cached or live quote available for this asset."
          />
          <CompactStatCard
            label={messages.common.dailyMove}
            value={formatPercentChange(quote?.changePercent ?? null, messages.common.partial)}
            detail="Current day-over-day move from the most recent quote."
          />
          <CompactStatCard
            label="Signal"
            value={`${vm.decision.signal.label} (${vm.decision.signal.score.toFixed(2)})`}
            detail={`Confidence ${(vm.decision.signal.confidence * 100).toFixed(0)}%`}
          />
          <CompactStatCard
            label="Risk"
            value={vm.decision.risk.label}
            detail={`Exposure impact ${vm.decision.risk.exposureImpactPercent.toFixed(2)}%`}
          />
          <CompactStatCard
            label="Position"
            value={vm.position ? `${vm.position.quantity.toFixed(4)} ${vm.positionUnitLabel}` : 'No holding'}
            detail="Current holding context for the signed-in simulation account."
          />
        </div>
      </Section>

      {/* Primary simulation action block — always visible (the core decision). */}
      <Section className="dashboard-section dashboard-section--tinted">
        <Card className="analytics-card" tone="accent">
          <div className="analytics-card__header">
            <div>
              <div className="section__eyebrow">Simulation actions</div>
              <h3>Buy, sell, and watch</h3>
              <p>{messages.common.simulationDisclosure}</p>
            </div>
          </div>
          <div className="analytics-card__action-grid">{vm.actions}</div>
        </Card>
      </Section>

      <Section className="dashboard-section">
        <SymbolDetailTabs
          basePath={vm.basePath}
          activeTab={vm.activeTab}
          tabs={tabs}
          query={vm.query}
          ariaLabel={`${asset.symbol} detail views`}
        />
        <div className="detail-tab-panel" role="tabpanel" aria-label={tabs.find((t) => t.id === vm.activeTab)?.label}>
          {vm.activeTab === 'overview' ? <OverviewPanel vm={vm} quoteTimestamp={quoteTimestamp} /> : null}
          {vm.activeTab === 'signals' ? <SignalsPanel vm={vm} /> : null}
          {vm.activeTab === 'risk' ? <RiskPanel vm={vm} /> : null}
          {vm.activeTab === 'journal' ? <JournalPanel vm={vm} /> : null}
          {vm.activeTab === 'data' ? <DataPanel vm={vm} quoteTimestamp={quoteTimestamp} /> : null}
        </div>
      </Section>
    </>
  );
}

function OverviewPanel({ vm, quoteTimestamp }: { vm: SymbolDetailViewModel; quoteTimestamp: string | null }) {
  const { messages, locale, quote } = vm;
  const bars = vm.history.map((point) => ({
    timestamp: point.timestamp,
    open: point.open,
    high: point.high,
    low: point.low,
    close: point.close,
    volume: point.volume,
  }));

  return (
    <div className="overview-panel">
      <Card className="analytics-card">
        <div className="analytics-card__header">
          <div>
            <div className="section__eyebrow">Price explorer</div>
            <h3>Interactive range &amp; pulse</h3>
            <p>Slice the cached daily history by range. Metrics are computed from real OHLCV — nothing fabricated.</p>
          </div>
          <div className="side-metrics side-metrics--inline">
            <div className="side-metrics__item">
              <span>Source</span>
              <strong>{quote?.source ?? messages.common.unavailable}</strong>
            </div>
            <div className="side-metrics__item">
              <span>Bars</span>
              <strong>{String(vm.history.length)}</strong>
            </div>
            <div className="side-metrics__item">
              <span>Freshness</span>
              <strong>{formatFreshnessLabel(quoteTimestamp, locale, messages.common.unavailable, vm.assetClass)}</strong>
            </div>
          </div>
        </div>
        <div className="analytics-card__body">
          <AssetPriceExplorer
            bars={bars}
            referencePrice={quote?.price ?? null}
            assetClass={vm.assetClass}
            unavailableLabel={messages.common.unavailable}
            emptyMessage={vm.historyEmptyMessage}
          />
        </div>
      </Card>
    </div>
  );
}

function SignalsPanel({ vm }: { vm: SymbolDetailViewModel }) {
  const { asset, decision } = vm;
  return (
    <Card className="analytics-card">
      <div className="analytics-card__header">
        <div>
          <div className="section__eyebrow">Signals</div>
          <h3>Signal interpretation</h3>
          <p>{asset.thesis}</p>
        </div>
      </div>
      <div className="analytics-card__body">
        <p>{asset.riskSummary}</p>
        <SignalSummary
          score={decision.signal.score}
          label={decision.signal.label}
          confidence={decision.signal.confidence}
          explanation={decision.signal.explanation}
          indicators={decision.signal.contributingIndicators}
          visualState={decision.signal.visualState}
        />
      </div>
    </Card>
  );
}

function RiskPanel({ vm }: { vm: SymbolDetailViewModel }) {
  const { decision, position } = vm;
  return (
    <TradeRiskOverlay
      maxPositionSizeSuggestion={Math.max(position?.marketValue ?? 0, 5000)}
      estimatedVolatility={Math.max(0.001, decision.risk.exposureImpactPercent / 100)}
      drawdownWarning={decision.risk.drawdownWarning}
      liquidityWarning={decision.risk.liquidityWarning}
      stopLossSuggestion={decision.risk.stopLossSuggestion}
      exposureImpactPercent={decision.risk.exposureImpactPercent}
      concentrationWarning={decision.risk.concentrationWarning}
      riskLevel={decision.risk.label}
    />
  );
}

function JournalPanel({ vm }: { vm: SymbolDetailViewModel }) {
  const { messages, locale, position, isWatched } = vm;
  return (
    <div className="analytics-two-grid">
      <Card className="analytics-card">
        <div className="analytics-card__header">
          <div>
            <div className="section__eyebrow">Holding context</div>
            <h3>Portfolio impact</h3>
            <p>Signed-in users see live-marked holding context directly on the detail page.</p>
          </div>
        </div>
        <div className="analytics-card__body">
          <p>Market value: {formatUsdPrice(position?.marketValue ?? null, locale, messages.common.unavailable)}</p>
          <p>
            Unrealized P&amp;L:{' '}
            {position ? formatUsdPrice(position.unrealizedPnl, locale, messages.common.unavailable) : messages.common.none}
          </p>
          <p>Average cost: {position ? `$${position.averageCost.toFixed(4)}` : messages.common.none}</p>
          <p>Watchlist: {isWatched ? 'Saved' : 'Not saved'}</p>
        </div>
      </Card>
      {vm.news && vm.news.length > 0 ? (
        <Card className="analytics-card">
          <div className="analytics-card__header">
            <div>
              <div className="section__eyebrow">News Intelligence</div>
              <h3>Snapshot-driven news context</h3>
              <p>Deterministic event extraction and risk/opportunity scoring from recent headlines.</p>
            </div>
          </div>
          <div className="analytics-card__body">
            {vm.news.slice(0, 3).map((snapshot) => (
              <article key={snapshot.id} className="symbol-detail-news__item">
                <p><strong>{snapshot.title}</strong></p>
                <p>
                  Risk {snapshot.riskScore.toFixed(0)} / Opportunity {snapshot.opportunityScore.toFixed(0)} / Sentiment{' '}
                  {snapshot.sentimentScore.toFixed(2)}
                </p>
                <p>{snapshot.eventTypes.length > 0 ? `Events: ${snapshot.eventTypes.join(', ')}` : 'No major event type detected.'}</p>
              </article>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="analytics-card">
          <div className="analytics-card__header">
            <div>
              <div className="section__eyebrow">Next steps</div>
              <h3>Continue the workflow</h3>
              <p>Compare names in lane view, then place simulation orders with lane safety gates.</p>
            </div>
          </div>
          <div className="analytics-card__action-grid">
            <Link href={vm.backHref} className="button button--secondary">{vm.backLabel}</Link>
            <Link href={vm.simulationHref} className="button button--secondary">Open paper portfolio</Link>
          </div>
        </Card>
      )}
    </div>
  );
}

function DataPanel({ vm, quoteTimestamp }: { vm: SymbolDetailViewModel; quoteTimestamp: string | null }) {
  const { asset, quote, messages, locale, isWatched } = vm;
  return (
    <div className="analytics-two-grid">
      <DetailSlotCard
        eyebrow="Profile"
        title="Sector & quote context"
        description="Quote, history, and simulation safety controls in one auditable place."
        items={[
          `Sector: ${asset.sector ?? messages.common.unavailable}`,
          `Category: ${asset.category ?? messages.common.unavailable}`,
          `Geography: ${asset.geography ?? messages.common.unavailable}`,
          `Quote source: ${quote?.source ?? messages.common.unavailable}`,
          `Watchlist: ${isWatched ? 'Saved' : 'Not saved'}`,
        ]}
      />
      <Card className="analytics-card">
        <div className="analytics-card__header">
          <div>
            <div className="section__eyebrow">Data provenance</div>
            <h3>Freshness & source</h3>
            <p>Where this asset&apos;s market data came from and how fresh it is.</p>
          </div>
        </div>
        <div className="analytics-card__body">
          <p>Source: {quote?.source ?? messages.common.unavailable}</p>
          <p>Bars: {String(vm.history.length)}</p>
          <p>Freshness: {formatFreshnessLabel(quoteTimestamp, locale, messages.common.unavailable)}</p>
          <p>Last updated: {quoteTimestamp ? formatDateTimeLabel(quoteTimestamp, locale) : messages.common.unavailable}</p>
        </div>
      </Card>
    </div>
  );
}
