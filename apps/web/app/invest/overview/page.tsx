import Link from 'next/link';
import { buildAccountCapitalState } from '@repo/agents';
import { Section } from '../../../components/ui/section';
import { WorkstationPageHeader } from '../../../components/asset/workstation-page-header';
import { CompactStatCard } from '../../../components/stats/compact-stat-card';
import { Card } from '../../../components/ui/card';
import { AnalyticsTable } from '../../../components/tables/analytics-table';
import { getMessages } from '../../../lib/i18n/messages';
import type { Locale } from '@repo/api-contracts';
import { formatDateTimeLabel } from '../../../lib/formatters';
import { getRequestLocale } from '../../../server/i18n/locale';
import { formatUsdPrice } from '../../../server/lib/quote-display';
import { requireCurrentSession } from '../../../server/auth/session';
import { getSimulationWorkstationStateForCurrentUser } from '../../../server/services/simulation-workstation-service';
import { emergencyStopAction } from '../../../server/actions/broker-mode-actions';

export const dynamic = 'force-dynamic';

function formatPercent(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function formatSignedUsd(value: number, locale: Locale) {
  const formatted = formatUsdPrice(Math.abs(value), locale, '—');
  return value > 0 ? `+${formatted}` : value < 0 ? `-${formatted}` : formatted;
}

type OrderRow = {
  side: string;
  symbol: string;
  source: string;
  quantity: string;
  executedPrice: string;
  grossAmount: string;
  createdAt: string;
};

export default async function InvestmentOverviewPage() {
  const auth = await requireCurrentSession('/login');
  const locale = await getRequestLocale();
  const messages = getMessages(locale);

  const workstation = await getSimulationWorkstationStateForCurrentUser({ sessionId: null });
  const workspace = workstation.workspace;

  const capitalState = workspace
    ? buildAccountCapitalState(workspace.summary, workspace.orders)
    : null;

  const statusTone =
    workstation.workstationStatus === 'running'
      ? 'success'
      : workstation.workstationStatus === 'paused' || workstation.workstationStatus === 'degraded'
        ? 'warning'
        : workstation.workstationStatus === 'empty'
          ? 'info'
          : 'danger';

  const drawdownBreached = capitalState !== null && capitalState.currentDrawdownPercent >= 0.10;
  const dailyLossBreached = capitalState !== null && capitalState.dailyLossPercent >= 0.025;
  const safetyStatus = drawdownBreached || dailyLossBreached ? 'Circuit breached' : 'Normal';
  const safetyTone = drawdownBreached || dailyLossBreached ? 'danger' : 'success';

  const orderColumns: Array<{ key: keyof OrderRow; label: string; align?: 'right' }> = [
    { key: 'side', label: 'Side' },
    { key: 'symbol', label: 'Symbol' },
    { key: 'source', label: 'Source' },
    { key: 'quantity', label: 'Qty', align: 'right' },
    { key: 'executedPrice', label: 'Price', align: 'right' },
    { key: 'grossAmount', label: 'Gross', align: 'right' },
    { key: 'createdAt', label: 'Time', align: 'right' },
  ];

  return (
    <>
      <Section className="dashboard-section dashboard-section--hero">
        <WorkstationPageHeader
          eyebrow="Invest / Overview"
          title="Investment overview"
          description="Capital usage, circuit breaker state, open positions, and recent order activity across all broker modes."
          summary="This view reflects simulation activity only. No live broker execution is active."
          statusLabel={workstation.workstationStatus}
          statusTone={statusTone}
          meta={[
            {
              label: 'Safety status',
              value: safetyStatus,
            },
            {
              label: 'Active mode',
              value: workstation.session?.laneId ?? 'None',
            },
            {
              label: 'Signed in as',
              value: auth.user.email,
            },
          ]}
          actions={[
            { href: '/invest', label: 'Invest hub' },
            { href: '/invest/simulation', label: 'Simulation workstation' },
            { href: '/invest/broker-modes', label: 'Broker modes' },
          ]}
        />
      </Section>

      {capitalState !== null && workspace !== null && (
        <Section className="dashboard-section">
          <div className="analytics-strip">
            <CompactStatCard
              label="Cash balance"
              value={formatUsdPrice(capitalState.cashBalance, locale, '—')}
              detail="Total simulation cash before any reserve allocation."
            />
            <CompactStatCard
              label="Used capital today"
              value={formatUsdPrice(capitalState.usedCapitalToday, locale, '—')}
              detail="Gross buy notional executed today."
            />
            <CompactStatCard
              label="Orders today"
              value={String(capitalState.ordersExecutedToday)}
              detail="Filled orders placed within today's session date."
            />
            <CompactStatCard
              label="Open positions"
              value={String(capitalState.openPositionCount)}
              detail="Currently open simulation positions."
            />
            <CompactStatCard
              label="Daily loss"
              value={formatPercent(capitalState.dailyLossPercent)}
              detail="Realised loss today as a percentage of initial balance."
            />
            <CompactStatCard
              label="Drawdown"
              value={formatPercent(capitalState.currentDrawdownPercent)}
              detail="Equity decline from the initial starting balance."
            />
          </div>
        </Section>
      )}

      <Section className="dashboard-section">
        <div className="analytics-two-grid">
          <Card className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">Circuit breakers</div>
                <h3>Safety status</h3>
                <p>
                  Automatic limits that pause autonomous activity when daily loss, drawdown, or position counts breach configured thresholds.
                </p>
              </div>
              <span className={`status-pill status-pill--${safetyTone}`}>{safetyStatus}</span>
            </div>
            <div className="analytics-card__body">
              <ul>
                <li>
                  Daily loss circuit (2.5% limit):{' '}
                  <strong>
                    {capitalState !== null
                      ? dailyLossBreached
                        ? `Breached — ${formatPercent(capitalState.dailyLossPercent)}`
                        : `Clear — ${formatPercent(capitalState.dailyLossPercent)}`
                      : '—'}
                  </strong>
                </li>
                <li>
                  Drawdown circuit (10% limit):{' '}
                  <strong>
                    {capitalState !== null
                      ? drawdownBreached
                        ? `Breached — ${formatPercent(capitalState.currentDrawdownPercent)}`
                        : `Clear — ${formatPercent(capitalState.currentDrawdownPercent)}`
                      : '—'}
                  </strong>
                </li>
                <li>
                  Session state:{' '}
                  <strong>{workstation.workstationStatus}</strong>
                </li>
                <li>
                  Execution mode:{' '}
                  <strong>Simulation only — no live orders active</strong>
                </li>
              </ul>
            </div>
            <div className="analytics-card__action-grid">
              <Link href="/invest/broker-modes" className="button button--secondary">
                Review mode limits
              </Link>
            </div>
          </Card>

          <Card className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">Emergency stop</div>
                <h3>Pause and reset controls</h3>
                <p>
                  The emergency stop resets the simulation account and closes all open positions. This action cannot be undone.
                </p>
              </div>
              <span className="status-pill status-pill--warning">Simulation</span>
            </div>
            <div className="analytics-card__body">
              <p>Active session: {workstation.session?.id ?? 'None'}</p>
              <p>Active lane: {workstation.session?.laneId ?? 'None'}</p>
              <p>Open positions: {workspace?.summary.activeInvestmentCount ?? 0}</p>
              <p>Read-only mode: {workstation.isReadOnly ? 'Yes — trading is blocked' : 'No — trading is active'}</p>
            </div>
            <div className="analytics-card__action-grid">
              <form action={emergencyStopAction}>
                <button
                  type="submit"
                  className="button button--secondary"
                  aria-label="Emergency stop — resets simulation account and closes all positions"
                >
                  Emergency stop
                </button>
              </form>
              <Link href="/invest/simulation" className="button button--secondary">
                Open workstation
              </Link>
            </div>
          </Card>
        </div>
      </Section>

      {workspace !== null && (
        <>
          <Section className="dashboard-section dashboard-section--tinted">
            <div className="analytics-two-grid analytics-two-grid--tables">
              <AnalyticsTable
                title="Recent orders"
                subtitle="All filled simulation orders with intent source. Source indicates whether the order was placed manually, AI-suggested, or AI-autonomous."
                columns={orderColumns}
                rows={workspace.orders.slice(0, 20).map((order) => {
                  const notes = order.notes ?? '';
                  const source = notes.includes('ai_autonomous')
                    ? 'AI autonomous'
                    : notes.includes('ai_assisted') || notes.includes('ai_suggested')
                      ? 'AI suggested'
                      : 'Manual';
                  return {
                    side: order.side.toUpperCase(),
                    symbol: order.symbol,
                    source,
                    quantity: order.quantity.toFixed(4),
                    executedPrice: formatUsdPrice(order.executedPrice, locale, '—'),
                    grossAmount: formatSignedUsd(order.cashEffect, locale),
                    createdAt: formatDateTimeLabel(order.createdAt, locale),
                  };
                })}
                emptyMessage="No simulation orders yet. Start a session and place your first order."
                rowDetailsLabel={messages.table.rowDetails}
              />

              <Card className="analytics-card">
                <div className="analytics-card__header">
                  <div>
                    <div className="section__eyebrow">Asset exposure</div>
                    <h3>Open positions by asset class</h3>
                    <p>Breakdown of active simulation exposure across stocks, ETFs, and crypto.</p>
                  </div>
                </div>
                <div className="analytics-card__body">
                  {workstation.positionsByAssetClass.length > 0 ? (
                    workstation.positionsByAssetClass.map((entry) => (
                      <p key={entry.assetClass}>
                        <strong>{entry.assetClass.toUpperCase()}</strong>:{' '}
                        {entry.activeCount} position{entry.activeCount !== 1 ? 's' : ''},{' '}
                        {formatUsdPrice(entry.marketValue, locale, '—')} market value
                      </p>
                    ))
                  ) : (
                    <p>No active positions across any asset class.</p>
                  )}
                  <p style={{ marginTop: '1rem' }}>
                    Unrealized P&amp;L: {formatSignedUsd(workspace.summary.unrealizedPnl, locale)}
                  </p>
                  <p>
                    Realized P&amp;L: {formatSignedUsd(workspace.summary.realizedPnl, locale)}
                  </p>
                </div>
                <div className="analytics-card__action-grid">
                  <Link href="/invest/simulation" className="button button--secondary">
                    Full workstation
                  </Link>
                  <Link href="/invest/broker-modes" className="button button--secondary">
                    Mode limits
                  </Link>
                </div>
              </Card>
            </div>
          </Section>
        </>
      )}

      {workspace === null && (
        <Section className="dashboard-section">
          <Card className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">No active session</div>
                <h3>Start a simulation session to see live overview data</h3>
                <p>
                  Capital usage, circuit breaker state, and order history will appear here once a simulation session is running.
                </p>
              </div>
            </div>
            <div className="analytics-card__action-grid">
              <Link href="/invest/simulation" className="button button--primary">
                Open simulation workstation
              </Link>
              <Link href="/invest/broker-modes" className="button button--secondary">
                Browse broker modes
              </Link>
            </div>
          </Card>
        </Section>
      )}
    </>
  );
}
