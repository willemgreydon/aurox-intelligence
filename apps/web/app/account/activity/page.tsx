import Link from 'next/link';
import { Card } from '../../../components/ui/card';
import { Section } from '../../../components/ui/section';
import { CompactStatCard } from '../../../components/stats/compact-stat-card';
import { getMessages } from '../../../lib/i18n/messages';
import { formatDateTimeLabel } from '../../../lib/formatters';
import { requireCurrentSession } from '../../../server/auth/session';
import { getRequestLocale } from '../../../server/i18n/locale';
import { formatUsdPrice } from '../../../server/lib/quote-display';
import { getSimulationOverviewDataForUser } from '../../../server/services/stock-simulation-service';

// User-specific simulation activity — never cached at the route level.
export const dynamic = 'force-dynamic';

export default async function AccountActivityPage() {
  const auth = await requireCurrentSession('/account/activity');
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  const overview = await getSimulationOverviewDataForUser(auth.user.id).catch(() => null);

  if (!overview) {
    return (
      <div className="account-stack">
        <div className="account-page-header">
          <div className="account-page-header__eyebrow">Trading Activity</div>
          <h2 className="account-page-header__title">Simulation Activity</h2>
        </div>
        <Card>
          <div className="account-panel">
            <div className="aurox-empty-state">
              <div className="aurox-empty-state__icon" aria-hidden="true">◎</div>
              <p className="aurox-empty-state__title">Activity data unavailable</p>
              <p className="aurox-empty-state__body">
                Simulation activity data could not be loaded. The database may be temporarily unavailable.
              </p>
              <div className="aurox-empty-state__actions">
                <Link href="/invest/simulation" className="button button--primary">Open Simulation</Link>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const activeLane = overview.activityLanes.find((lane) => lane.status === 'active') ?? null;
  const totalOrders = overview.recentOrders.length;
  const buyOrders = overview.recentOrders.filter((o) => o.side === 'buy').length;
  const sellOrders = overview.recentOrders.filter((o) => o.side === 'sell').length;
  const activeLanes = overview.activityLanes.filter((l) => l.status === 'active').length;

  return (
    <div className="account-stack">
      {/* Page header */}
      <div className="account-page-header">
        <div className="account-page-header__eyebrow">Simulation Activity</div>
        <h2 className="account-page-header__title">Trading Activity &amp; Lane Status</h2>
        <p className="account-page-header__description">
          Monitor running simulation activity by lane. All execution remains simulation-only. AI and autonomous lanes are gated until explicitly activated.
        </p>
        <div className="account-page-header__meta">
          <span className="status-pill status-pill--info">Simulation</span>
          {activeLane ? (
            <span className="status-pill status-pill--success">Active: {activeLane.label}</span>
          ) : (
            <span className="status-pill status-pill--neutral">No active lane</span>
          )}
        </div>
      </div>

      {/* KPI strip */}
      <Section className="dashboard-section dashboard-section--compact">
        <div className="analytics-strip">
          <CompactStatCard
            label="Portfolio value"
            value={formatUsdPrice(overview.summary.portfolioValue, locale, messages.common.unavailable)}
            valueTone={overview.summary.portfolioValue > 0 ? 'positive' : overview.summary.portfolioValue < 0 ? 'negative' : 'neutral'}
            detail="Current market value of simulation positions."
          />
          <CompactStatCard
            label="Available cash"
            value={formatUsdPrice(overview.summary.availableCash, locale, messages.common.unavailable)}
            detail="Cash available for new simulation orders."
          />
          <CompactStatCard
            label="Invested capital"
            value={formatUsdPrice(overview.summary.investedCapital, locale, messages.common.unavailable)}
            valueTone={overview.summary.investedCapital > 0 ? 'positive' : overview.summary.investedCapital < 0 ? 'negative' : 'neutral'}
            detail="Capital allocated into active positions."
          />
          <CompactStatCard
            label="Active positions"
            value={String(overview.summary.activeInvestmentCount)}
            detail="Open simulation positions."
          />
          <CompactStatCard
            label="Recent orders"
            value={String(totalOrders)}
            detail="Orders in the simulation journal."
          />
          <CompactStatCard
            label="Active lanes"
            value={String(activeLanes)}
            detail="Strategy lanes currently running."
          />
        </div>
      </Section>

      {/* Order summary chips */}
      {totalOrders > 0 ? (
        <Section className="dashboard-section dashboard-section--compact">
          <div className="activity-order-summary">
            <span className="activity-order-summary__label">Order breakdown:</span>
            <span className="status-pill status-pill--success">{buyOrders} buys</span>
            <span className="status-pill status-pill--danger">{sellOrders} sells</span>
            <span className="status-pill status-pill--neutral">{totalOrders} total</span>
          </div>
        </Section>
      ) : null}

      {/* Lane status table */}
      <Card>
        <div className="account-panel">
          <div className="account-panel__header">
            <div>
              <div className="section__eyebrow">Lane status</div>
              <h3 className="account-panel__title">Broker and strategy lanes</h3>
              <p className="account-panel__description">
                Each lane represents a capital allocation boundary. All lanes operate in simulation mode.
              </p>
            </div>
            <Link href="/invest/simulation" className="button button--secondary">Open simulation</Link>
          </div>

          {/* Lane table */}
          <div className="activity-lane-table">
            <div className="activity-lane-table__header" role="row">
              <span>Lane</span>
              <span>Status</span>
              <span>Capital limit</span>
              <span>Available</span>
            </div>
            {overview.activityLanes.map((lane) => {
              const laneTone =
                lane.status === 'active' ? 'success' :
                lane.status === 'limited' ? 'warning' : 'neutral';
              return (
                <article key={lane.id} className="activity-lane-row">
                  <div className="activity-lane-row__identity">
                    <strong className="activity-lane-row__name">{lane.label}</strong>
                    <p className="activity-lane-row__note">{lane.note}</p>
                  </div>
                  <div className="activity-lane-row__status">
                    <span className={`status-pill status-pill--${laneTone}`}>{lane.status}</span>
                  </div>
                  <div className="activity-lane-row__capital">
                    <span className="activity-lane-row__capital-value">
                      {formatUsdPrice(lane.capitalLimit, locale, messages.common.unavailable)}
                    </span>
                  </div>
                  <div className="activity-lane-row__available">
                    <span className="activity-lane-row__capital-value">
                      {formatUsdPrice(lane.availableCapital, locale, messages.common.unavailable)}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Order journal */}
      <Card>
        <div className="account-panel">
          <div className="account-panel__header">
            <div>
              <div className="section__eyebrow">Order journal</div>
              <h3 className="account-panel__title">Recent simulation orders</h3>
              <p className="account-panel__description">
                Append-only audit log of executed simulation orders. All amounts are in USD.
              </p>
            </div>
            <Link href="/invest/simulation" className="button button--secondary">Open invest</Link>
          </div>

          {overview.recentOrders.length === 0 ? (
            <div className="aurox-empty-state">
              <div className="aurox-empty-state__icon" aria-hidden="true">◉</div>
              <p className="aurox-empty-state__title">No orders yet</p>
              <p className="aurox-empty-state__body">
                Place a simulation order from the invest or stocks surfaces to populate your order history.
              </p>
              <div className="aurox-empty-state__actions">
                <Link href="/invest" className="button button--primary">Go to Invest</Link>
              </div>
            </div>
          ) : (
            <>
              <div className="activity-order-table">
                <div className="activity-order-table__header" role="row">
                  <span>Side</span>
                  <span>Symbol</span>
                  <span>Qty</span>
                  <span>Price</span>
                  <span>Cash effect</span>
                  <span>Time</span>
                </div>
                {overview.recentOrders.map((order) => (
                  <article key={order.id} className="activity-order-row">
                    <div className="activity-order-row__side">
                      <span
                        className={`status-pill ${order.side === 'buy' ? 'status-pill--success' : 'status-pill--danger'}`}
                      >
                        {order.side.toUpperCase()}
                      </span>
                    </div>
                    <div className="activity-order-row__symbol">
                      <strong>{order.symbol}</strong>
                    </div>
                    <div className="activity-order-row__qty">
                      <span className="activity-order-row__number">{order.quantity.toFixed(4)}</span>
                    </div>
                    <div className="activity-order-row__price">
                      <span className="activity-order-row__number">
                        {formatUsdPrice(order.executedPrice, locale, messages.common.unavailable)}
                      </span>
                    </div>
                    <div className="activity-order-row__cash">
                      <span
                        className={`activity-order-row__number ${
                          order.cashEffect > 0 ? 'activity-order-row__number--positive' :
                          order.cashEffect < 0 ? 'activity-order-row__number--negative' : ''
                        }`}
                      >
                        {formatUsdPrice(order.cashEffect, locale, messages.common.unavailable)}
                      </span>
                    </div>
                    <div className="activity-order-row__time">
                      <time
                        dateTime={order.createdAt}
                        title={new Date(order.createdAt).toLocaleString('en-US')}
                      >
                        {formatDateTimeLabel(order.createdAt, locale)}
                      </time>
                    </div>
                  </article>
                ))}
              </div>
              <p className="account-panel__disclaimer">
                Simulation only. No real capital at risk. All orders recorded for auditability.
              </p>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
