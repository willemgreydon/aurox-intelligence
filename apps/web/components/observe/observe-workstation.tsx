'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ObserveViewModel } from '../../server/services/market-observation-service';
import { buildSimulationTicketHref } from '../../lib/observe-actions';
import { getAssetInspectHref } from '../../lib/market-routes';

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

  // Observer feed filters
  const [sourceFilter, setSourceFilter] = useState<'all' | 'signal' | 'news' | 'risk' | 'provider' | 'portfolio' | 'anomaly'>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'CRITICAL' | 'WARNING' | 'WATCH' | 'INFO'>('all');
  const [assetClassFilter, setAssetClassFilter] = useState<'all' | 'stock' | 'etf' | 'crypto' | 'other'>('all');
  const [symbolSearch, setSymbolSearch] = useState('');

  // Watchlist controls (URL-synced)
  const [watchlistSort, setWatchlistSort] = useState(searchParams.get('watchlistSort') ?? 'strongest_signal');
  const [watchlistAssetClass, setWatchlistAssetClass] = useState(searchParams.get('assetClass') ?? 'all');
  const [watchlistSignalAction, setWatchlistSignalAction] = useState(searchParams.get('signalAction') ?? 'all');
  const [watchlistRisk, setWatchlistRisk] = useState(searchParams.get('risk') ?? 'all');
  const [watchlistNews, setWatchlistNews] = useState(searchParams.get('news') ?? 'all');
  const [watchlistSearch, setWatchlistSearch] = useState(searchParams.get('search') ?? '');

  // View modes
  const [denseMode, setDenseMode] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

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

  const criticalItems = useMemo(
    () => model.observerItems.filter((i) => i.severity === 'CRITICAL' || i.severity === 'WARNING'),
    [model.observerItems],
  );
  const tradeReadyCount = model.watchlistIntelligence.filter((i) => i.signalAction === 'BUY' && (i.confidence ?? 0) >= 0.65).length;
  const providerDegradedCount = model.observerItems.filter((i) => i.source === 'provider' && (i.severity === 'CRITICAL' || i.severity === 'WARNING')).length;
  const feedHasFilters = sourceFilter !== 'all' || severityFilter !== 'all' || assetClassFilter !== 'all' || symbolSearch.trim().length > 0;

  function clearFeedFilters() {
    setSourceFilter('all');
    setSeverityFilter('all');
    setAssetClassFilter('all');
    setSymbolSearch('');
  }

  function applyWatchlistControls() {
    const p = new URLSearchParams(searchParams.toString());
    p.set('watchlistSort', watchlistSort);
    p.set('assetClass', watchlistAssetClass);
    p.set('signalAction', watchlistSignalAction);
    p.set('risk', watchlistRisk);
    p.set('news', watchlistNews);
    p.set('search', watchlistSearch);
    startTransition(() => router.push(`/observe?${p.toString()}`));
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
      {/* ── Operator Command Bar ── */}
      <div className="observe-command-bar" role="toolbar" aria-label="Observe operator controls">
        <div className="observe-command-bar__inner">

          {/* Left: view mode toggles */}
          <div className="observe-command-bar__group" aria-label="View mode toggles">
            <button
              type="button"
              className={`observe-mode-btn${denseMode ? ' observe-mode-btn--active' : ''}`}
              onClick={() => setDenseMode((v) => !v)}
              aria-pressed={denseMode}
              title="Dense mode — compact panel height"
            >
              Dense
            </button>
            <button
              type="button"
              className={`observe-mode-btn${focusMode ? ' observe-mode-btn--active' : ''}`}
              onClick={() => setFocusMode((v) => !v)}
              aria-pressed={focusMode}
              title="Focus mode — hide secondary panels"
            >
              Focus
            </button>
          </div>

          <div className="observe-command-bar__divider" role="separator" />

          {/* Center: severity quick-filter chips */}
          <div className="observe-command-bar__group" aria-label="Severity filter">
            {(['all', 'CRITICAL', 'WARNING', 'WATCH', 'INFO'] as const).map((sev) => (
              <button
                key={sev}
                type="button"
                className={`observe-filter-chip${severityFilter === sev ? ' observe-filter-chip--active' : ''}${sev === 'CRITICAL' ? ' observe-filter-chip--danger' : sev === 'WARNING' ? ' observe-filter-chip--warning' : sev === 'WATCH' ? ' observe-filter-chip--info' : ''}`}
                onClick={() => setSeverityFilter(sev)}
                aria-pressed={severityFilter === sev}
              >
                {sev === 'all' ? 'All' : sev.charAt(0) + sev.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <div className="observe-command-bar__divider" role="separator" />

          {/* Asset class filter */}
          <div className="observe-command-bar__group" aria-label="Asset class filter">
            {(['all', 'stock', 'etf', 'crypto'] as const).map((cls) => (
              <button
                key={cls}
                type="button"
                className={`observe-filter-chip${assetClassFilter === cls ? ' observe-filter-chip--active' : ''}`}
                onClick={() => setAssetClassFilter(cls)}
                aria-pressed={assetClassFilter === cls}
              >
                {cls === 'all' ? 'All assets' : cls.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="observe-command-bar__divider" role="separator" />

          {/* Symbol search */}
          <div className="observe-command-bar__search">
            <input
              className="observe-search-input"
              value={symbolSearch}
              onChange={(e) => setSymbolSearch(e.target.value)}
              placeholder="Search symbol…"
              aria-label="Search by symbol"
              type="search"
            />
          </div>

          {/* Right: actions */}
          <div className="observe-command-bar__group observe-command-bar__group--right">
            {feedHasFilters && (
              <button type="button" className="observe-mode-btn" onClick={clearFeedFilters} aria-label="Clear all filters">
                Clear
              </button>
            )}
            <Link href="/alerts" className="observe-mode-btn">Alerts</Link>
            <Link href="/invest/simulation?side=buy&intent=prepare" className="observe-mode-btn observe-mode-btn--primary">
              Prepare Sim
            </Link>
          </div>
        </div>
      </div>

      {/* ── KPI Metric Rail ── */}
      <section className="observe-metric-rail" aria-label="Market observation metrics">
        <article className="observe-metric-card">
          <div className="observe-metric-card__label">Regime</div>
          <div className="observe-metric-card__value">{model.regime.label}</div>
        </article>
        <article className="observe-metric-card">
          <div className="observe-metric-card__label">Confidence</div>
          <div className="observe-metric-card__value">{(model.regime.confidence * 100).toFixed(0)}%</div>
        </article>
        <article className={`observe-metric-card${model.summary.criticalCount > 0 ? ' observe-metric-card--danger' : ''}`}>
          <div className="observe-metric-card__label">Critical</div>
          <div className="observe-metric-card__value">{model.summary.criticalCount}</div>
        </article>
        <article className="observe-metric-card">
          <div className="observe-metric-card__label">Warning</div>
          <div className="observe-metric-card__value">{model.summary.warningCount}</div>
        </article>
        <article className="observe-metric-card">
          <div className="observe-metric-card__label">Watch</div>
          <div className="observe-metric-card__value">{model.summary.watchCount}</div>
        </article>
        <article className={`observe-metric-card${tradeReadyCount > 0 ? ' observe-metric-card--success' : ''}`}>
          <div className="observe-metric-card__label">Trade-ready</div>
          <div className="observe-metric-card__value">{tradeReadyCount}</div>
        </article>
        <article className={`observe-metric-card${providerDegradedCount > 0 ? ' observe-metric-card--warning' : ''}`}>
          <div className="observe-metric-card__label">Provider issues</div>
          <div className="observe-metric-card__value">{providerDegradedCount}</div>
        </article>

        {model.persistenceDegraded && (
          <p className="observe-metric-rail__notice" role="alert">
            ⚠ Persistence degraded — runtime-only fallback. Events won't be saved.
          </p>
        )}
      </section>

      {/* ── Cockpit Panel Grid ── */}
      <section
        className={`observe-cockpit${denseMode ? ' observe-cockpit--dense' : ''}${focusMode ? ' observe-cockpit--focus' : ''}`}
        aria-label="Observe cockpit panels"
      >

        {/* Row 1: Critical Queue + Anomaly Radar */}
        <div className="observe-cockpit__row observe-cockpit__row--halves">

          {/* Critical Queue */}
          <article className="observe-panel">
            <div className="observe-panel__header">
              <div>
                <div className="section__eyebrow">Critical Queue</div>
                <h3 className="observe-panel__title">Top priority items</h3>
              </div>
              <Link href="/alerts" className="button button--secondary observe-panel__action">
                Alert Center →
              </Link>
            </div>
            <div className="observe-panel__body">
              {criticalItems.length === 0 ? (
                <div className="aurox-empty-state aurox-empty-state--inline">
                  <p className="aurox-empty-state__title">No critical items</p>
                  <p className="text-muted" style={{ fontSize: '0.8rem' }}>Market observation is nominal.</p>
                </div>
              ) : (
                <div className="observe-feed observe-feed--compact">
                  {criticalItems.slice(0, denseMode ? 5 : 8).map((item) => (
                    <div key={item.id} className="observe-feed__item observe-feed__item--compact">
                      <span className={`status-pill status-pill--${severityTone(item.severity)}`}>{item.severity}</span>
                      <span className="observe-feed__item-title">{item.title}</span>
                      <Link href="/alerts" className="journal-action-link" aria-label={`Inspect: ${item.title}`}>
                        Inspect →
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="observe-panel__footer">
              <Link href="/alerts" className="journal-action-link">Open full alert center →</Link>
            </div>
          </article>

          {/* Anomaly Radar */}
          <article className="observe-panel">
            <div className="observe-panel__header">
              <div>
                <div className="section__eyebrow">Anomaly Radar</div>
                <h3 className="observe-panel__title">Scored anomaly set</h3>
              </div>
            </div>
            <div className="observe-panel__body">
              {model.anomalies.length === 0 ? (
                <div className="aurox-empty-state aurox-empty-state--inline">
                  <p className="aurox-empty-state__title">No anomalies detected</p>
                  <p className="text-muted" style={{ fontSize: '0.8rem' }}>Observation window is clear.</p>
                </div>
              ) : (
                <div className="observe-feed observe-feed--compact">
                  {model.anomalies.slice(0, denseMode ? 5 : 8).map((item) => (
                    <div key={item.id} className="observe-feed__item observe-feed__item--compact">
                      <span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 600, minWidth: '3.5rem' }}>{item.assetSymbol}</span>
                      <span className="text-muted observe-feed__item-title">{item.anomalyType}</span>
                      <span className={`status-pill ${item.anomalyScore >= 75 ? 'status-pill--danger' : item.anomalyScore >= 50 ? 'status-pill--warning' : 'status-pill--neutral'}`}>
                        {item.anomalyScore.toFixed(0)}/100
                      </span>
                      {item.inspectionHref && (
                        <Link href={item.inspectionHref} className="journal-action-link" aria-label={`Inspect anomaly for ${item.assetSymbol}`}>
                          →
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="observe-panel__footer">
              <Link href="/signals" className="journal-action-link">Review signal anomalies →</Link>
            </div>
          </article>
        </div>

        {/* Row 2: Trade Readiness + Observer Feed + Timeline (3-col) */}
        <div className="observe-cockpit__row observe-cockpit__row--thirds">

          {/* Trade Readiness */}
          <article className="observe-panel">
            <div className="observe-panel__header">
              <div>
                <div className="section__eyebrow">Trade Readiness</div>
                <h3 className="observe-panel__title">Operator quick actions</h3>
              </div>
            </div>
            <div className="observe-panel__body">
              <div className="observe-action-stack">
                <Link href="/invest/simulation?side=buy&intent=prepare" className="button button--primary observe-action-stack__item">
                  Prepare simulation buy
                </Link>
                <Link href="/alerts" className="button button--secondary observe-action-stack__item">
                  Inspect alert center
                </Link>
                <Link href="/signals" className="button button--secondary observe-action-stack__item">
                  Open signal dashboard
                </Link>
                <Link href="/portfolio/intelligence" className="button button--secondary observe-action-stack__item">
                  Portfolio intelligence
                </Link>
                <Link href="/invest/simulation/journal" className="button button--secondary observe-action-stack__item">
                  Simulation journal
                </Link>
              </div>
              {tradeReadyCount > 0 && (
                <p className="text-muted observe-panel__note">
                  {tradeReadyCount} watchlist asset{tradeReadyCount !== 1 ? 's' : ''} in buy-signal territory (≥65% confidence).
                </p>
              )}
            </div>
            <div className="observe-panel__footer">
              <span className="status-pill status-pill--info" style={{ fontSize: '0.65rem' }}>SIM only</span>
              <span className="status-pill status-pill--neutral" style={{ fontSize: '0.65rem' }}>Live locked</span>
            </div>
          </article>

          {/* Observer Feed */}
          {!focusMode && (
            <article className="observe-panel">
              <div className="observe-panel__header">
                <div>
                  <div className="section__eyebrow">AI Market Observer</div>
                  <h3 className="observe-panel__title">Observation feed</h3>
                </div>
              </div>
              <div className="observe-panel__body">
                <div className="observe-feed" aria-live="polite" aria-label="Observer feed">
                  {filteredFeed.length === 0 ? (
                    <div className="aurox-empty-state aurox-empty-state--inline">
                      <p className="aurox-empty-state__title">No observations match filters</p>
                      {feedHasFilters && (
                        <button type="button" className="button button--secondary" onClick={clearFeedFilters}>
                          Clear filters
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredFeed.slice(0, denseMode ? 6 : 12).map((item) => (
                      <article key={item.id} className="observe-feed__item">
                        <div className="observe-feed__item-header">
                          <strong>{item.title}</strong>
                          <span className={`status-pill status-pill--${severityTone(item.severity)}`}>{item.severity}</span>
                        </div>
                        <p className="text-muted observe-feed__item-reason">{item.reason}</p>
                        <p className="text-muted observe-feed__item-meta">
                          {item.source} · {(item.confidence * 100).toFixed(0)}% confidence{item.assetSymbol ? ` · ${item.assetSymbol}` : ''}
                        </p>
                        <div className="aurox-action-row">
                          <Link href={getAssetInspectHref({ symbol: item.assetSymbol, assetClass: item.assetClass })} className="journal-action-link">
                            Inspect
                          </Link>
                          <Link href="/signals" className="journal-action-link">Signals</Link>
                          <Link href={buildSimulationTicketHref({ symbol: item.assetSymbol, assetClass: item.assetClass })} className="journal-action-link">
                            Simulate
                          </Link>
                          <button type="button" className="journal-action-link" onClick={() => setEventState(item.id, 'pin')} aria-label={`Pin: ${item.title}`}>Pin</button>
                          <button type="button" className="journal-action-link" onClick={() => setEventState(item.id, 'read')} aria-label={`Mark read: ${item.title}`}>Read</button>
                          <button type="button" className="journal-action-link" onClick={() => setEventState(item.id, 'dismiss')} aria-label={`Dismiss: ${item.title}`}>Dismiss</button>
                        </div>
                      </article>
                    ))
                  )}
                </div>
                {filteredFeed.length > 0 && (
                  <p className="text-muted observe-panel__note">
                    {filteredFeed.length} of {model.observerItems.length} observations.{' '}
                    {feedHasFilters && <button type="button" className="journal-action-link" onClick={clearFeedFilters}>Clear filters</button>}
                  </p>
                )}
              </div>
            </article>
          )}

          {/* Market Event Timeline */}
          {!focusMode && (
            <article className="observe-panel">
              <div className="observe-panel__header">
                <div>
                  <div className="section__eyebrow">Market Event Timeline</div>
                  <h3 className="observe-panel__title">Newest events first</h3>
                </div>
              </div>
              <div className="observe-panel__body">
                {model.timeline.length === 0 ? (
                  <div className="aurox-empty-state aurox-empty-state--inline">
                    <p className="aurox-empty-state__title">No timeline events</p>
                    <p className="text-muted" style={{ fontSize: '0.8rem' }}>Events appear as market activity is observed.</p>
                  </div>
                ) : (
                  <div className="observe-timeline">
                    {model.timeline.slice(0, denseMode ? 12 : 24).map((event) => (
                      <article key={event.id} className="observe-timeline__item">
                        <span className={`status-pill status-pill--${severityTone(event.severity)}`}>{event.severity}</span>
                        <div>
                          <strong className="observe-timeline__item-type">{event.eventType.replaceAll('_', ' ')}</strong>
                          <p className="text-muted observe-feed__item-reason">{event.description}</p>
                          <p className="text-muted observe-feed__item-meta">
                            {new Date(event.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {event.actionHref && (
                            <Link href={event.actionHref} className="journal-action-link" style={{ fontSize: '0.75rem' }}>
                              View →
                            </Link>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
              <div className="observe-panel__footer">
                <Link href="/alerts" className="journal-action-link">Full event log →</Link>
              </div>
            </article>
          )}
        </div>

        {/* Row 3: Cross-Asset Intelligence (full-width, only if data + not focus) */}
        {!focusMode && model.relationshipInsights.length > 0 && (
          <div className="observe-cockpit__row observe-cockpit__row--full">
            <article className="observe-panel">
              <div className="observe-panel__header">
                <div>
                  <div className="section__eyebrow">Cross-Asset Intelligence</div>
                  <h3 className="observe-panel__title">Relationship engine insights</h3>
                </div>
              </div>
              <div className="observe-panel__body">
                <div className="observe-cockpit__insight-grid">
                  {model.relationshipInsights.slice(0, denseMode ? 4 : 6).map((item) => (
                    <article key={item.id} className="observe-insight-card">
                      <div className="observe-insight-card__header">
                        <strong>{item.title}</strong>
                        <span className={`status-pill status-pill--${severityTone(item.severity)}`}>{item.severity}</span>
                      </div>
                      <p className="text-muted observe-feed__item-reason">{item.narrative}</p>
                      <p className="text-muted observe-feed__item-meta">
                        {item.symbols.join(', ')} · {(item.confidence * 100).toFixed(0)}% confidence · {item.kind}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
              <div className="observe-panel__footer">
                <Link href="/market" className="journal-action-link">Open market workstation →</Link>
              </div>
            </article>
          </div>
        )}

        {/* Row 4: Watchlist Intelligence (full-width, only if not focus) */}
        {!focusMode && (
          <div className="observe-cockpit__row observe-cockpit__row--full">
            <article className="observe-panel">
              <div className="observe-panel__header">
                <div>
                  <div className="section__eyebrow">Watchlist Intelligence</div>
                  <h3 className="observe-panel__title">Signal, risk, news, and freshness</h3>
                </div>
              </div>
              <div className="observe-panel__body">
                {/* Watchlist filter toolbar */}
                <div className="aurox-toolbar" aria-label="Watchlist intelligence filters">
                  <select className="market-graph__selector-input" value={watchlistSort} onChange={(e) => setWatchlistSort(e.target.value)} aria-label="Sort by">
                    <option value="strongest_signal">Strongest signal</option>
                    <option value="highest_confidence">Highest confidence</option>
                    <option value="highest_risk">Highest risk</option>
                    <option value="biggest_mover">Biggest mover</option>
                    <option value="newest_news">Newest news</option>
                    <option value="worst_provider_freshness">Worst freshness</option>
                  </select>
                  <select className="market-graph__selector-input" value={watchlistAssetClass} onChange={(e) => setWatchlistAssetClass(e.target.value)} aria-label="Filter by asset class">
                    <option value="all">All classes</option>
                    <option value="stock">Stocks</option>
                    <option value="etf">ETFs</option>
                    <option value="crypto">Crypto</option>
                  </select>
                  <select className="market-graph__selector-input" value={watchlistSignalAction} onChange={(e) => setWatchlistSignalAction(e.target.value)} aria-label="Filter by signal">
                    <option value="all">All signals</option>
                    <option value="BUY">Buy</option>
                    <option value="SELL">Sell</option>
                    <option value="HOLD">Hold</option>
                  </select>
                  <select className="market-graph__selector-input" value={watchlistRisk} onChange={(e) => setWatchlistRisk(e.target.value)} aria-label="Filter by risk">
                    <option value="all">All risk</option>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="EXTREME">Extreme</option>
                  </select>
                  <select className="market-graph__selector-input" value={watchlistNews} onChange={(e) => setWatchlistNews(e.target.value)} aria-label="Filter by news">
                    <option value="all">All news</option>
                    <option value="NEGATIVE">Negative</option>
                    <option value="NEUTRAL">Neutral</option>
                    <option value="POSITIVE">Positive</option>
                  </select>
                  <input
                    className="market-graph__selector-input"
                    value={watchlistSearch}
                    onChange={(e) => setWatchlistSearch(e.target.value)}
                    placeholder="Search symbol/name"
                    aria-label="Search watchlist"
                  />
                  <button type="button" className="button" onClick={applyWatchlistControls} disabled={isPending} aria-label="Apply watchlist filters">
                    {isPending ? 'Applying…' : 'Apply'}
                  </button>
                </div>

                {model.watchlistIntelligence.length === 0 ? (
                  <div className="aurox-empty-state aurox-empty-state--inline">
                    <p className="aurox-empty-state__title">Watchlist is empty</p>
                    <p className="text-muted" style={{ fontSize: '0.8rem' }}>
                      Add assets from Stocks, ETFs, or Crypto lanes to see intelligence here.
                    </p>
                    <Link href="/invest/stocks" className="button button--secondary">Browse stocks</Link>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table" style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th scope="col">Asset</th>
                          <th scope="col">Price</th>
                          <th scope="col">Change</th>
                          <th scope="col">Signal</th>
                          <th scope="col">Confidence</th>
                          <th scope="col">Risk</th>
                          <th scope="col">News</th>
                          <th scope="col">Freshness</th>
                          <th scope="col">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {model.watchlistIntelligence.map((item) => (
                          <tr key={item.symbol}>
                            <td style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 600 }}>{item.symbol}</td>
                            <td style={{ fontFamily: 'var(--font-family-mono)', textAlign: 'right' }}>{item.priceLabel}</td>
                            <td style={{ fontFamily: 'var(--font-family-mono)', textAlign: 'right' }}>{item.changeLabel}</td>
                            <td>
                              <span className={`status-pill ${item.signalAction === 'BUY' ? 'status-pill--success' : item.signalAction === 'SELL' ? 'status-pill--danger' : 'status-pill--neutral'}`}>
                                {item.signalAction}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              {item.confidence === null ? <span className="text-muted">—</span> : `${(item.confidence * 100).toFixed(0)}%`}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              {item.riskScore === null ? <span className="text-muted">—</span> : `${item.riskScore.toFixed(0)}/100`}
                            </td>
                            <td>{item.newsSentiment === null ? <span className="text-muted">—</span> : item.newsSentiment.toFixed(2)}</td>
                            <td>{item.freshnessLabel}</td>
                            <td>
                              <div className="aurox-action-row">
                                <Link href={item.actions.inspectHref} className="journal-action-link">Inspect</Link>
                                <Link href={item.actions.compareHref} className="journal-action-link">Compare</Link>
                                <Link href={item.actions.simulateHref} className="journal-action-link">Simulate</Link>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="observe-panel__footer">
                <Link href="/invest/simulation?intent=prepare" className="journal-action-link">Prepare simulation from watchlist →</Link>
                <Link href="/portfolio/intelligence" className="journal-action-link">Portfolio intelligence →</Link>
              </div>
            </article>
          </div>
        )}

      </section>
    </>
  );
}
