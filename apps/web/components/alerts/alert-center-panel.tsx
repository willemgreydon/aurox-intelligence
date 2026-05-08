'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import type { AlertCenterViewModel } from '../../server/services/alert-center-service';

type Props = {
  model: AlertCenterViewModel;
};

export function AlertCenterPanel({ model }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

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
    await fetch(`/api/alerts/${id}/state`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    router.refresh();
  }

  const groups: Array<keyof AlertCenterViewModel['grouped']> = ['CRITICAL', 'WARNING', 'WATCH', 'INFO'];

  return (
    <>
      <section className="dashboard-section dashboard-section--compact">
        <div className="observation-regime-grid">
          <article className="analytics-card observation-regime-card"><div className="analytics-stat__label">Open alerts</div><div className="analytics-stat__value">{model.summary.open}</div></article>
          <article className="analytics-card observation-regime-card"><div className="analytics-stat__label">Critical</div><div className="analytics-stat__value">{model.summary.critical}</div></article>
          <article className="analytics-card observation-regime-card"><div className="analytics-stat__label">Warning</div><div className="analytics-stat__value">{model.summary.warning}</div></article>
          <article className="analytics-card observation-regime-card"><div className="analytics-stat__label">Snoozed</div><div className="analytics-stat__value">{model.summary.snoozed}</div></article>
          <article className="analytics-card observation-regime-card"><div className="analytics-stat__label">Resolved today</div><div className="analytics-stat__value">{model.summary.resolvedToday}</div></article>
        </div>
        {model.persistenceDegraded ? <p className="text-muted">Alert persistence degraded. Showing fallback data when available.</p> : null}
      </section>

      <section className="dashboard-section dashboard-section--compact dashboard-section--tinted">
        <article className="analytics-card">
          <div className="analytics-card__body">
            <div className="market-pagination__actions" style={{ marginBottom: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              <select className="market-graph__selector-input" value={model.filters.severity} onChange={(event) => setFilter('severity', event.target.value)}>
                <option value="all">All severities</option><option value="CRITICAL">Critical</option><option value="WARNING">Warning</option><option value="WATCH">Watch</option><option value="INFO">Info</option>
              </select>
              <select className="market-graph__selector-input" value={model.filters.category} onChange={(event) => setFilter('category', event.target.value)}>
                <option value="all">All categories</option><option value="market">Market</option><option value="signal">Signal</option><option value="anomaly">Anomaly</option><option value="provider">Provider</option><option value="liquidity">Liquidity</option><option value="volatility">Volatility</option><option value="portfolio">Portfolio</option><option value="simulation">Simulation</option><option value="cross_asset">Cross-asset</option>
              </select>
              <select className="market-graph__selector-input" value={model.filters.assetClass} onChange={(event) => setFilter('assetClass', event.target.value)}>
                <option value="all">All asset classes</option><option value="stock">Stocks</option><option value="etf">ETFs</option><option value="crypto">Crypto</option><option value="other">Other</option>
              </select>
              <select className="market-graph__selector-input" value={model.filters.source} onChange={(event) => setFilter('source', event.target.value)}>
                <option value="all">All sources</option><option value="signal">Signal</option><option value="news">News</option><option value="risk">Risk</option><option value="provider">Provider</option><option value="portfolio">Portfolio</option><option value="anomaly">Anomaly</option><option value="broker">Broker</option><option value="simulation">Simulation</option><option value="regime">Regime</option><option value="relationship">Relationship</option>
              </select>
              <select className="market-graph__selector-input" value={model.filters.status} onChange={(event) => setFilter('status', event.target.value)}>
                <option value="all">All status</option><option value="OPEN">Open</option><option value="READ">Read</option><option value="PINNED">Pinned</option><option value="SNOOZED">Snoozed</option><option value="DISMISSED">Dismissed</option><option value="RESOLVED">Resolved</option>
              </select>
              <input className="market-graph__selector-input" defaultValue={model.filters.search} placeholder="Search title/description" onBlur={(event) => setFilter('search', event.target.value)} />
            </div>

            {groups.map((group) => (
              <div key={group} style={{ marginBottom: '1rem' }}>
                <h3 style={{ marginBottom: '0.45rem' }}>{group}</h3>
                <div className="observe-feed" style={{ maxHeight: '22rem' }}>
                  {model.grouped[group].length === 0 ? (
                    <p className="text-muted">No {group.toLowerCase()} alerts.</p>
                  ) : model.grouped[group].map((alert) => {
                    const runtimeOnly = alert.id.startsWith('runtime-');
                    return (
                      <article key={alert.id} className="observe-feed__item">
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'center' }}>
                          <strong>{alert.title}</strong>
                          <span className={`status-pill status-pill--${group === 'CRITICAL' ? 'danger' : group === 'WARNING' ? 'warning' : group === 'WATCH' ? 'info' : 'success'}`}>{alert.severity}</span>
                        </div>
                        <p className="text-muted">{alert.description}</p>
                        <p className="text-muted" style={{ fontSize: '0.75rem' }}>
                          {alert.symbol ?? 'n/a'} · {alert.assetClass ?? 'n/a'} · {alert.source} / {alert.category} · confidence {alert.confidence === null || alert.confidence === undefined ? 'n/a' : `${(alert.confidence * 100).toFixed(0)}%`} · last seen {new Date(alert.lastSeenAt).toLocaleString('en-US')}
                        </p>
                        <p style={{ display: 'flex', flexWrap: 'wrap', gap: '0.55rem' }}>
                          <Link href={alert.symbol ? `/stocks/${alert.symbol}` : '/market'}>Inspect</Link>
                          <Link href={alert.observationEventId ? `/observe/${alert.observationEventId}` : '/observe'}>Open observation</Link>
                          <Link href={`/replay/${alert.id}`}>Replay</Link>
                          <button type="button" className="button button--ghost" disabled={isPending || runtimeOnly} onClick={() => setAlertState(alert.id, 'pin')}>Pin</button>
                          <button type="button" className="button button--ghost" disabled={isPending || runtimeOnly} onClick={() => setAlertState(alert.id, 'snooze')}>Snooze</button>
                          <button type="button" className="button button--ghost" disabled={isPending || runtimeOnly} onClick={() => setAlertState(alert.id, 'dismiss')}>Dismiss</button>
                          <button type="button" className="button button--ghost" disabled={isPending || runtimeOnly} onClick={() => setAlertState(alert.id, 'resolve')}>Resolve</button>
                        </p>
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </>
  );
}
