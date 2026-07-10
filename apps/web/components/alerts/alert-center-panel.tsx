'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition, useState } from 'react';
import type { CSSProperties } from 'react';
import type { AlertCenterViewModel } from '../../server/services/alert-center-service';

type Props = {
  model: AlertCenterViewModel;
};

type AlertGroup = keyof AlertCenterViewModel['grouped'];

const SEVERITY_META: Record<AlertGroup, { tone: string; icon: string; label: string }> = {
  CRITICAL: { tone: 'danger',  icon: '⚑', label: 'Critical' },
  WARNING:  { tone: 'warning', icon: '▲', label: 'Warning' },
  WATCH:    { tone: 'info',    icon: '◎', label: 'Watch' },
  INFO:     { tone: 'success', icon: '●', label: 'Info' },
};

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function AlertCenterPanel({ model }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  // Per-alert action state. Actions are intentionally NOT gated on the filter
  // transition's `isPending` — otherwise navigating a filter would disable every
  // Resolve/Dismiss/Snooze/Pin button across the board.
  const [pendingAlertId, setPendingAlertId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{ id: string; message: string } | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<AlertGroup, boolean>>({
    CRITICAL: true,
    WARNING:  true,
    WATCH:    false,
    INFO:     false,
  });

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'all' || value.trim() === '') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    startTransition(() => router.push(`/alerts?${params.toString()}`));
  }

  async function setAlertState(id: string, action: 'read' | 'pin' | 'snooze' | 'dismiss' | 'resolve') {
    setPendingAlertId(id);
    setActionError(null);
    try {
      const response = await fetch(`/api/alerts/${id}/state`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) {
        // Surface the failure instead of silently doing nothing (which reads as
        // "the button doesn't work"). 401 → session expired; 5xx → persistence.
        throw new Error(
          response.status === 401
            ? 'Your session expired — please sign in again.'
            : `Request failed (${response.status}).`,
        );
      }
      router.refresh();
    } catch (error) {
      setActionError({
        id,
        message: `Could not ${action} this alert. ${
          error instanceof Error ? error.message : 'Please retry.'
        }`,
      });
    } finally {
      setPendingAlertId(null);
    }
  }

  function toggleGroup(group: AlertGroup) {
    setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  }

  const groups: AlertGroup[] = ['CRITICAL', 'WARNING', 'WATCH', 'INFO'];
  const totalAlerts = groups.reduce((sum, g) => sum + model.grouped[g].length, 0);
  const providerAlerts = groups.reduce(
    (sum, g) => sum + model.grouped[g].filter((a) => a.source === 'provider').length,
    0,
  );

  // AUR-068: count-proportional severity weight. Each severity card's bar reflects its
  // share of all alerts so magnitude is visible, not just color-coded.
  const severityDenominator = Math.max(1, totalAlerts);
  const proportion = (count: number): CSSProperties =>
    ({ '--proportion': `${Math.round((count / severityDenominator) * 100)}%` } as CSSProperties);

  return (
    <>
      {/* KPI rail */}
      <section className="dashboard-section dashboard-section--compact">
        <div className="shell-container">
          <div className="alert-kpi-rail">
            <article className="alert-kpi-card alert-kpi-card--open">
              <span className="alert-kpi-card__icon" aria-hidden="true">☰</span>
              <div>
                <div className="alert-kpi-card__value">{model.summary.open}</div>
                <div className="alert-kpi-card__label">Open</div>
              </div>
            </article>
            <article
              className="alert-kpi-card alert-kpi-card--critical"
              data-active={model.summary.critical > 0 ? 'true' : undefined}
            >
              <span className="alert-kpi-card__icon" aria-hidden="true">⚑</span>
              <div>
                <div className="alert-kpi-card__value">{model.summary.critical}</div>
                <div className="alert-kpi-card__label">Critical</div>
              </div>
              <span className="alert-kpi-card__bar" style={proportion(model.summary.critical)} aria-hidden="true" />
            </article>
            <article className="alert-kpi-card alert-kpi-card--warning">
              <span className="alert-kpi-card__icon" aria-hidden="true">▲</span>
              <div>
                <div className="alert-kpi-card__value">{model.summary.warning}</div>
                <div className="alert-kpi-card__label">Warning</div>
              </div>
              <span className="alert-kpi-card__bar" style={proportion(model.summary.warning)} aria-hidden="true" />
            </article>
            <article className="alert-kpi-card alert-kpi-card--watch">
              <span className="alert-kpi-card__icon" aria-hidden="true">◎</span>
              <div>
                <div className="alert-kpi-card__value">{model.grouped.WATCH.length}</div>
                <div className="alert-kpi-card__label">Watch</div>
              </div>
              <span className="alert-kpi-card__bar" style={proportion(model.grouped.WATCH.length)} aria-hidden="true" />
            </article>
            <article className="alert-kpi-card alert-kpi-card--info">
              <span className="alert-kpi-card__icon" aria-hidden="true">◑</span>
              <div>
                <div className="alert-kpi-card__value">{model.grouped.INFO.length}</div>
                <div className="alert-kpi-card__label">Info</div>
              </div>
              <span className="alert-kpi-card__bar" style={proportion(model.grouped.INFO.length)} aria-hidden="true" />
            </article>
            <article className="alert-kpi-card alert-kpi-card--snoozed">
              <span className="alert-kpi-card__icon" aria-hidden="true">⏱</span>
              <div>
                <div className="alert-kpi-card__value">{model.summary.snoozed}</div>
                <div className="alert-kpi-card__label">Snoozed</div>
              </div>
            </article>
            <article className="alert-kpi-card alert-kpi-card--provider">
              <span className="alert-kpi-card__icon" aria-hidden="true">⚡</span>
              <div>
                <div className="alert-kpi-card__value">{providerAlerts}</div>
                <div className="alert-kpi-card__label">Provider</div>
              </div>
            </article>
            <article className="alert-kpi-card alert-kpi-card--resolved">
              <span className="alert-kpi-card__icon" aria-hidden="true">✓</span>
              <div>
                <div className="alert-kpi-card__value">{model.summary.resolvedToday}</div>
                <div className="alert-kpi-card__label">Resolved today</div>
              </div>
            </article>
          </div>

          {model.persistenceDegraded ? (
            <div className="alert-degraded-banner" role="alert">
              <span aria-hidden="true">⚠</span>
              Alert persistence degraded. Showing runtime fallback data. Actions will not persist.
            </div>
          ) : null}
        </div>
      </section>

      {/* Command bar */}
      <section className="dashboard-section dashboard-section--compact">
        <div className="shell-container">
          <div className="alert-command-bar">
            <div className="alert-command-bar__filters">
              <select
                className="alert-command-bar__select"
                value={model.filters.severity}
                onChange={(e) => setFilter('severity', e.target.value)}
                aria-label="Filter by severity"
              >
                <option value="all">All severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="WARNING">Warning</option>
                <option value="WATCH">Watch</option>
                <option value="INFO">Info</option>
              </select>
              <select
                className="alert-command-bar__select"
                value={model.filters.category}
                onChange={(e) => setFilter('category', e.target.value)}
                aria-label="Filter by category"
              >
                <option value="all">All categories</option>
                <option value="market">Market</option>
                <option value="signal">Signal</option>
                <option value="anomaly">Anomaly</option>
                <option value="provider">Provider</option>
                <option value="liquidity">Liquidity</option>
                <option value="volatility">Volatility</option>
                <option value="portfolio">Portfolio</option>
                <option value="simulation">Simulation</option>
                <option value="cross_asset">Cross-asset</option>
              </select>
              <select
                className="alert-command-bar__select"
                value={model.filters.assetClass}
                onChange={(e) => setFilter('assetClass', e.target.value)}
                aria-label="Filter by asset class"
              >
                <option value="all">All asset classes</option>
                <option value="stock">Stocks</option>
                <option value="etf">ETFs</option>
                <option value="crypto">Crypto</option>
                <option value="other">Other</option>
              </select>
              <select
                className="alert-command-bar__select"
                value={model.filters.source}
                onChange={(e) => setFilter('source', e.target.value)}
                aria-label="Filter by source"
              >
                <option value="all">All sources</option>
                <option value="signal">Signal</option>
                <option value="news">News</option>
                <option value="risk">Risk</option>
                <option value="provider">Provider</option>
                <option value="portfolio">Portfolio</option>
                <option value="anomaly">Anomaly</option>
                <option value="broker">Broker</option>
                <option value="simulation">Simulation</option>
                <option value="regime">Regime</option>
                <option value="relationship">Relationship</option>
              </select>
              <select
                className="alert-command-bar__select"
                value={model.filters.status}
                onChange={(e) => setFilter('status', e.target.value)}
                aria-label="Filter by status"
              >
                <option value="all">All statuses</option>
                <option value="OPEN">Open</option>
                <option value="READ">Read</option>
                <option value="PINNED">Pinned</option>
                <option value="SNOOZED">Snoozed</option>
                <option value="DISMISSED">Dismissed</option>
                <option value="RESOLVED">Resolved</option>
              </select>
              <input
                className="alert-command-bar__search"
                defaultValue={model.filters.search}
                placeholder="Search symbol or title…"
                onBlur={(e) => setFilter('search', e.target.value)}
                aria-label="Search alerts"
              />
            </div>
            <div className="alert-command-bar__actions">
              <button
                type="button"
                className="button button--secondary"
                onClick={() => startTransition(() => router.push('/alerts'))}
                disabled={isPending}
              >
                Clear filters
              </button>
              <Link href="/observe" className="button button--secondary">Observer</Link>
              <Link href="/signals" className="button button--secondary">Signals</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Empty state */}
      {totalAlerts === 0 ? (
        <section className="dashboard-section">
          <div className="shell-container">
            <div className="aurox-empty-state">
              <div className="aurox-empty-state__icon" aria-hidden="true">◎</div>
              <p className="aurox-empty-state__title">No alerts match your current filters</p>
              <p className="aurox-empty-state__body">
                Try broadening your filters or check the Observer for broader context.
              </p>
              <div className="aurox-empty-state__actions">
                <button
                  type="button"
                  className="button button--primary"
                  onClick={() => startTransition(() => router.push('/alerts'))}
                >
                  Clear all filters
                </button>
                <Link href="/observe" className="button button--secondary">Open Observer</Link>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Alert groups */}
      {groups.map((group) => {
        const alerts = model.grouped[group];
        const meta = SEVERITY_META[group];
        const isExpanded = expandedGroups[group];

        return (
          <section key={group} className="dashboard-section dashboard-section--compact">
            <div className="shell-container">
              <div className={`alert-group alert-group--${meta.tone}`}>
                <button
                  type="button"
                  className="alert-group__header"
                  onClick={() => toggleGroup(group)}
                  aria-expanded={isExpanded}
                >
                  <div className="alert-group__header-left">
                    <span className={`alert-group__severity-dot alert-group__severity-dot--${meta.tone}`} aria-hidden="true">{meta.icon}</span>
                    <span className="alert-group__title">{meta.label}</span>
                    <span className={`alert-group__count status-pill status-pill--${meta.tone}`}>{alerts.length}</span>
                  </div>
                  <span className="alert-group__chevron" aria-hidden="true">
                    {isExpanded ? '▲' : '▼'}
                  </span>
                </button>

                {isExpanded ? (
                  <div className="alert-group__body">
                    {alerts.length === 0 ? (
                      <p className="alert-group__empty">No {meta.label.toLowerCase()} alerts.</p>
                    ) : (
                      <div className="alert-feed">
                        {alerts.map((alert) => {
                          const runtimeOnly = alert.id.startsWith('runtime-');
                          const actionPending = pendingAlertId === alert.id;
                          const actionDisabled = runtimeOnly || actionPending;
                          const isPinned = alert.status === 'PINNED';
                          const isSnoozed = alert.status === 'SNOOZED';
                          return (
                            <article
                              key={alert.id}
                              className={`alert-card alert-card--${meta.tone}${isPinned ? ' alert-card--pinned' : ''}${isSnoozed ? ' alert-card--snoozed' : ''}`}
                            >
                              <div className="alert-card__header">
                                <div className="alert-card__title-row">
                                  <span className={`alert-card__severity-marker alert-card__severity-marker--${meta.tone}`} aria-hidden="true" />
                                  <strong className="alert-card__title">{alert.title}</strong>
                                  {isPinned ? <span className="alert-card__badge" aria-label="Pinned">📌</span> : null}
                                  {isSnoozed ? <span className="alert-card__badge" aria-label="Snoozed">⏱</span> : null}
                                </div>
                                <div className="alert-card__chips">
                                  {alert.symbol ? (
                                    <span className="alert-card__chip alert-card__chip--symbol">{alert.symbol}</span>
                                  ) : null}
                                  {alert.assetClass ? (
                                    <span className="alert-card__chip">{alert.assetClass}</span>
                                  ) : null}
                                  <span className="alert-card__chip">{alert.source}</span>
                                  <span className="alert-card__chip">{alert.category}</span>
                                  {alert.confidence !== null && alert.confidence !== undefined ? (
                                    <span className="alert-card__chip alert-card__chip--confidence">
                                      {(alert.confidence * 100).toFixed(0)}% conf
                                    </span>
                                  ) : null}
                                </div>
                              </div>

                              <p className="alert-card__description">{alert.description}</p>

                              <div className="alert-card__footer">
                                <span className="alert-card__time" title={new Date(alert.lastSeenAt).toLocaleString('en-US')}>
                                  {timeAgo(alert.lastSeenAt)}
                                </span>
                                <div className="alert-card__actions">
                                  <Link
                                    href={alert.symbol ? `/invest/stocks/${alert.symbol}` : '/market'}
                                    className="alert-card__action-link"
                                  >
                                    Inspect
                                  </Link>
                                  <Link
                                    href={alert.observationEventId ? `/observe/${alert.observationEventId}` : '/observe'}
                                    className="alert-card__action-link"
                                  >
                                    Observer
                                  </Link>
                                  {alert.observationEventId ? (
                                    <Link href={`/replay/${alert.observationEventId}`} className="alert-card__action-link">
                                      Replay
                                    </Link>
                                  ) : null}
                                  <button
                                    type="button"
                                    className="alert-card__action-btn"
                                    disabled={actionDisabled}
                                    onClick={() => setAlertState(alert.id, 'pin')}
                                    title="Pin alert"
                                    aria-label={`Pin alert: ${alert.title}`}
                                  >
                                    Pin
                                  </button>
                                  <button
                                    type="button"
                                    className="alert-card__action-btn"
                                    disabled={actionDisabled}
                                    onClick={() => setAlertState(alert.id, 'snooze')}
                                    title="Snooze for 1 hour"
                                    aria-label={`Snooze alert: ${alert.title}`}
                                  >
                                    Snooze
                                  </button>
                                  <button
                                    type="button"
                                    className="alert-card__action-btn alert-card__action-btn--dismiss"
                                    disabled={actionDisabled}
                                    onClick={() => setAlertState(alert.id, 'dismiss')}
                                    aria-label={`Dismiss alert: ${alert.title}`}
                                  >
                                    Dismiss
                                  </button>
                                  <button
                                    type="button"
                                    className="alert-card__action-btn alert-card__action-btn--resolve"
                                    disabled={actionDisabled}
                                    onClick={() => setAlertState(alert.id, 'resolve')}
                                    aria-label={`Resolve alert: ${alert.title}`}
                                  >
                                    Resolve
                                  </button>
                                </div>
                              </div>
                              {actionPending ? (
                                <p className="alert-card__action-status" role="status">Updating…</p>
                              ) : null}
                              {actionError?.id === alert.id ? (
                                <p className="alert-card__action-error" role="alert">{actionError.message}</p>
                              ) : null}
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        );
      })}
    </>
  );
}
