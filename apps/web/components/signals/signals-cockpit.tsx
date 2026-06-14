'use client';

import Link from 'next/link';
import { useId, useMemo, useState } from 'react';
import type { SignalsPageViewModel } from '../../server/mappers/analysis-mapper';
import { getAssetInspectHref } from '../../lib/market-routes';
import { buildSimulationPrepareHrefForAsset } from '../../lib/simulation-prepare-url';

type Props = { data: SignalsPageViewModel };

type TabId = 'current' | 'history' | 'accuracy' | 'roi' | 'news';

const TABS: { id: TabId; label: string }[] = [
  { id: 'current', label: 'Current Signals' },
  { id: 'history', label: 'Decision History' },
  { id: 'accuracy', label: 'Prediction Accuracy' },
  { id: 'roi', label: 'ROI by Signal Type' },
  { id: 'news', label: 'News Impact' },
];

type ActionFilter = 'all' | 'bullish' | 'neutral' | 'bearish';
type AssetClassFilter = 'all' | 'stock' | 'etf' | 'crypto';
type SortKey = 'symbol' | 'score' | 'confidence' | 'price';
type SortDir = 'asc' | 'desc';

function interpretationChipClass(interp: string) {
  if (interp === 'bullish') return 'observe-chip observe-chip--success';
  if (interp === 'bearish') return 'observe-chip observe-chip--danger';
  return 'observe-chip observe-chip--neutral';
}

function scoreColor(score: number) {
  if (score >= 0.2) return 'var(--status-success, #22c55e)';
  if (score <= -0.2) return 'var(--status-danger, #ef4444)';
  return 'var(--text-muted, #6b7280)';
}

