import Link from 'next/link';
import { requireCurrentSession } from '../../server/auth/session';
import { getInvestPortfolioData } from '../../server/services/portfolio-service';
import { getRequestLocale } from '../../server/i18n/locale';
import { formatUsdPrice } from '../../server/lib/quote-display';
import { formatDateTimeLabel } from '../../lib/formatters';
import { Section } from '../../components/ui/section';
import { Card } from '../../components/ui/card';
import { CompactStatCard } from '../../components/stats/compact-stat-card';

export const dynamic = 'force-dynamic';

function formatSigned(value: number, locale: string) {
  const abs = formatUsdPrice(Math.abs(value), locale as never, '-');
  return value > 0 ? `+${abs}` : value < 0 ? `-${abs}` : abs;
}

export default async function PortfolioRoutePage() {
  await requireCurrentSession('/login');
  const locale = await getRequestLocale();
  const portfolio = await getInvestPortfolioData({
    view: 'list',
    positionState: 'all',
    assetClass: 'all',
    lane: 'all',
  });

  if (portfolio.status === 'degraded' && !portfolio.summary) {
    return (
      <Section className="dashboard-section">
        <Card className="analytics-card">
          <div className="analytics-card__header">
            <div>
              <div className="section__eyebrow">Portfolio</div>
              <h3>Portfolio data is currently unavailable</h3>
              <p>{portfolio.statusReason}</p>
            </div>
          </div>
          <div className="analytics-card__action-grid">
            <Link href="/invest/simulation" className="button button--primary">
              Open simulation workstation
            </Link>
            <Link href="/invest/portfolio" className="button button--secondary">
              Open full portfolio view
            </Link>
          </div>
        </Card>
      </Section>
    );
  }

  if (!portfolio.summary || (portfolio.openPositions.length === 0 && portfolio.closedPositions.length === 0)) {
    return (
      <Section className="dashboard-section">
        <Card className="analytics-card">
          <div className="analytics-card__header">
            <div>
              <div className="section__eyebrow">Portfolio</div>
              <h3>No simulated trades yet</h3>
              <p>{portfolio.emptyStateMessage ?? 'Start by placing your first simulated order.'}</p>
            </div>
          </div>
          <div className="analytics-card__action-grid">
            <Link href="/invest/simulation" className="button button--primary">
              Open simulation workstation
            </Link>
            <Link href="/invest" className="button button--secondary">
              Browse assets
            </Link>
          </div>
        </Card>
      </Section>
    );
  }

  return (
    <>
      <Section className="dashboard-section dashboard-section--hero">
        <header className="dashboard-section-heading">
          <div>
            <div className="section__eyebrow">Portfolio</div>
            <h2 className="dashboard-section-heading__title">Simulation portfolio overview</h2>
            <p className="dashboard-section-heading__description">
              Deterministic accounting, lane-safe simulation actions, and auditable PnL context.
            </p>
          </div>
          <span className={`status-pill status-pill--${portfolio.status === 'nominal' ? 'success' : 'warning'}`}>
            {portfolio.status}
          </span>
        </header>
      </Section>

      <Section className="dashboard-section">
        <div className="analytics-strip">
          <CompactStatCard label="Total equity" value={formatUsdPrice(portfolio.summary.equityValue, locale, '-')} detail="Cash plus open position market value." />
          <CompactStatCard label="Cash balance" value={formatUsdPrice(portfolio.summary.cashBalance, locale, '-')} detail="Current simulation cash balance." />
          <CompactStatCard label="Unrealized P/L" value={formatSigned(portfolio.summary.unrealizedPnl, locale)} detail="Open position mark-to-market P/L." />
          <CompactStatCard label="Realized P/L" value={formatSigned(portfolio.summary.realizedPnl, locale)} detail="Closed trade realized P/L." />
          <CompactStatCard label="Open positions" value={String(portfolio.summary.openPositionCount)} detail="Currently active simulated positions." />
          <CompactStatCard label="Closed positions" value={String(portfolio.summary.closedPositionCount)} detail="Fully exited positions." />
        </div>
      </Section>

      {portfolio.riskProfile ? (
        <Section className="dashboard-section dashboard-section--tinted">
          <Card className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">Risk summary</div>
                <h3>{portfolio.riskProfile.level.toUpperCase()} risk profile</h3>
                <p>{portfolio.riskProfile.explanation}</p>
              </div>
            </div>
            <div className="analytics-card__body">
              <p>Drawdown: {(portfolio.riskProfile.drawdownPercent * 100).toFixed(2)}%</p>
              <p>
                Top concentration: {portfolio.riskProfile.topConcentrationSymbol ?? '-'}{' '}
                {portfolio.riskProfile.topConcentrationPercent.toFixed(1)}%
              </p>
            </div>
          </Card>
        </Section>
      ) : null}

      <Section className="dashboard-section">
        <div className="analytics-two-grid">
          <Card className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">Exposure</div>
                <h3>By asset class</h3>
              </div>
            </div>
            <div className="analytics-card__body">
              {portfolio.allocationByAssetClass.length > 0 ? (
                portfolio.allocationByAssetClass.map((item) => (
                  <p key={item.key}>
                    {item.label}: {item.percent.toFixed(2)}% ({formatUsdPrice(item.value, locale, '-')})
                  </p>
                ))
              ) : (
                <p>-</p>
              )}
            </div>
          </Card>

          <Card className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">Recent orders</div>
                <h3>Latest execution journal</h3>
              </div>
            </div>
            <div className="analytics-card__body">
              {portfolio.recentTrades.length > 0 ? (
                portfolio.recentTrades.slice(0, 8).map((trade) => (
                  <p key={trade.orderId}>
                    {trade.side.toUpperCase()} {trade.symbol} {trade.quantity.toFixed(4)} @{' '}
                    {formatUsdPrice(trade.executedPrice, locale, '-')} | {formatDateTimeLabel(trade.executedAt, locale)}
                  </p>
                ))
              ) : (
                <p>No recent orders.</p>
              )}
            </div>
          </Card>
        </div>
      </Section>

      <Section className="dashboard-section">
        <div className="analytics-card__action-grid">
          <Link href="/invest/portfolio" className="button button--primary">Open full portfolio workstation</Link>
          <Link href="/invest/simulation" className="button button--secondary">Open simulation workstation</Link>
        </div>
      </Section>
    </>
  );
}
