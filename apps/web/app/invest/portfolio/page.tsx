import Link from 'next/link';
import type { Locale, PortfolioFilterState } from '@repo/api-contracts';
import { Section } from '../../../components/ui/section';
import { WorkstationPageHeader } from '../../../components/asset/workstation-page-header';
import { CompactStatCard } from '../../../components/stats/compact-stat-card';
import { Card } from '../../../components/ui/card';
import { AnalyticsTable } from '../../../components/tables/analytics-table';
import type { TableColumn } from '../../../lib/dashboard/analytics-fixtures';
import { formatDateTimeLabel } from '../../../lib/formatters';
import { getRequestLocale } from '../../../server/i18n/locale';
import { formatUsdPrice } from '../../../server/lib/quote-display';
import { requireCurrentSession } from '../../../server/auth/session';
import { getInvestPortfolioData } from '../../../server/services/portfolio-service';
import { MarketViewToggle } from '../../../components/invest/market-view-toggle';
import { InvestableAssetCard } from '../../../components/invest/investable-asset-card';
import { MarketAssetRow } from '../../../components/invest/market-asset-row';
import { QuickTradeActions } from '../../../components/invest/quick-trade-actions';

export const dynamic = 'force-dynamic';

type ClosedPositionRow = {
  symbol: string;
  assetClass: string;
  realizedPnl: string;
  closedAt: string;
};

type TradeRow = {
  side: string;
  symbol: string;
  assetClass: string;
  quantity: string;
  executedPrice: string;
  cashEffect: string;
  realizedPnl: string;
  source: string;
  executedAt: string;
};

function formatSignedUsd(value: number, locale: Locale): string {
  const formatted = formatUsdPrice(Math.abs(value), locale, '-');
  return value > 0 ? `+${formatted}` : value < 0 ? `-${formatted}` : formatted;
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '0.00%';
  return `${value.toFixed(2)}%`;
}

function getAssetDetailHref(symbol: string, assetClass: 'stock' | 'etf' | 'crypto') {
  if (assetClass === 'stock') {
    return `/stocks/${encodeURIComponent(symbol)}`;
  }

  return assetClass === 'etf'
    ? `/invest/etfs/${encodeURIComponent(symbol)}`
    : `/invest/crypto/${encodeURIComponent(symbol)}`;
}