export function SignalsCockpit({ data }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('current');
  const tablistBaseId = useId();
  const tabButtonId = (id: TabId) => `${tablistBaseId}-tab-${id}`;
  const tabPanelId = (id: TabId) => `${tablistBaseId}-panel-${id}`;

  // Roving-tabindex keyboard navigation across the tablist (WAI-ARIA tabs pattern).
  function onTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'Home' && event.key !== 'End') {
      return;
    }
    event.preventDefault();
    let nextIndex = index;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % TABS.length;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + TABS.length) % TABS.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = TABS.length - 1;
    const next = TABS[nextIndex];
    if (!next) return;
    setActiveTab(next.id);
    document.getElementById(tabButtonId(next.id))?.focus();
  }
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all');
  const [assetClassFilter, setAssetClassFilter] = useState<AssetClassFilter>('all');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const signals = data.signals;

  const filtered = useMemo(() => {
    const rows = signals.filter((s) => {
      if (actionFilter !== 'all' && s.interpretation !== actionFilter) return false;
      if (assetClassFilter !== 'all' && s.assetClass !== assetClassFilter) return false;
      if (search.trim()) {
        const q = search.trim().toUpperCase();
        if (!s.assetName.toUpperCase().includes(q)) return false;
      }
      return true;
    });

    const dir = sortDir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (sortKey === 'symbol') return dir * a.assetName.localeCompare(b.assetName);
      if (sortKey === 'confidence') return dir * (a.confidenceScore - b.confidenceScore);
      if (sortKey === 'price') return dir * ((a.latestPrice ?? 0) - (b.latestPrice ?? 0));
      return dir * ((a.score ?? 0) - (b.score ?? 0));
    });
  }, [signals, actionFilter, assetClassFilter, search, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'symbol' ? 'asc' : 'desc');
    }
  }

  function sortIndicator(key: SortKey) {
    if (sortKey !== key) return '';
    return sortDir === 'asc' ? ' ▲' : ' ▼';
  }

  const hasFilters = actionFilter !== 'all' || assetClassFilter !== 'all' || search.trim().length > 0;

  function clearFilters() {
    setActionFilter('all');
    setAssetClassFilter('all');
    setSearch('');
  }

  const bullishCount = signals.filter((s) => s.interpretation === 'bullish').length;
  const bearishCount = signals.filter((s) => s.interpretation === 'bearish').length;
  const neutralCount = signals.filter((s) => s.interpretation === 'neutral').length;
  const avgConfidence = signals.length > 0
    ? Math.round(signals.reduce((sum, s) => sum + s.confidenceScore, 0) / signals.length * 100)
    : 0;
  const highConfCount = signals.filter((s) => s.confidenceScore >= 0.7).length;
  const lowConfCount = signals.filter((s) => s.confidenceScore < 0.4).length;
  const avgScore = signals.length > 0
    ? (signals.reduce((sum, s) => sum + (s.score ?? 0), 0) / signals.length).toFixed(2)
    : '—';

  return (
    <>
      {/* ── Operator Command Bar ── */}
      <div className="observe-command-bar" role="toolbar" aria-label="Signal cockpit controls">
        <div className="observe-command-bar__inner">
          {/* Tab selector */}
          <div className="observe-command-bar__group" role="tablist" aria-label="Signal intelligence tabs">
            {TABS.map((tab, index) => {
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={tabButtonId(tab.id)}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={tabPanelId(tab.id)}
                  tabIndex={selected ? 0 : -1}
                  className={`observe-mode-btn${selected ? ' observe-mode-btn--active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                  onKeyDown={(event) => onTabKeyDown(event, index)}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="observe-command-bar__divider" role="separator" />

          {/* Action filter chips */}
          <div className="observe-command-bar__group" aria-label="Filter by signal direction">
            {(['all', 'bullish', 'neutral', 'bearish'] as const).map((dir) => (
              <button
                key={dir}
                type="button"
                aria-pressed={actionFilter === dir}
                className={`observe-filter-chip${actionFilter === dir ? ' observe-filter-chip--active' : ''}${dir === 'bearish' ? ' observe-filter-chip--danger' : dir === 'bullish' ? ' observe-filter-chip--info' : ''}`}
                onClick={() => setActionFilter(dir)}
              >
                {dir === 'all' ? 'All' : dir.charAt(0).toUpperCase() + dir.slice(1)}
              </button>
            ))}
          </div>

          <div className="observe-command-bar__divider" role="separator" />

          {/* Asset class chips */}
          <div className="observe-command-bar__group" aria-label="Filter by asset class">
            {(['all', 'stock', 'etf', 'crypto'] as const).map((cls) => (
              <button
                key={cls}
                type="button"
                aria-pressed={assetClassFilter === cls}
                className={`observe-filter-chip${assetClassFilter === cls ? ' observe-filter-chip--active' : ''}`}
                onClick={() => setAssetClassFilter(cls)}
              >
                {cls === 'all' ? 'All Classes' : cls.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="observe-command-bar__divider" role="separator" />

          {/* Symbol search */}
          <div className="observe-command-bar__search">
            <input
              className="observe-search-input"
              placeholder="Search symbol…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search signals by symbol"
            />
          </div>

          {hasFilters && (
            <button
              type="button"
              className="observe-mode-btn"
              onClick={clearFilters}
              aria-label="Clear all signal filters"
            >
              Clear
            </button>
          )}

          <div className="observe-command-bar__group observe-command-bar__group--right">
            <a href="/invest/simulation?intent=prepare" className="observe-mode-btn observe-mode-btn--primary">
              Prepare Sim
            </a>
          </div>
        </div>
      </div>

      {/* ── KPI Metric Rail ── */}
      <div className="observe-metric-rail" aria-label="Signal statistics">
        <div className="observe-metric-card observe-metric-card--success">
          <div className="observe-metric-card__label">Bullish</div>
          <div className="observe-metric-card__value">{bullishCount}</div>
        </div>
        <div className="observe-metric-card observe-metric-card--danger">
          <div className="observe-metric-card__label">Bearish</div>
          <div className="observe-metric-card__value">{bearishCount}</div>
        </div>
        <div className="observe-metric-card">
          <div className="observe-metric-card__label">Neutral</div>
          <div className="observe-metric-card__value">{neutralCount}</div>
        </div>
        <div className="observe-metric-card">
          <div className="observe-metric-card__label">Avg Confidence</div>
          <div className="observe-metric-card__value">{avgConfidence}%</div>
        </div>
        <div className="observe-metric-card observe-metric-card--success">
          <div className="observe-metric-card__label">High Conf ≥70%</div>
          <div className="observe-metric-card__value">{highConfCount}</div>
        </div>
        <div className="observe-metric-card observe-metric-card--warning">
          <div className="observe-metric-card__label">Low Conf &lt;40%</div>
          <div className="observe-metric-card__value">{lowConfCount}</div>
        </div>
        <div className="observe-metric-card">
          <div className="observe-metric-card__label">Avg Score</div>
          <div className="observe-metric-card__value">{avgScore}</div>
        </div>
      </div>

      {/* ── Tab Panels ── */}
      <div className="observe-cockpit">

        {/* CURRENT SIGNALS */}
        <div
          id={tabPanelId('current')}
          role="tabpanel"
          aria-labelledby={tabButtonId('current')}
          hidden={activeTab !== 'current'}
        >
          <div className="observe-cockpit__row--full">
            <div className="observe-panel">
              <div className="observe-panel__header">
                <span className="observe-panel__title">Current Signals</span>
                <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                  {filtered.length} of {signals.length} signals
                  {hasFilters && ' (filtered)'}
                </span>
              </div>
              <div className="observe-panel__body">
                {signals.length === 0 ? (
                  <div className="aurox-empty-state">
                    <p className="aurox-empty-state__title">No signals available yet</p>
                    <p className="aurox-empty-state__body">
                      Signal derivation requires tracked assets with sufficient price history.
                    </p>
                    <Link href="/observe" className="button button--secondary">Open Observer</Link>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="aurox-empty-state">
                    <p className="aurox-empty-state__title">No signals match your filters</p>
                    <p className="aurox-empty-state__body">Adjust the direction, asset class, or symbol filter above.</p>
                    <button type="button" className="button button--secondary" onClick={clearFilters}>Clear filters</button>
                  </div>
                ) : (
                  <div className="signals-table-wrap">
                    <table className="data-table signals-rank-table">
                      <thead>
                        <tr>
                          <th scope="col">
                            <button type="button" className="signals-sort-btn" onClick={() => toggleSort('symbol')} aria-label="Sort by symbol">
                              Symbol{sortIndicator('symbol')}
                            </button>
                          </th>
                          <th scope="col">Class</th>
                          <th scope="col">Direction</th>
                          <th scope="col">
                            <button type="button" className="signals-sort-btn" onClick={() => toggleSort('score')} aria-label="Sort by score">
                              Score{sortIndicator('score')}
                            </button>
                          </th>
                          <th scope="col">
                            <button type="button" className="signals-sort-btn" onClick={() => toggleSort('confidence')} aria-label="Sort by confidence">
                              Confidence{sortIndicator('confidence')}
                            </button>
                          </th>
                          <th scope="col" style={{ textAlign: 'right' }}>
                            <button type="button" className="signals-sort-btn signals-sort-btn--right" onClick={() => toggleSort('price')} aria-label="Sort by price">
                              Price{sortIndicator('price')}
                            </button>
                          </th>
                          <th scope="col">Reason</th>
                          <th scope="col">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((signal) => (
                          <tr key={signal.assetId}>
                            <td style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 600 }}>{signal.assetName}</td>
                            <td>
                              <span className="status-pill status-pill--neutral" style={{ fontSize: '0.7rem' }}>
                                {signal.assetClass?.toUpperCase() ?? '—'}
                              </span>
                            </td>
                            <td>
                              <span className={interpretationChipClass(signal.interpretation)} style={{ fontSize: '0.72rem' }}>
                                {signal.interpretationLabel}
                              </span>
                            </td>
                            <td>
                              <div className="signals-score-cell">
                                <span className="signals-score-cell__value" style={{ color: scoreColor(signal.score ?? 0) }}>
                                  {signal.scoreLabel}
                                </span>
                                <span className="signals-score-bar" aria-hidden="true">
                                  <span
                                    className={`signals-score-bar__fill signals-score-bar__fill--${signal.interpretation}`}
                                    style={{ width: `${Math.min(100, Math.abs(signal.score ?? 0) * 100)}%` }}
                                  />
                                </span>
                              </div>
                            </td>
                            <td>
                              <div className="signals-conf-cell">
                                <span className="signals-conf-cell__value">{Math.round(signal.confidenceScore * 100)}%</span>
                                <span className="signals-conf-bar" aria-hidden="true">
                                  <span
                                    className={`signals-conf-bar__fill${signal.confidenceScore >= 0.7 ? ' signals-conf-bar__fill--high' : signal.confidenceScore < 0.4 ? ' signals-conf-bar__fill--low' : ''}`}
                                    style={{ width: `${Math.round(signal.confidenceScore * 100)}%` }}
                                  />
                                </span>
                              </div>
                            </td>
                            <td style={{ textAlign: 'right', fontFamily: 'var(--font-family-mono)' }}>
                              {signal.latestPriceLabel}
                            </td>
                            <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '14rem' }}>
                              {signal.notes[0] ?? '—'}
                            </td>
                            <td>
                              <div className="aurox-action-row">
                                <Link
                                  href={getAssetInspectHref({ symbol: signal.assetName, assetClass: signal.assetClass })}
                                  className="journal-action-link"
                                  aria-label={`Inspect ${signal.assetName} in Observer`}
                                >
                                  Inspect
                                </Link>
                                <Link
                                  href={buildSimulationPrepareHrefForAsset({
                                    symbol: signal.assetName,
                                    assetClass: signal.assetClass,
                                    side: 'buy',
                                    source: 'signal',
                                  })}
                                  className="journal-action-link"
                                  aria-label={`Prepare simulation buy for ${signal.assetName}`}
                                >
                                  Prepare Buy
                                </Link>
                                <Link
                                  href={buildSimulationPrepareHrefForAsset({
                                    symbol: signal.assetName,
                                    assetClass: signal.assetClass,
                                    side: 'sell',
                                    source: 'signal',
                                  })}
                                  className="journal-action-link"
                                  aria-label={`Prepare simulation sell for ${signal.assetName}`}
                                >
                                  Prepare Sell
                                </Link>
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
                <span className="observe-panel__note">Signals are deterministic — same inputs produce the same outputs. Simulation only.</span>
                <Link href="/forecasts" className="observe-panel__action">View Forecasts →</Link>
              </div>
            </div>
          </div>
        </div>

        {/* DECISION HISTORY */}
        <div id={tabPanelId('history')} role="tabpanel" aria-labelledby={tabButtonId('history')} hidden={activeTab !== 'history'}>
          <div className="observe-cockpit__row--full">
            <div className="observe-panel">
              <div className="observe-panel__header">
                <span className="observe-panel__title">Decision History</span>
              </div>
              <div className="observe-panel__body">
                <div className="aurox-empty-state">
                  <p className="aurox-empty-state__title">No decision history yet</p>
                  <p className="aurox-empty-state__body">
                    Simulation trades linked to signals will appear here once you begin preparing orders.
                    Decision history tracks signal-to-order traceability.
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <Link href="/invest/simulation" className="button button--secondary">Open Simulation</Link>
                    <Link href="/invest/simulation#journal" className="button button--secondary">View Journal</Link>
                  </div>
                </div>
              </div>
              <div className="observe-panel__footer">
                <span className="observe-panel__note">Signal-to-order traceability is tracked per simulation order.</span>
                <Link href="/invest/simulation#journal" className="observe-panel__action">Open Journal →</Link>
              </div>
            </div>
          </div>
        </div>

        {/* PREDICTION ACCURACY */}
        <div id={tabPanelId('accuracy')} role="tabpanel" aria-labelledby={tabButtonId('accuracy')} hidden={activeTab !== 'accuracy'}>
          <div className="observe-cockpit__row--full">
            <div className="observe-panel">
              <div className="observe-panel__header">
                <span className="observe-panel__title">Prediction Accuracy</span>
              </div>
              <div className="observe-panel__body">
                <div className="aurox-empty-state">
                  <p className="aurox-empty-state__title">Prediction accuracy tracking not yet active</p>
                  <p className="aurox-empty-state__body">
                    This surface will show signal hit rates, direction accuracy, and confidence calibration
                    once enough simulation trades have been completed and evaluated against outcomes.
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <Link href="/invest/simulation#journal" className="button button--secondary">View Journal</Link>
                    <Link href="/portfolio/intelligence" className="button button--secondary">Portfolio Intel</Link>
                  </div>
                </div>
              </div>
              <div className="observe-panel__footer">
                <span className="observe-panel__note">Accuracy tracking requires completed simulation trades with logged outcomes.</span>
              </div>
            </div>
          </div>
        </div>

        {/* ROI BY SIGNAL TYPE */}
        <div id={tabPanelId('roi')} role="tabpanel" aria-labelledby={tabButtonId('roi')} hidden={activeTab !== 'roi'}>
          <div className="observe-cockpit__row--full">
            <div className="observe-panel">
              <div className="observe-panel__header">
                <span className="observe-panel__title">ROI by Signal Type</span>
              </div>
              <div className="observe-panel__body">
                <div className="aurox-empty-state">
                  <p className="aurox-empty-state__title">ROI attribution not yet active</p>
                  <p className="aurox-empty-state__body">
                    ROI by signal type requires completed simulation trades with outcomes.
                    Start by preparing and executing simulated orders linked to signal decisions.
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <Link href="/invest/simulation" className="button button--secondary">Open Simulation</Link>
                    <Link href="/invest/stocks" className="button button--secondary">Browse Stocks</Link>
                  </div>
                </div>
              </div>
              <div className="observe-panel__footer">
                <span className="observe-panel__note">Past simulation returns do not guarantee future results. Simulation only.</span>
              </div>
            </div>
          </div>
        </div>

        {/* NEWS IMPACT */}
        <div id={tabPanelId('news')} role="tabpanel" aria-labelledby={tabButtonId('news')} hidden={activeTab !== 'news'}>
          <div className="observe-cockpit__row--full">
            <div className="observe-panel">
              <div className="observe-panel__header">
                <span className="observe-panel__title">News Impact Analysis</span>
              </div>
              <div className="observe-panel__body">
                <div className="aurox-empty-state">
                  <p className="aurox-empty-state__title">News impact analysis not yet active</p>
                  <p className="aurox-empty-state__body">
                    This surface will correlate news sentiment shocks with signal movements.
                    News impact analysis requires live observation data from the Observer feed.
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <Link href="/observe" className="button button--secondary">Open Observer</Link>
                    <Link href="/alerts" className="button button--secondary">Alert Center</Link>
                  </div>
                </div>
              </div>
              <div className="observe-panel__footer">
                <span className="observe-panel__note">News impact correlation requires Observer feed integration.</span>
                <Link href="/observe" className="observe-panel__action">Open Observer →</Link>
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
