import { Card } from '../../../components/ui/card';
import { Section } from '../../../components/ui/section';
import { CompactStatCard } from '../../../components/stats/compact-stat-card';
import { getMessages } from '../../../lib/i18n/messages';
import { formatDateTimeLabel } from '../../../lib/formatters';
import { requireCurrentSession } from '../../../server/auth/session';
import { getRequestLocale } from '../../../server/i18n/locale';
import { formatUsdPrice } from '../../../server/lib/quote-display';
import { getSimulationOverviewDataForUser } from '../../../server/services/stock-simulation-service';

export default async function AccountActivityPage() {
  const auth = await requireCurrentSession('/account/activity');
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  const overview = await getSimulationOverviewDataForUser(auth.user.id).catch(() => null);

  if (!overview) {
    return (
      <Card>
        <div className="account-panel">
          <h2 className="account-panel__title">Trading activity</h2>
          <p className="account-panel__description">Simulation activity data is currently unavailable.</p>
        </div>
      </Card>
    );
  }

  const activeLane = overview.activityLanes.find((lane) => lane.status === 'active') ?? null;

  return (
    <div className="account-stack">
      <Card>
        <div className="account-panel">
          <div className="section__eyebrow">Aurox activity</div>
          <h2 className="account-panel__title">Manual and AI lane tracking</h2>
          <p className="account-panel__description">
            Monitor running simulation activity by lane. AI and broker-agent lanes remain planned until explicitly activated in simulation architecture.
          </p>
        </div>
      </Card>

      <Section className="dashboard-section">
        <div className="analytics-strip">
          <CompactStatCard label="Portfolio value" value={formatUsdPrice(overview.summary.portfolioValue, locale, messages.common.unavailable)} valueTone={overview.summary.portfolioValue > 0 ? 'positive' : overview.summary.portfolioValue < 0 ? 'negative' : 'neutral'} detail="Current market value of active simulation positions." />
          <CompactStatCard label="Available cash" value={formatUsdPrice(overview.summary.availableCash, locale, messages.common.unavailable)} detail="Cash available for new simulation orders." />
          <CompactStatCard label="Invested capital" value={formatUsdPrice(overview.summary.investedCapital, locale, messages.common.unavailable)} valueTone={overview.summary.investedCapital > 0 ? 'positive' : overview.summary.investedCapital < 0 ? 'negative' : 'neutral'} detail="Capital allocated into currently active positions." />
          <CompactStatCard label="Active investments" value={String(overview.summary.activeInvestmentCount)} detail="Open simulation positions currently running." />
          <CompactStatCard label="Recent orders" value={String(overview.recentOrders.length)} detail="Most recent order events in the simulation journal." />
          <CompactStatCard label="Active mode" value={activeLane?.label ?? 'Not configured'} detail="Primary active lane for manual simulation activity." />
        </div>
      </Section>

      <Card>
        <div className="account-panel">
          <div className="account-panel__header">
            <div>
              <div className="section__eyebrow">Lane status</div>
              <h3 className="account-panel__title">Broker and strategy lanes</h3>
            </div>
          </div>
          <div className="account-session-list">
            {overview.activityLanes.map((lane) => (
              <article key={lane.id} className="account-session-list__item">
                <div>
                  <strong>{lane.label}</strong>
                  <p>{lane.note}</p>
                </div>
                <div>
                  <span>Status</span>
                  <strong>{lane.status}</strong>
                </div>
                <div>
                  <span>Limit / Available</span>
                  <strong>
                    {formatUsdPrice(lane.capitalLimit, locale, messages.common.unavailable)} / {formatUsdPrice(lane.availableCapital, locale, messages.common.unavailable)}
                  </strong>
                </div>
              </article>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <div className="account-panel">
          <div className="account-panel__header">
            <div>
              <div className="section__eyebrow">Order journal</div>
              <h3 className="account-panel__title">Recent simulation orders</h3>
            </div>
          </div>
          <div className="account-session-list">
            {overview.recentOrders.length > 0 ? (
              overview.recentOrders.map((order) => (
                <article key={order.id} className="account-session-list__item">
                  <div>
                    <strong>{order.side.toUpperCase()} {order.symbol}</strong>
                    <p>{order.quantity.toFixed(4)} @ {formatUsdPrice(order.executedPrice, locale, messages.common.unavailable)}</p>
                  </div>
                  <div>
                    <span>Cash effect</span>
                    <strong>{formatUsdPrice(order.cashEffect, locale, messages.common.unavailable)}</strong>
                  </div>
                  <div>
                    <span>Created</span>
                    <strong>{formatDateTimeLabel(order.createdAt, locale)}</strong>
                  </div>
                </article>
              ))
            ) : (
              <article className="account-session-list__item">
                <div>
                  <strong>No orders yet</strong>
                  <p>Place a simulation order from invest or stocks surfaces to populate activity history.</p>
                </div>
              </article>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