function buildFilterHref(current: PortfolioFilterState, patch: Partial<PortfolioFilterState>) {
  const params = new URLSearchParams();
  const next = { ...current, ...patch };
  params.set('view', next.view);
  params.set('lane', next.lane);
  params.set('assetClass', next.assetClass);
  params.set('positionState', next.positionState);
  return `/invest/portfolio?${params.toString()}`;
}

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams?: Promise<{
    view?: string;
    lane?: string;
    assetClass?: string;
    positionState?: string;
  }>;
}) {
  await requireCurrentSession('/login');
  const locale = await getRequestLocale();
  const params = searchParams ? await searchParams : {};

  const portfolio = await getInvestPortfolioData({
    view: params?.view === 'list' ? 'list' : 'grid',
    lane: params?.lane === 'current' ? 'current' : 'all',
    assetClass:
      params?.assetClass === 'stock' || params?.assetClass === 'etf' || params?.assetClass === 'crypto'
        ? params.assetClass
        : 'all',
    positionState:
      params?.positionState === 'open' || params?.positionState === 'closed'
        ? params.positionState
        : 'all',
  });

  const summary = portfolio.summary;

  const closedColumns: Array<TableColumn<ClosedPositionRow>> = [
    { key: 'symbol', label: 'Symbol' },
    { key: 'assetClass', label: 'Class' },
    { key: 'realizedPnl', label: 'Realized P&L', align: 'right' },
    { key: 'closedAt', label: 'Closed at', align: 'right' },
  ];

  const tradeColumns: Array<TableColumn<TradeRow>> = [
    { key: 'side', label: 'Side' },
    { key: 'symbol', label: 'Symbol' },
    { key: 'assetClass', label: 'Class' },
    { key: 'quantity', label: 'Qty', align: 'right' },
    { key: 'executedPrice', label: 'Fill', align: 'right' },
    { key: 'cashEffect', label: 'Cash effect', align: 'right' },
    { key: 'realizedPnl', label: 'Realized', align: 'right' },
    { key: 'source', label: 'Source' },
    { key: 'executedAt', label: 'Time', align: 'right' },
  ];

  const statusTone =
    portfolio.status === 'nominal'
      ? 'success'
      : portfolio.status === 'attention'
        ? 'warning'
        : 'danger';

  const riskTone =
    portfolio.riskProfile?.level === 'low'
      ? 'success'
      : portfolio.riskProfile?.level === 'medium'
        ? 'warning'
        : portfolio.riskProfile?.level === 'high' || portfolio.riskProfile?.level === 'critical'
          ? 'danger'
          : 'info';

  return (
    <>
      <Section className="dashboard-section dashboard-section--hero">
        <WorkstationPageHeader
          eyebrow="Invest / Portfolio"
          title="Simulation portfolio"
          description="Open and closed positions with lane-aware filtering, compact execution views, and quick simulation actions."
          summary={summary
            ? `${summary.openPositionCount} open position${summary.openPositionCount !== 1 ? 's' : ''} · ${formatUsdPrice(summary.portfolioValue, locale, '-')} market value · ${formatSignedUsd(summary.unrealizedPnl, locale)} unrealized P&L`
            : portfolio.statusReason}
          statusLabel={portfolio.status}
          statusTone={statusTone}
          meta={[
            { label: 'Market value', value: summary ? formatUsdPrice(summary.portfolioValue, locale, '-') : '-' },
            { label: 'Cash balance', value: summary ? formatUsdPrice(summary.cashBalance, locale, '-') : '-' },
            { label: 'Buying power', value: summary ? formatUsdPrice(summary.buyingPower, locale, '-') : '-' },
          ]}
          actions={[
            { href: '/invest', label: 'Invest hub' },
            { href: '/invest/simulation', label: 'Simulation' },
            { href: '/invest/orders', label: 'Orders' },
            { href: '/invest/live-readiness', label: 'Live readiness' },
          ]}
        />
      </Section>

      <Section className="dashboard-section">
        <div className="analytics-strip">
          <CompactStatCard label="Equity" value={summary ? formatUsdPrice(summary.equityValue, locale, '-') : '-'} detail="Cash plus current market value of all open positions." />
          <CompactStatCard label="Available cash" value={summary ? formatUsdPrice(summary.availableCash, locale, '-') : '-'} detail="Cash available for new simulated orders." />
          <CompactStatCard label="Open positions" value={summary ? String(summary.openPositionCount) : '0'} detail="Open holdings matching current lane and asset filters." />
          <CompactStatCard label="Closed positions" value={summary ? String(summary.closedPositionCount) : '0'} detail="Fully exited holdings in the journal." />
          <CompactStatCard label="Unrealized P&L" value={summary ? formatSignedUsd(summary.unrealizedPnl, locale) : '-'} detail="Mark-to-market gain/loss on open holdings." />
          <CompactStatCard label="Realized P&L" value={summary ? formatSignedUsd(summary.realizedPnl, locale) : '-'} detail="Locked-in gain/loss from closed trades." />
        </div>
      </Section>

      {portfolio.riskProfile ? (
        <Section className="dashboard-section dashboard-section--tinted">
          <header className="dashboard-section-heading">
            <div>
              <div className="section__eyebrow">Risk intelligence</div>
              <h2 className="dashboard-section-heading__title">Portfolio risk profile</h2>
              <p className="dashboard-section-heading__description">
                Deterministic risk classification based on drawdown and concentration. Simulation-only — no live capital at risk.
              </p>
            </div>
            <span className={`status-pill status-pill--${riskTone}`}>
              {portfolio.riskProfile.level.charAt(0).toUpperCase() + portfolio.riskProfile.level.slice(1)}
            </span>
          </header>
          <div className="analytics-strip">
            <CompactStatCard
              label="Risk level"
              value={portfolio.riskProfile.level.toUpperCase()}
              detail="Composite risk classification: low / medium / high / critical."
            />
            <CompactStatCard
              label="Drawdown"
              value={`${(portfolio.riskProfile.drawdownPercent * 100).toFixed(2)}%`}
              detail="Current drawdown from initial simulation capital."
            />
            <CompactStatCard
              label="Top concentration"
              value={
                portfolio.riskProfile.topConcentrationSymbol
                  ? `${portfolio.riskProfile.topConcentrationSymbol} ${portfolio.riskProfile.topConcentrationPercent.toFixed(1)}%`
                  : '—'
              }
              detail="Largest single-asset share of open equity. Values above 25% indicate concentration risk."
            />
          </div>
          <Card className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">Risk explanation</div>
                <h3>Assessment</h3>
                <p>{portfolio.riskProfile.explanation}</p>
              </div>
            </div>
            <div className="analytics-card__body">
              <p>
                Risk level is calculated from drawdown relative to initial capital and single-asset
                concentration in open positions. This is a simulation-environment assessment only.
                No real capital is at risk.
              </p>
            </div>
          </Card>
        </Section>
      ) : null}

      <Section className="dashboard-section dashboard-section--tinted">
        <header className="dashboard-section-heading">
          <div>
            <div className="section__eyebrow">Filters</div>
            <h2 className="dashboard-section-heading__title">Portfolio workspace filters</h2>
            <p className="dashboard-section-heading__description">Filter by lane, asset class, and open/closed state without leaving the portfolio view.</p>
          </div>
          <MarketViewToggle
            basePath="/invest/portfolio"
            view={portfolio.filters.view}
            query={{
              lane: portfolio.filters.lane,
              assetClass: portfolio.filters.assetClass,
              positionState: portfolio.filters.positionState,
            }}
          />
        </header>
        <div className="market-row__action-grid">
          <Link href={buildFilterHref(portfolio.filters, { lane: 'all' })} className={`button ${portfolio.filters.lane === 'all' ? 'button--primary' : 'button--secondary'}`}>All lanes</Link>
          <Link href={buildFilterHref(portfolio.filters, { lane: 'current' })} className={`button ${portfolio.filters.lane === 'current' ? 'button--primary' : 'button--secondary'}`}>Current lane</Link>
          <Link href={buildFilterHref(portfolio.filters, { assetClass: 'all' })} className={`button ${portfolio.filters.assetClass === 'all' ? 'button--primary' : 'button--secondary'}`}>All assets</Link>
          <Link href={buildFilterHref(portfolio.filters, { assetClass: 'stock' })} className={`button ${portfolio.filters.assetClass === 'stock' ? 'button--primary' : 'button--secondary'}`}>Stocks</Link>
          <Link href={buildFilterHref(portfolio.filters, { assetClass: 'etf' })} className={`button ${portfolio.filters.assetClass === 'etf' ? 'button--primary' : 'button--secondary'}`}>ETFs</Link>
          <Link href={buildFilterHref(portfolio.filters, { assetClass: 'crypto' })} className={`button ${portfolio.filters.assetClass === 'crypto' ? 'button--primary' : 'button--secondary'}`}>Crypto</Link>
          <Link href={buildFilterHref(portfolio.filters, { positionState: 'all' })} className={`button ${portfolio.filters.positionState === 'all' ? 'button--primary' : 'button--secondary'}`}>All states</Link>
          <Link href={buildFilterHref(portfolio.filters, { positionState: 'open' })} className={`button ${portfolio.filters.positionState === 'open' ? 'button--primary' : 'button--secondary'}`}>Open only</Link>
          <Link href={buildFilterHref(portfolio.filters, { positionState: 'closed' })} className={`button ${portfolio.filters.positionState === 'closed' ? 'button--primary' : 'button--secondary'}`}>Closed only</Link>
        </div>
      </Section>

      {portfolio.filters.positionState !== 'closed' && portfolio.openPositions.length > 0 ? (
        <Section className="dashboard-section">
          <header className="dashboard-section-heading">
            <div>
              <div className="section__eyebrow">Open positions</div>
              <h2 className="dashboard-section-heading__title">Actionable open holdings</h2>
              <p className="dashboard-section-heading__description">Sparkline-aware position cards and rows with direct buy/sell/watchlist actions.</p>
            </div>
          </header>
          <div className={portfolio.filters.view === 'grid' ? 'analytics-two-grid' : 'market-list'}>
            {portfolio.openPositions.map((position) => (
              portfolio.filters.view === 'grid' ? (
                <InvestableAssetCard
                  key={position.id}
                  href={getAssetDetailHref(position.symbol, position.assetClass)}
                  title={position.name}
                  symbol={position.symbol}
                  categoryLabel={position.assetClass.toUpperCase()}
                  thesis={`Quantity ${position.quantity.toFixed(4)} · Allocation ${formatPercent(position.allocationPercent)}`}
                  priceLabel={position.marketPrice !== null ? formatUsdPrice(position.marketPrice, locale, '-') : '-'}
                  changeLabel={formatSignedUsd(position.unrealizedPnl, locale)}
                  freshnessLabel={`Cost basis ${formatUsdPrice(position.costBasis, locale, '-')}`}
                  actionAvailability="simulated"
                  insightStance={position.unrealizedPnl > 0 ? 'positive' : position.unrealizedPnl < 0 ? 'negative' : 'neutral'}
                  riskSummary={`Avg ${formatUsdPrice(position.averageCost, locale, '-')} · Market value ${formatUsdPrice(position.marketValue, locale, '-')}`}
                  sparkline={position.sparkline}
                  actions={(
                    <QuickTradeActions
                      detailHref={getAssetDetailHref(position.symbol, position.assetClass)}
                      assetId={position.assetId}
                      symbol={position.symbol}
                      assetClass={position.assetClass}
                      strategyLaneId={portfolio.laneId ?? 'manual_stock_lane'}
                      simulationSessionId={portfolio.sessionId ?? undefined}
                      isAuthenticated
                      showWatchlist
                      isWatched={position.isWatched}
                      watchlistLabelAdd="Add to watchlist"
                      watchlistLabelRemove="Remove watchlist"
                    />
                  )}
                />
              ) : (
                <MarketAssetRow
                  key={position.id}
                  symbol={position.symbol}
                  title={position.name}
                  category={position.assetClass.toUpperCase()}
                  thesis={`Qty ${position.quantity.toFixed(4)} · Avg ${formatUsdPrice(position.averageCost, locale, '-')} · Allocation ${formatPercent(position.allocationPercent)}`}
                  priceLabel={position.marketPrice !== null ? formatUsdPrice(position.marketPrice, locale, '-') : '-'}
                  changeLabel={formatSignedUsd(position.unrealizedPnl, locale)}
                  freshnessLabel={`Value ${formatUsdPrice(position.marketValue, locale, '-')}`}
                  actionAvailability="simulated"
                  insightStance={position.unrealizedPnl > 0 ? 'positive' : position.unrealizedPnl < 0 ? 'negative' : 'neutral'}
                  sparkline={position.sparkline}
                  actions={(
                    <div className="market-row__action-grid">
                      <QuickTradeActions
                        detailHref={getAssetDetailHref(position.symbol, position.assetClass)}
                        assetId={position.assetId}
                        symbol={position.symbol}
                        assetClass={position.assetClass}
                        strategyLaneId={portfolio.laneId ?? 'manual_stock_lane'}
                        simulationSessionId={portfolio.sessionId ?? undefined}
                        isAuthenticated
                        showWatchlist
                        isWatched={position.isWatched}
                        watchlistLabelAdd="Add to watchlist"
                        watchlistLabelRemove="Remove watchlist"
                      />
                    </div>
                  )}
                />
              )
            ))}
          </div>
        </Section>
      ) : null}

      {portfolio.filters.positionState !== 'open' ? (
        <Section className="dashboard-section">
          <AnalyticsTable
            title="Closed positions"
            subtitle="Fully exited positions with realized P&L contribution."
            columns={closedColumns}
            rows={portfolio.closedPositions.map((pos) => ({
              symbol: pos.symbol,
              assetClass: pos.assetClass,
              realizedPnl: formatSignedUsd(pos.realizedPnl, locale),
              closedAt: pos.closedAt ? formatDateTimeLabel(pos.closedAt, locale) : '-',
            }))}
            emptyMessage="No closed positions match the current filters."
            rowDetailsLabel="Details"
          />
        </Section>
      ) : null}

      <Section className="dashboard-section dashboard-section--tinted">
        <div className="analytics-two-grid analytics-two-grid--tables">
          <Card className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">Allocation by class</div>
                <h3>Asset class mix</h3>
                <p>Current open portfolio allocation split by asset class.</p>
              </div>
            </div>
            <div className="analytics-card__body">
              {portfolio.allocationByAssetClass.length > 0 ? portfolio.allocationByAssetClass.map((item) => (
                <p key={item.key}>{item.label}: {formatPercent(item.percent)} ({formatUsdPrice(item.value, locale, '-')})</p>
              )) : <p>-</p>}
            </div>
          </Card>

          <Card className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">Allocation by asset</div>
                <h3>Top symbols</h3>
                <p>Largest allocations by open market value.</p>
              </div>
            </div>
            <div className="analytics-card__body">
              {portfolio.allocationByAsset.length > 0 ? portfolio.allocationByAsset.map((item) => (
                <p key={item.key}>{item.label}: {formatPercent(item.percent)} ({formatUsdPrice(item.value, locale, '-')})</p>
              )) : <p>-</p>}
            </div>
          </Card>
        </div>
      </Section>

      <Section className="dashboard-section">
        <AnalyticsTable
          title="Recent trades"
          subtitle="Latest executed orders with side, source, and realized P&L context."
          columns={tradeColumns}
          rows={portfolio.recentTrades.map((trade) => ({
            side: trade.side.toUpperCase(),
            symbol: trade.symbol,
            assetClass: trade.assetClass,
            quantity: trade.quantity.toFixed(4),
            executedPrice: formatUsdPrice(trade.executedPrice, locale, '-'),
            cashEffect: formatSignedUsd(trade.cashEffect, locale),
            realizedPnl: formatSignedUsd(trade.realizedPnl, locale),
            source: trade.source,
            executedAt: formatDateTimeLabel(trade.executedAt, locale),
          }))}
          emptyMessage="No trades recorded yet."
          rowDetailsLabel="Details"
        />
      </Section>

      {portfolio.emptyStateMessage ? (
        <Section className="dashboard-section">
          <Card className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">Portfolio state</div>
                <h3>No positions available</h3>
                <p>{portfolio.emptyStateMessage}</p>
              </div>
            </div>
            <div className="analytics-card__action-grid">
              <Link href="/invest/simulation" className="button button--primary">
                Open simulation
              </Link>
              <Link href="/invest" className="button button--secondary">
                Invest workspace
              </Link>
            </div>
          </Card>
        </Section>
      ) : null}
    </>
  );
}
