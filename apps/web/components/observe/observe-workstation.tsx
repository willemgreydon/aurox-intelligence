'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ObserveViewModel } from '../../server/services/market-observation-service';
import {
  sortAndFilterWatchlist,
  type WatchlistSort,
  type WatchlistFilter,
} from '../../server/lib/watchlist-intelligence';
import { buildSimulationTicketHref } from '../../lib/observe-actions';
import { getAssetInspectHref } from '../../lib/market-routes';
import type { AppMessages } from '../../lib/i18n/messages';

type Props = { model: ObserveViewModel; labels: AppMessages['observe'] };

function severityTone(severity: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  if (severity === 'CRITICAL') return 'danger';
  if (severity === 'WARNING') return 'warning';
  if (severity === 'WATCH') return 'info';
  if (severity === 'INFO') return 'success';
  return 'neutral';
}

export function ObserveWorkstation({ model, labels }: Props) {
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

  // Apply watchlist sort + filters on the client so the table reacts immediately
  // to control changes. Reuses the same pure sortAndFilterWatchlist helper the
  // server uses, so client and server results stay consistent. The Apply button
  // still syncs state to the URL for shareable/deep-linkable views.
  const filteredWatchlist = useMemo(
    () =>
      sortAndFilterWatchlist(model.watchlistIntelligence, watchlistSort as WatchlistSort, {
        assetClass: watchlistAssetClass as WatchlistFilter['assetClass'],
        signalAction: watchlistSignalAction as WatchlistFilter['signalAction'],
        risk: watchlistRisk as WatchlistFilter['risk'],
        news: watchlistNews as WatchlistFilter['news'],
        search: watchlistSearch,
      }),
    [
      model.watchlistIntelligence,
      watchlistSort,
      watchlistAssetClass,
      watchlistSignalAction,
      watchlistRisk,
      watchlistNews,
      watchlistSearch,
    ],
  );

  const watchlistHasFilters =
    watchlistAssetClass !== 'all' ||
    watchlistSignalAction !== 'all' ||
    watchlistRisk !== 'all' ||
    watchlistNews !== 'all' ||
    watchlistSearch.trim().length > 0;

  function clearWatchlistControls() {
    setWatchlistAssetClass('all');
    setWatchlistSignalAction('all');
    setWatchlistRisk('all');
    setWatchlistNews('all');
    setWatchlistSearch('');
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
      <div className="observe-command-bar" role="toolbar" aria-label={labels.commandBarAria}>
        <div className="observe-command-bar__inner">

          {/* Left: view mode toggles */}
          <div className="observe-command-bar__group" aria-label={labels.viewModeTogglesAria}>
            <button
              type="button"
              className={`observe-mode-btn${denseMode ? ' observe-mode-btn--active' : ''}`}
              onClick={() => setDenseMode((v) => !v)}
              aria-pressed={denseMode}
              title={labels.denseTitle}
            >
              {labels.dense}
            </button>
            <button
              type="button"
              className={`observe-mode-btn${focusMode ? ' observe-mode-btn--active' : ''}`}
              onClick={() => setFocusMode((v) => !v)}
              aria-pressed={focusMode}
              title={labels.focusTitle}
            >
              {labels.focus}
            </button>
          </div>

          <div className="observe-command-bar__divider" role="separator" />

          {/* Center: severity quick-filter chips */}
          <div className="observe-command-bar__group" aria-label={labels.severityFilterAria}>
            {(['all', 'CRITICAL', 'WARNING', 'WATCH', 'INFO'] as const).map((sev) => (
              <button
                key={sev}
                type="button"
                className={`observe-filter-chip${severityFilter === sev ? ' observe-filter-chip--active' : ''}${sev === 'CRITICAL' ? ' observe-filter-chip--danger' : sev === 'WARNING' ? ' observe-filter-chip--warning' : sev === 'WATCH' ? ' observe-filter-chip--info' : ''}`}
                onClick={() => setSeverityFilter(sev)}
                aria-pressed={severityFilter === sev}
              >
                {sev === 'all' ? labels.all : sev.charAt(0) + sev.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <div className="observe-command-bar__divider" role="separator" />

          {/* Asset class filter */}
          <div className="observe-command-bar__group" aria-label={labels.assetClassFilterAria}>
            {(['all', 'stock', 'etf', 'crypto'] as const).map((cls) => (
              <button
                key={cls}
                type="button"
                className={`observe-filter-chip${assetClassFilter === cls ? ' observe-filter-chip--active' : ''}`}
                onClick={() => setAssetClassFilter(cls)}
                aria-pressed={assetClassFilter === cls}
              >
                {cls === 'all' ? labels.allAssets : cls.toUpperCase()}
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
              placeholder={labels.symbolSearchPlaceholder}
              aria-label={labels.symbolSearchAria}
              type="search"
            />
          </div>

          {/* Right: actions */}
          <div className="observe-command-bar__group observe-command-bar__group--right">
            {feedHasFilters && (
              <button type="button" className="observe-mode-btn" onClick={clearFeedFilters} aria-label={labels.clearAllFiltersAria}>
                {labels.clear}
              </button>
            )}
            <Link href="/alerts" className="observe-mode-btn">{labels.alerts}</Link>
            <Link href="/invest/simulation?side=buy&intent=prepare" className="observe-mode-btn observe-mode-btn--primary">
              {labels.prepareSim}
            </Link>
          </div>
        </div>
      </div>

      {/* ── KPI Metric Rail ── */}
      <section className="observe-metric-rail" aria-label={labels.metricsAria}>
        <article className="observe-metric-card">
          <div className="observe-metric-card__label">{labels.regime}</div>
          <div className="observe-metric-card__value">{model.regime.label}</div>
        </article>
        <article className="observe-metric-card">
          <div className="observe-metric-card__label">{labels.confidence}</div>
          <div className="observe-metric-card__value">{(model.regime.confidence * 100).toFixed(0)}%</div>
        </article>
        <article className={`observe-metric-card${model.summary.criticalCount > 0 ? ' observe-metric-card--danger' : ''}`}>
          <div className="observe-metric-card__label">{labels.critical}</div>
          <div className="observe-metric-card__value">{model.summary.criticalCount}</div>
        </article>
        <article className="observe-metric-card">
          <div className="observe-metric-card__label">{labels.warning}</div>
          <div className="observe-metric-card__value">{model.summary.warningCount}</div>
        </article>
        <article className="observe-metric-card">
          <div className="observe-metric-card__label">{labels.watch}</div>
          <div className="observe-metric-card__value">{model.summary.watchCount}</div>
        </article>
        <article className={`observe-metric-card${tradeReadyCount > 0 ? ' observe-metric-card--success' : ''}`}>
          <div className="observe-metric-card__label">{labels.tradeReady}</div>
          <div className="observe-metric-card__value">{tradeReadyCount}</div>
        </article>
        <article className={`observe-metric-card${providerDegradedCount > 0 ? ' observe-metric-card--warning' : ''}`}>
          <div className="observe-metric-card__label">{labels.providerIssues}</div>
          <div className="observe-metric-card__value">{providerDegradedCount}</div>
        </article>

        {model.persistenceDegraded && (
          <p className="observe-metric-rail__notice" role="alert">
            {labels.persistenceDegraded}
          </p>
        )}
      </section>

      {/* ── Cockpit Panel Grid ── */}
      <section
        className={`observe-cockpit${denseMode ? ' observe-cockpit--dense' : ''}${focusMode ? ' observe-cockpit--focus' : ''}`}
        aria-label={labels.cockpitAria}
      >

        {/* Row 1: Critical Queue + Anomaly Radar */}
        <div className="observe-cockpit__row observe-cockpit__row--halves">

          {/* Critical Queue */}
          <article className="observe-panel">
            <div className="observe-panel__header">
              <div>
                <div className="section__eyebrow">{labels.criticalQueueEyebrow}</div>
                <h3 className="observe-panel__title">{labels.criticalQueueTitle}</h3>
              </div>
              <Link href="/alerts" className="button button--secondary observe-panel__action">
                {labels.alertCenter}
              </Link>
            </div>
            <div className="observe-panel__body">
              {criticalItems.length === 0 ? (
                <div className="aurox-empty-state aurox-empty-state--inline">
                  <p className="aurox-empty-state__title">{labels.noCriticalItemsTitle}</p>
                  <p className="text-muted" style={{ fontSize: '0.8rem' }}>{labels.noCriticalItemsBody}</p>
                </div>
              ) : (
                <div className="observe-feed observe-feed--compact">
                  {criticalItems.slice(0, denseMode ? 5 : 8).map((item) => (
                    <div key={item.id} className="observe-feed__item observe-feed__item--compact">
                      <span className={`status-pill status-pill--${severityTone(item.severity)}`}>{item.severity}</span>
                      <span className="observe-feed__item-title">{item.title}</span>
                      <Link href="/alerts" className="journal-action-link" aria-label={labels.inspectItemAria.replace('{{title}}', item.title)}>
                        {labels.inspect}
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="observe-panel__footer">
              <Link href="/alerts" className="journal-action-link">{labels.openFullAlertCenter}</Link>
            </div>
          </article>

          {/* Anomaly Radar */}
          <article className="observe-panel">
            <div className="observe-panel__header">
              <div>
                <div className="section__eyebrow">{labels.anomalyRadarEyebrow}</div>
                <h3 className="observe-panel__title">{labels.anomalyRadarTitle}</h3>
              </div>
            </div>
            <div className="observe-panel__body">
              {model.anomalies.length === 0 ? (
                <div className="aurox-empty-state aurox-empty-state--inline">
                  <p className="aurox-empty-state__title">{labels.noAnomaliesTitle}</p>
                  <p className="text-muted" style={{ fontSize: '0.8rem' }}>{labels.noAnomaliesBody}</p>
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
                        <Link href={item.inspectionHref} className="journal-action-link" aria-label={labels.inspectAnomalyAria.replace('{{symbol}}', item.assetSymbol ?? '')}>
                          →
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="observe-panel__footer">
              <Link href="/signals" className="journal-action-link">{labels.reviewSignalAnomalies}</Link>
            </div>
          </article>
        </div>

        {/* Row 2: Trade Readiness + Observer Feed + Timeline (3-col) */}
        <div className="observe-cockpit__row observe-cockpit__row--thirds">

          {/* Trade Readiness */}
          <article className="observe-panel">
            <div className="observe-panel__header">
              <div>
                <div className="section__eyebrow">{labels.tradeReadinessEyebrow}</div>
                <h3 className="observe-panel__title">{labels.tradeReadinessTitle}</h3>
              </div>
            </div>
            <div className="observe-panel__body">
              <div className="observe-action-stack">
                <Link href="/invest/simulation?side=buy&intent=prepare" className="button button--primary observe-action-stack__item">
                  {labels.prepareSimulationBuy}
                </Link>
                <Link href="/alerts" className="button button--secondary observe-action-stack__item">
                  {labels.inspectAlertCenter}
                </Link>
                <Link href="/signals" className="button button--secondary observe-action-stack__item">
                  {labels.openSignalDashboard}
                </Link>
                <Link href="/portfolio/intelligence" className="button button--secondary observe-action-stack__item">
                  {labels.portfolioIntelligence}
                </Link>
                <Link href="/invest/simulation/journal" className="button button--secondary observe-action-stack__item">
                  {labels.simulationJournal}
                </Link>
              </div>
              {tradeReadyCount > 0 && (
                <p className="text-muted observe-panel__note">
                  {labels.tradeReadyNote
                    .replace('{{count}}', String(tradeReadyCount))
                    .replace('{{plural}}', tradeReadyCount !== 1 ? 's' : '')}
                </p>
              )}
            </div>
            <div className="observe-panel__footer">
              <span className="status-pill status-pill--info" style={{ fontSize: '0.65rem' }}>{labels.simOnly}</span>
              <span className="status-pill status-pill--neutral" style={{ fontSize: '0.65rem' }}>{labels.liveLocked}</span>
            </div>
          </article>

          {/* Observer Feed */}
          {!focusMode && (
            <article className="observe-panel">
              <div className="observe-panel__header">
                <div>
                  <div className="section__eyebrow">{labels.observerEyebrow}</div>
                  <h3 className="observe-panel__title">{labels.observerTitle}</h3>
                </div>
              </div>
              <div className="observe-panel__body">
                <div className="observe-feed" aria-live="polite" aria-label={labels.observerFeedAria}>
                  {filteredFeed.length === 0 ? (
                    <div className="aurox-empty-state aurox-empty-state--inline">
                      <p className="aurox-empty-state__title">{labels.noObservationsMatchTitle}</p>
                      {feedHasFilters && (
                        <button type="button" className="button button--secondary" onClick={clearFeedFilters}>
                          {labels.clearFilters}
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
                          {item.source} · {(item.confidence * 100).toFixed(0)}% {labels.confidenceLabel}{item.assetSymbol ? ` · ${item.assetSymbol}` : ''}
                        </p>
                        <div className="aurox-action-row">
                          <Link href={getAssetInspectHref({ symbol: item.assetSymbol, assetClass: item.assetClass })} className="journal-action-link">
                            {labels.inspectShort}
                          </Link>
                          <Link href="/signals" className="journal-action-link">{labels.signals}</Link>
                          <Link href={buildSimulationTicketHref({ symbol: item.assetSymbol, assetClass: item.assetClass })} className="journal-action-link">
                            {labels.simulate}
                          </Link>
                          <button type="button" className="journal-action-link" onClick={() => setEventState(item.id, 'pin')} aria-label={labels.pinItemAria.replace('{{title}}', item.title)}>{labels.pin}</button>
                          <button type="button" className="journal-action-link" onClick={() => setEventState(item.id, 'read')} aria-label={labels.markReadItemAria.replace('{{title}}', item.title)}>{labels.read}</button>
                          <button type="button" className="journal-action-link" onClick={() => setEventState(item.id, 'dismiss')} aria-label={labels.dismissItemAria.replace('{{title}}', item.title)}>{labels.dismiss}</button>
                        </div>
                      </article>
                    ))
                  )}
                </div>
                {filteredFeed.length > 0 && (
                  <p className="text-muted observe-panel__note">
                    {labels.observationsCount
                      .replace('{{count}}', String(filteredFeed.length))
                      .replace('{{total}}', String(model.observerItems.length))}{' '}
                    {feedHasFilters && <button type="button" className="journal-action-link" onClick={clearFeedFilters}>{labels.clearFilters}</button>}
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
                  <div className="section__eyebrow">{labels.timelineEyebrow}</div>
                  <h3 className="observe-panel__title">{labels.timelineTitle}</h3>
                </div>
              </div>
              <div className="observe-panel__body">
                {model.timeline.length === 0 ? (
                  <div className="aurox-empty-state aurox-empty-state--inline">
                    <p className="aurox-empty-state__title">{labels.noTimelineEventsTitle}</p>
                    <p className="text-muted" style={{ fontSize: '0.8rem' }}>{labels.noTimelineEventsBody}</p>
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
                              {labels.view}
                            </Link>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
              <div className="observe-panel__footer">
                <Link href="/alerts" className="journal-action-link">{labels.fullEventLog}</Link>
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
                  <div className="section__eyebrow">{labels.crossAssetEyebrow}</div>
                  <h3 className="observe-panel__title">{labels.crossAssetTitle}</h3>
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
                        {item.symbols.join(', ')} · {(item.confidence * 100).toFixed(0)}% {labels.confidenceLabel} · {item.kind}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
              <div className="observe-panel__footer">
                <Link href="/market" className="journal-action-link">{labels.openMarketWorkstation}</Link>
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
                  <div className="section__eyebrow">{labels.watchlistEyebrow}</div>
                  <h3 className="observe-panel__title">{labels.watchlistTitle}</h3>
                </div>
              </div>
              <div className="observe-panel__body">
                {/* Watchlist filter toolbar */}
                <div className="aurox-toolbar" aria-label={labels.watchlistFiltersAria}>
                  <select className="market-graph__selector-input" value={watchlistSort} onChange={(e) => setWatchlistSort(e.target.value)} aria-label={labels.sortByAria}>
                    <option value="strongest_signal">{labels.sortStrongestSignal}</option>
                    <option value="highest_confidence">{labels.sortHighestConfidence}</option>
                    <option value="highest_risk">{labels.sortHighestRisk}</option>
                    <option value="biggest_mover">{labels.sortBiggestMover}</option>
                    <option value="newest_news">{labels.sortNewestNews}</option>
                    <option value="worst_provider_freshness">{labels.sortWorstFreshness}</option>
                  </select>
                  <select className="market-graph__selector-input" value={watchlistAssetClass} onChange={(e) => setWatchlistAssetClass(e.target.value)} aria-label={labels.filterAssetClassAria}>
                    <option value="all">{labels.allClasses}</option>
                    <option value="stock">{labels.stocks}</option>
                    <option value="etf">{labels.etfs}</option>
                    <option value="crypto">{labels.crypto}</option>
                  </select>
                  <select className="market-graph__selector-input" value={watchlistSignalAction} onChange={(e) => setWatchlistSignalAction(e.target.value)} aria-label={labels.filterSignalAria}>
                    <option value="all">{labels.allSignals}</option>
                    <option value="BUY">{labels.buy}</option>
                    <option value="SELL">{labels.sell}</option>
                    <option value="HOLD">{labels.hold}</option>
                  </select>
                  <select className="market-graph__selector-input" value={watchlistRisk} onChange={(e) => setWatchlistRisk(e.target.value)} aria-label={labels.filterRiskAria}>
                    <option value="all">{labels.allRisk}</option>
                    <option value="LOW">{labels.low}</option>
                    <option value="MEDIUM">{labels.medium}</option>
                    <option value="HIGH">{labels.high}</option>
                    <option value="EXTREME">{labels.extreme}</option>
                  </select>
                  <select className="market-graph__selector-input" value={watchlistNews} onChange={(e) => setWatchlistNews(e.target.value)} aria-label={labels.filterNewsAria}>
                    <option value="all">{labels.allNews}</option>
                    <option value="NEGATIVE">{labels.negative}</option>
                    <option value="NEUTRAL">{labels.neutral}</option>
                    <option value="POSITIVE">{labels.positive}</option>
                  </select>
                  <input
                    className="market-graph__selector-input"
                    value={watchlistSearch}
                    onChange={(e) => setWatchlistSearch(e.target.value)}
                    placeholder={labels.searchWatchlistPlaceholder}
                    aria-label={labels.searchWatchlistAria}
                  />
                  {watchlistHasFilters ? (
                    <button type="button" className="button button--secondary" onClick={clearWatchlistControls} aria-label={labels.clearWatchlistFiltersAria}>
                      {labels.clear}
                    </button>
                  ) : null}
                  <button type="button" className="button" onClick={applyWatchlistControls} disabled={isPending} aria-label={labels.saveViewAria}>
                    {isPending ? labels.saving : labels.saveView}
                  </button>
                </div>

                {model.watchlistIntelligence.length === 0 ? (
                  <div className="aurox-empty-state aurox-empty-state--inline">
                    <p className="aurox-empty-state__title">{labels.watchlistEmptyTitle}</p>
                    <p className="text-muted" style={{ fontSize: '0.8rem' }}>
                      {labels.watchlistEmptyBody}
                    </p>
                    <Link href="/invest/stocks" className="button button--secondary">{labels.browseStocks}</Link>
                  </div>
                ) : filteredWatchlist.length === 0 ? (
                  <div className="aurox-empty-state aurox-empty-state--inline">
                    <p className="aurox-empty-state__title">{labels.noAssetsMatchTitle}</p>
                    <p className="text-muted" style={{ fontSize: '0.8rem' }}>
                      {labels.noAssetsMatchBody}
                    </p>
                    <button type="button" className="button button--secondary" onClick={clearWatchlistControls}>{labels.clearFilters}</button>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table" style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th scope="col">{labels.colAsset}</th>
                          <th scope="col">{labels.colPrice}</th>
                          <th scope="col">{labels.colChange}</th>
                          <th scope="col">{labels.colSignal}</th>
                          <th scope="col">{labels.colConfidence}</th>
                          <th scope="col">{labels.colRisk}</th>
                          <th scope="col">{labels.colNews}</th>
                          <th scope="col">{labels.colFreshness}</th>
                          <th scope="col">{labels.colActions}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredWatchlist.map((item) => (
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
                                <Link href={item.actions.inspectHref} className="journal-action-link">{labels.inspectShort}</Link>
                                <Link href={item.actions.compareHref} className="journal-action-link">{labels.compare}</Link>
                                <Link href={item.actions.simulateHref} className="journal-action-link">{labels.simulate}</Link>
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
                <Link href="/invest/simulation?intent=prepare" className="journal-action-link">{labels.prepareSimulationFromWatchlist}</Link>
                <Link href="/portfolio/intelligence" className="journal-action-link">{labels.portfolioIntelligenceLink}</Link>
              </div>
            </article>
          </div>
        )}

      </section>
    </>
  );
}
