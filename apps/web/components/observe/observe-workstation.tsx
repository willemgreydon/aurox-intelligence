'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ObserveViewModel } from '../../server/services/market-observation-service';
import { buildSimulationTicketHref } from '../../lib/observe-actions';

type Props = { model: ObserveViewModel };

function severityTone(severity: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  if (severity === 'CRITICAL') return 'danger';
  if (severity === 'WARNING') return 'warning';
  if (severity === 'WATCH') return 'info';
  if (severity === 'INFO') return 'success';
  return 'neutral';
}

export function ObserveWorkstation({ model }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [sourceFilter, setSourceFilter] = useState<'all' | 'signal' | 'news' | 'risk' | 'provider' | 'portfolio' | 'anomaly'>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'CRITICAL' | 'WARNING' | 'WATCH' | 'INFO'>('all');
  const [assetClassFilter, setAssetClassFilter] = useState<'all' | 'stock' | 'etf' | 'crypto' | 'other'>('all');
  const [symbolSearch, setSymbolSearch] = useState('');
  const [watchlistSort, setWatchlistSort] = useState(searchParams.get('watchlistSort') ?? 'strongest_signal');
  const [watchlistAssetClass, setWatchlistAssetClass] = useState(searchParams.get('assetClass') ?? 'all');
  const [watchlistSignalAction, setWatchlistSignalAction] = useState(searchParams.get('signalAction') ?? 'all');
  const [watchlistRisk, setWatchlistRisk] = useState(searchParams.get('risk') ?? 'all');
  const [watchlistNews, setWatchlistNews] = useState(searchParams.get('news') ?? 'all');
  const [watchlistSearch, setWatchlistSearch] = useState(searchParams.get('search') ?? '');

  const filteredFeed = useMemo(() => model.observerItems.filter((item) => {
    if (sourceFilter !== 'all' && item.source !== sourceFilter) return false;
    if (severityFilter !== 'all' && item.severity !== severityFilter) return false;
    if (assetClassFilter !== 'all' && (item.assetClass ?? 'other') !== assetClassFilter) return false;
    if (symbolSearch.trim().length > 0) {
      const q = symbolSearch.trim().toUpperCase();
      if (!(item.assetSymbol ?? '').toUpperCase().includes(q)) return false;
    }
    return true;
  }), [assetClassFilter, model.observerItems, severityFilter, sourceFilter, symbolSearch]);

  function applyWatchlistControls() {
    const params = new URLSearchParams(searchParams.toString());
    params.set('watchlistSort', watchlistSort);
    params.set('assetClass', watchlistAssetClass);
    params.set('signalAction', watchlistSignalAction);
    params.set('risk', watchlistRisk);
    params.set('news', watchlistNews);
    params.set('search', watchlistSearch);
    startTransition(() => router.push(`/observe?${params.toString()}`));
  }

  async function setEventState(id: string, action: 'read' | 'pin' | 'dismiss') {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid) return;
    await fetch(`/api/observe/events/${id}/state`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action, value: true }),
    });
    router.refresh();
  }

  return (
    <>
      <section className="dashboard-section dashboard-section--compact observe-page__summary">
        <div className="observation-regime-grid">
          <article className="analytics-card observation-regime-card"><div className="analytics-stat__label">Regime</div><div className="analytics-stat__value">{model.regime.label}</div></article>
          <article className="analytics-card observation-regime-card"><div className="analytics-stat__label">Regime confidence</div><div className="analytics-stat__value">{(model.regime.confidence * 100).toFixed(0)}%</div></article>
          <article className="analytics-card observation-regime-card"><div className="analytics-stat__label">Critical</div><div className="analytics-stat__value">{model.summary.criticalCount}</div></article>
          <article className="analytics-card observation-regime-card"><div className="analytics-stat__label">Warning</div><div className="analytics-stat__value">{model.summary.warningCount}</div></article>
          <article className="analytics-card observation-regime-card"><div className="analytics-stat__label">Watch</div><div className="analytics-stat__value">{model.summary.watchCount}</div></article>
        </div>
        {model.persistenceDegraded ? <p className="text-muted">Observation persistence degraded. Running in runtime-only fallback.</p> : null}
      </section>

      <section className="dashboard-section dashboard-section--compact dashboard-section--tinted observe-page__panels">
        <div className="analytics-two-grid">
          <article className="analytics-card">
            <div className="analytics-card__header"><div><div className="section__eyebrow">AI Market Observer</div><h3>Observation feed</h3></div></div>
            <div className="analytics-card__body">
              <div className="market-pagination__actions" style={{ marginBottom: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                <select className="market-graph__selector-input" value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as typeof sourceFilter)}><option value="all">All sources</option><option value="signal">Signal</option><option value="news">News</option><option value="risk">Risk</option><option value="provider">Provider</option><option value="portfolio">Portfolio</option><option value="anomaly">Anomaly</option></select>
                <select className="market-graph__selector-input" value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value as typeof severityFilter)}><option value="all">All severities</option><option value="CRITICAL">Critical</option><option value="WARNING">Warning</option><option value="WATCH">Watch</option><option value="INFO">Info</option></select>
                <select className="market-graph__selector-input" value={assetClassFilter} onChange={(event) => setAssetClassFilter(event.target.value as typeof assetClassFilter)}><option value="all">All classes</option><option value="stock">Stocks</option><option value="etf">ETFs</option><option value="crypto">Crypto</option><option value="other">Other</option></select>
                <input className="market-graph__selector-input" value={symbolSearch} onChange={(event) => setSymbolSearch(event.target.value)} placeholder="Search symbol" aria-label="Search symbol" />
              </div>
              <div className="observe-feed">
                {filteredFeed.length === 0 ? <p className="text-muted">No observations match filters.</p> : filteredFeed.map((item) => (
                  <article key={item.id} className="observe-feed__item">
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'center' }}><strong>{item.title}</strong><span className={`status-pill status-pill--${severityTone(item.severity)}`}>{item.severity}</span></div>
                    <p className="text-muted">{item.reason}</p>
                    <p className="text-muted" style={{ fontSize: '0.75rem' }}>Why am I seeing this? Source: {item.source}, confidence {(item.confidence * 100).toFixed(0)}%, asset {item.assetSymbol ?? 'n/a'}.</p>
                    <p style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', fontSize: '0.8rem' }}>
                      <Link href={item.assetSymbol ? `/stocks/${item.assetSymbol}` : '/market'}>Inspect asset</Link>
                      <Link href="/signals">Open signal</Link>
                      <Link href={buildSimulationTicketHref(item.assetSymbol)}>Prepare simulation ticket</Link>
                      <button type="button" className="button button--ghost" onClick={() => setEventState(item.id, 'pin')}>Pin</button>
                      <button type="button" className="button button--ghost" onClick={() => setEventState(item.id, 'read')}>Mark read</button>
                      <button type="button" className="button button--ghost" onClick={() => setEventState(item.id, 'dismiss')}>Dismiss</button>
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </article>

          <article className="analytics-card">
            <div className="analytics-card__header"><div><div className="section__eyebrow">Market Event Timeline</div><h3>Newest events first</h3></div></div>
            <div className="analytics-card__body">
              <div className="observe-timeline">
                {model.timeline.length === 0 ? <p className="text-muted">No events available.</p> : model.timeline.slice(0, 24).map((event) => (
                  <article key={event.id} className="observe-timeline__item">
                    <span className={`status-pill status-pill--${severityTone(event.severity)}`}>{event.severity}</span>
                    <div><strong>{event.eventType.replaceAll('_', ' ')}</strong><p className="text-muted">{event.description}</p><p className="text-muted" style={{ fontSize: '0.74rem' }}>{new Date(event.timestamp).toLocaleString('en-US')}</p></div>
                  </article>
                ))}
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="dashboard-section dashboard-section--compact dashboard-section--tinted observe-page__panels">
        <article className="analytics-card">
          <div className="analytics-card__header"><div><div className="section__eyebrow">Watchlist Intelligence</div><h3>Signal, risk, news, freshness</h3></div></div>
          <div className="analytics-card__body">
            <div className="market-pagination__actions" style={{ marginBottom: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              <select className="market-graph__selector-input" value={watchlistSort} onChange={(event) => setWatchlistSort(event.target.value)}><option value="strongest_signal">Strongest signal</option><option value="highest_confidence">Highest confidence</option><option value="highest_risk">Highest risk</option><option value="biggest_mover">Biggest mover</option><option value="newest_news">Newest news</option><option value="worst_provider_freshness">Worst freshness</option></select>
              <select className="market-graph__selector-input" value={watchlistAssetClass} onChange={(event) => setWatchlistAssetClass(event.target.value)}><option value="all">All classes</option><option value="stock">Stocks</option><option value="etf">ETFs</option><option value="crypto">Crypto</option></select>
              <select className="market-graph__selector-input" value={watchlistSignalAction} onChange={(event) => setWatchlistSignalAction(event.target.value)}><option value="all">All actions</option><option value="BUY">BUY</option><option value="SELL">SELL</option><option value="HOLD">HOLD</option></select>
              <select className="market-graph__selector-input" value={watchlistRisk} onChange={(event) => setWatchlistRisk(event.target.value)}><option value="all">All risk</option><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="EXTREME">Extreme</option></select>
              <select className="market-graph__selector-input" value={watchlistNews} onChange={(event) => setWatchlistNews(event.target.value)}><option value="all">All news</option><option value="NEGATIVE">Negative</option><option value="NEUTRAL">Neutral</option><option value="POSITIVE">Positive</option></select>
              <input className="market-graph__selector-input" value={watchlistSearch} onChange={(event) => setWatchlistSearch(event.target.value)} placeholder="Search symbol/name" />
              <button type="button" className="button" onClick={applyWatchlistControls} disabled={isPending}>{isPending ? 'Applying...' : 'Apply'}</button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%' }}>
                <thead><tr><th>Asset</th><th>Price</th><th>Change</th><th>Signal</th><th>Confidence</th><th>Risk</th><th>News</th><th>Freshness</th><th>Actions</th></tr></thead>
                <tbody>
                  {model.watchlistIntelligence.map((item) => (
                    <tr key={item.symbol}>
                      <td>{item.symbol}</td><td>{item.priceLabel}</td><td>{item.changeLabel}</td><td>{item.signalAction}</td><td>{item.confidence === null ? 'n/a' : `${(item.confidence * 100).toFixed(0)}%`}</td><td>{item.riskScore === null ? 'n/a' : `${item.riskScore.toFixed(0)}/100`}</td><td>{item.newsSentiment === null ? 'n/a' : item.newsSentiment.toFixed(2)}</td><td>{item.freshnessLabel}</td>
                      <td><Link href={item.actions.inspectHref}>inspect</Link> · <Link href={item.actions.compareHref}>compare</Link> · <Link href={item.actions.simulateHref}>simulate</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </article>
      </section>
    </>
  );
}
