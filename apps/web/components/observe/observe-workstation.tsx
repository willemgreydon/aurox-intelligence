'use client';

import { useMemo, useState } from 'react';
import type { ObserveViewModel } from '../../server/services/market-observation-service';

type Props = {
  model: ObserveViewModel;
};

function severityTone(severity: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  if (severity === 'CRITICAL') return 'danger';
  if (severity === 'WARNING') return 'warning';
  if (severity === 'WATCH') return 'info';
  if (severity === 'INFO') return 'success';
  return 'neutral';
}

export function ObserveWorkstation({ model }: Props) {
  const [sourceFilter, setSourceFilter] = useState<'all' | 'signal' | 'news' | 'risk' | 'provider' | 'portfolio' | 'anomaly'>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'CRITICAL' | 'WARNING' | 'WATCH' | 'INFO'>('all');
  const [assetClassFilter, setAssetClassFilter] = useState<'all' | 'stock' | 'etf' | 'crypto' | 'other'>('all');
  const [symbolSearch, setSymbolSearch] = useState('');

  const filteredFeed = useMemo(() => {
    return model.observerItems.filter((item) => {
      if (sourceFilter !== 'all' && item.source !== sourceFilter) return false;
      if (severityFilter !== 'all' && item.severity !== severityFilter) return false;
      if (assetClassFilter !== 'all' && (item.assetClass ?? 'other') !== assetClassFilter) return false;
      if (symbolSearch.trim().length > 0) {
        const q = symbolSearch.trim().toUpperCase();
        if (!(item.assetSymbol ?? '').toUpperCase().includes(q)) return false;
      }
      return true;
    });
  }, [assetClassFilter, model.observerItems, severityFilter, sourceFilter, symbolSearch]);

  const sortedWatchlist = useMemo(() => {
    return [...model.watchlistIntelligence].sort((a, b) => {
      const aSignal = a.confidence ?? 0;
      const bSignal = b.confidence ?? 0;
      return bSignal - aSignal;
    });
  }, [model.watchlistIntelligence]);

  return (
    <>
      <section className="dashboard-section">
        <div className="analytics-strip">
          <div className="analytics-stat"><div className="analytics-stat__label">Regime</div><div className="analytics-stat__value">{model.regime.label}</div></div>
          <div className="analytics-stat"><div className="analytics-stat__label">Regime confidence</div><div className="analytics-stat__value">{(model.regime.confidence * 100).toFixed(0)}%</div></div>
          <div className="analytics-stat"><div className="analytics-stat__label">Critical</div><div className="analytics-stat__value">{model.summary.criticalCount}</div></div>
          <div className="analytics-stat"><div className="analytics-stat__label">Warning</div><div className="analytics-stat__value">{model.summary.warningCount}</div></div>
          <div className="analytics-stat"><div className="analytics-stat__label">Watch</div><div className="analytics-stat__value">{model.summary.watchCount}</div></div>
        </div>
      </section>

      <section className="dashboard-section dashboard-section--tinted">
        <div className="analytics-two-grid">
          <article className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">AI Market Observer</div>
                <h3>Observation feed</h3>
                <p>Explainable observations from signal, risk, news, provider, anomaly, and portfolio inputs.</p>
              </div>
            </div>
            <div className="analytics-card__body">
              <div className="market-pagination__actions" style={{ marginBottom: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                <select className="market-graph__selector-input" value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as typeof sourceFilter)}>
                  <option value="all">All sources</option>
                  <option value="signal">Signal</option>
                  <option value="news">News</option>
                  <option value="risk">Risk</option>
                  <option value="provider">Provider</option>
                  <option value="portfolio">Portfolio</option>
                  <option value="anomaly">Anomaly</option>
                </select>
                <select className="market-graph__selector-input" value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value as typeof severityFilter)}>
                  <option value="all">All severities</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="WARNING">Warning</option>
                  <option value="WATCH">Watch</option>
                  <option value="INFO">Info</option>
                </select>
                <select className="market-graph__selector-input" value={assetClassFilter} onChange={(event) => setAssetClassFilter(event.target.value as typeof assetClassFilter)}>
                  <option value="all">All classes</option>
                  <option value="stock">Stocks</option>
                  <option value="etf">ETFs</option>
                  <option value="crypto">Crypto</option>
                  <option value="other">Other</option>
                </select>
                <input
                  className="market-graph__selector-input"
                  value={symbolSearch}
                  onChange={(event) => setSymbolSearch(event.target.value)}
                  placeholder="Search symbol"
                  aria-label="Search symbol"
                />
              </div>
              <div className="observe-feed">
                {filteredFeed.length === 0 ? (
                  <p className="text-muted">No observations match filters.</p>
                ) : filteredFeed.map((item) => (
                  <article key={item.id} className="observe-feed__item">
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'center' }}>
                      <strong>{item.title}</strong>
                      <span className={`status-pill status-pill--${severityTone(item.severity)}`}>{item.severity}</span>
                    </div>
                    <p className="text-muted">{item.reason}</p>
                    <p className="text-muted" style={{ fontSize: '0.75rem' }}>
                      Why am I seeing this? Source: {item.source}, confidence {(item.confidence * 100).toFixed(0)}%, asset {item.assetSymbol ?? 'n/a'}.
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </article>

          <article className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">Market Event Timeline</div>
                <h3>Newest events first</h3>
              </div>
            </div>
            <div className="analytics-card__body">
              <div className="observe-timeline">
                {model.timeline.length === 0 ? (
                  <p className="text-muted">No events available.</p>
                ) : model.timeline.slice(0, 24).map((event) => (
                  <article key={event.id} className="observe-timeline__item">
                    <span className={`status-pill status-pill--${severityTone(event.severity)}`}>{event.severity}</span>
                    <div>
                      <strong>{event.eventType.replaceAll('_', ' ')}</strong>
                      <p className="text-muted">{event.description}</p>
                      <p className="text-muted" style={{ fontSize: '0.74rem' }}>{new Date(event.timestamp).toLocaleString('en-US')}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="dashboard-section">
        <div className="analytics-two-grid">
          <article className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">Anomaly Radar</div>
                <h3>0-100 anomaly scoring</h3>
              </div>
            </div>
            <div className="analytics-card__body">
              <div className="observe-feed">
                {model.anomalies.length === 0 ? (
                  <p className="text-muted">Anomaly radar unavailable due to missing data.</p>
                ) : model.anomalies.slice(0, 18).map((item) => (
                  <article key={item.id} className="observe-feed__item">
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'center' }}>
                      <strong>{item.assetSymbol} · {item.anomalyType.replaceAll('_', ' ')}</strong>
                      <span className={`status-pill status-pill--${severityTone(item.severity)}`}>{item.anomalyScore.toFixed(0)}</span>
                    </div>
                    <p className="text-muted">{item.explanation}</p>
                  </article>
                ))}
              </div>
            </div>
          </article>

          <article className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">Trade Readiness Check</div>
                <h3>Simulation-only preflight</h3>
              </div>
            </div>
            <div className="analytics-card__body">
              {model.tradeReadiness.result ? (
                <>
                  <p><strong>{model.tradeReadiness.symbol}</strong> status: <span className={`status-pill status-pill--${severityTone(model.tradeReadiness.result.guardrailResult)}`}>{model.tradeReadiness.result.status}</span></p>
                  <ul className="observe-bullets">
                    {model.tradeReadiness.result.explanation.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                  <p className="text-muted">No orders are executed automatically. This only prepares simulation review.</p>
                </>
              ) : (
                <p className="text-muted">No readiness candidate available.</p>
              )}
            </div>
          </article>
        </div>
      </section>

      <section className="dashboard-section dashboard-section--tinted">
        <article className="analytics-card">
          <div className="analytics-card__header">
            <div>
              <div className="section__eyebrow">Watchlist Intelligence</div>
              <h3>Signal, risk, news, freshness</h3>
            </div>
          </div>
          <div className="analytics-card__body">
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Price</th>
                    <th>Change</th>
                    <th>Signal</th>
                    <th>Confidence</th>
                    <th>Risk</th>
                    <th>News</th>
                    <th>Freshness</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedWatchlist.map((item) => (
                    <tr key={item.symbol}>
                      <td>{item.symbol}</td>
                      <td>{item.priceLabel}</td>
                      <td>{item.changeLabel}</td>
                      <td>{item.signalAction}</td>
                      <td>{item.confidence === null ? 'n/a' : `${(item.confidence * 100).toFixed(0)}%`}</td>
                      <td>{item.riskScore === null ? 'n/a' : `${item.riskScore.toFixed(0)}/100`}</td>
                      <td>{item.newsSentiment === null ? 'n/a' : item.newsSentiment.toFixed(2)}</td>
                      <td>{item.freshnessLabel}</td>
                      <td>
                        <a href={item.actions.inspectHref}>inspect</a> · <a href={item.actions.compareHref}>compare</a> · <a href={item.actions.simulateHref}>simulate</a>
                      </td>
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
