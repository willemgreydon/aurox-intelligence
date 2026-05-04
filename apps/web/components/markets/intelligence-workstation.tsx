'use client';

import { useMemo, useState } from 'react';
import { Card } from '../ui/card';
import { LiveReadinessWidget } from '../broker/live-readiness-widget';
import type { MarketIntelligenceWorkstationModel } from '../../server/services/market-intelligence-workstation-service';

type Lane = 'Market Intelligence' | 'Simulation Trading' | 'Risk Governance' | 'News Intelligence' | 'Broker Readiness' | 'Portfolio';

const lanes: Lane[] = [
  'Market Intelligence',
  'Simulation Trading',
  'Risk Governance',
  'News Intelligence',
  'Broker Readiness',
  'Portfolio',
];

function laneExplanation(lane: Lane) {
  if (lane === 'News Intelligence') return 'News relevance, sentiment, and risk impacts are emphasized.';
  if (lane === 'Risk Governance') return 'Risk flags and simulation safety overlays are emphasized.';
  if (lane === 'Broker Readiness') return 'Readiness posture and execution lock constraints are emphasized.';
  if (lane === 'Portfolio') return 'Positioning context and cross-asset ranking posture are emphasized.';
  if (lane === 'Simulation Trading') return 'Simulation-eligible decisions are emphasized. Live stays locked.';
  return 'Balanced intelligence view across signals, news, and risk.';
}

export function MarketIntelligenceWorkstation({ model }: { model: MarketIntelligenceWorkstationModel }) {
  const [query, setQuery] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState(model.assets[0]?.symbol ?? '');
  const [lane, setLane] = useState<Lane>('Market Intelligence');

  const filteredAssets = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return model.assets;
    return model.assets.filter((asset) => asset.symbol.toLowerCase().includes(q) || asset.name.toLowerCase().includes(q));
  }, [model.assets, query]);

  const selected = useMemo(
    () => model.assets.find((asset) => asset.symbol === selectedSymbol) ?? filteredAssets[0] ?? model.assets[0],
    [filteredAssets, model.assets, selectedSymbol],
  );

  const selectedNews = selected ? model.newsBySymbol[selected.symbol] ?? [] : [];
  const selectedSystemState = selected
    ? model.systemState.assetStates.find((item) => item.symbol === selected.symbol)
    : null;
  const recommendation = selectedSystemState?.recommendation ?? null;
  const influentialNews = new Set(
    recommendation?.reasoning.newsDrivers.map((item) => item.toLowerCase()) ?? [],
  );

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div className="analytics-two-grid">
        <Card className="analytics-card">
          <div className="analytics-card__header">
            <div>
              <div className="section__eyebrow">Asset switcher</div>
              <h3>Asset search and selection</h3>
            </div>
          </div>
          <div className="analytics-card__body">
            <input
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="Search symbol or name"
            />
            <div style={{ display: 'grid', gap: '0.35rem', marginTop: '0.75rem', maxHeight: '15rem', overflow: 'auto' }}>
              {filteredAssets.map((asset) => (
                <button
                  key={asset.symbol}
                  type="button"
                  className="button button--secondary"
                  onClick={() => setSelectedSymbol(asset.symbol)}
                >
                  {asset.symbol} - {asset.name} ({asset.assetClass})
                </button>
              ))}
            </div>
          </div>
        </Card>

        <Card className="analytics-card">
          <div className="analytics-card__header">
            <div>
              <div className="section__eyebrow">Lane filter</div>
              <h3>Intelligence lane focus</h3>
              <p>{laneExplanation(lane)}</p>
            </div>
          </div>
          <div className="analytics-card__body" style={{ display: 'grid', gap: '0.5rem' }}>
            {lanes.map((laneItem) => (
              <button
                key={laneItem}
                type="button"
                className="button button--secondary"
                onClick={() => setLane(laneItem)}
                aria-pressed={lane === laneItem}
              >
                {laneItem}
              </button>
            ))}
          </div>
        </Card>
      </div>

      {selected ? (
        <>
          <div className="analytics-two-grid">
            <Card className="analytics-card">
              <div className="analytics-card__header">
                <div>
                  <div className="section__eyebrow">Main panel</div>
                  <h3>{selected.symbol}</h3>
                  <p>{selected.name}</p>
                </div>
              </div>
              <div className="analytics-card__body">
                <p>Price: {typeof selected.price === 'number' ? selected.price.toFixed(2) : 'n/a'}</p>
                <p>Change: {typeof selected.changePercent === 'number' ? `${selected.changePercent.toFixed(2)}%` : 'n/a'}</p>
                <p>Provider: {selected.provider}</p>
                <p>Freshness: {selected.freshnessLabel}</p>
                {recommendation ? (
                  <>
                    <p>Recommendation: <strong>{recommendation.action}</strong></p>
                    <p>Confidence: {(recommendation.confidence * 100).toFixed(0)}%</p>
                    <p>Risk level: {recommendation.riskLevel}</p>
                    {!recommendation.simulationAllowed ? (
                      <p className="simulation-form__meta simulation-form__meta--warning">
                        High risk detected. Manual confirmation is required for simulation.
                      </p>
                    ) : null}
                    <p>Suggested action: {recommendation.action} (confidence {recommendation.confidence.toFixed(2)})</p>
                  </>
                ) : null}
              </div>
            </Card>

            <Card className="analytics-card">
              <div className="analytics-card__header">
                <div>
                  <div className="section__eyebrow">Signal panel</div>
                  <h3>Composite and drivers</h3>
                </div>
              </div>
              <div className="analytics-card__body">
                <p>Composite score: {(selected.compositeScore * 100).toFixed(1)}%</p>
                <p>Trend: {selected.trendScore.toFixed(3)}</p>
                <p>Momentum: {selected.momentumScore.toFixed(3)}</p>
                <p>Volatility: {selected.volatilityScore.toFixed(3)}</p>
                <p>News impact score: {(selected.newsImpactScore * 100).toFixed(1)}%</p>
              </div>
            </Card>
          </div>

          <div className="analytics-two-grid">
            <Card className="analytics-card">
              <div className="analytics-card__header">
                <div>
                  <div className="section__eyebrow">News panel</div>
                  <h3>{selected.symbol} news</h3>
                </div>
              </div>
              <div className="analytics-card__body">
                <ul className="detail-slot-card__list">
                  {selectedNews.slice(0, 8).map((item) => (
                    <li key={item.id}>
                      <a href={item.url} target="_blank" rel="noreferrer">{item.title}</a>
                      {influentialNews.size > 0 && [...influentialNews].some((driver) => item.title.toLowerCase().includes(driver)) ? (
                        <span className="status-pill status-pill--warning">Influenced recommendation</span>
                      ) : null}
                      <p>{item.source} | sentiment {item.sentiment?.toFixed(2) ?? 'n/a'} | impact {item.impact?.toFixed(2) ?? 'n/a'} | {new Date(item.publishedAt).toLocaleString('en-US')}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>

            <Card className="analytics-card">
              <div className="analytics-card__header">
                <div>
                  <div className="section__eyebrow">Explanation panel</div>
                  <h3>Why this rank?</h3>
                </div>
              </div>
              <div className="analytics-card__body">
                <p>{selected.explanation}</p>
                <p>{selectedSystemState?.explanation ?? 'No orchestration explanation available.'}</p>
                <details>
                  <summary>Recommendation explanation</summary>
                  <p>{recommendation?.explanationText ?? 'No recommendation explanation available.'}</p>
                </details>
                <p>{model.systemState.explanation}</p>
                <p>Lane context: {laneExplanation(lane)}</p>
              </div>
            </Card>
          </div>
        </>
      ) : null}

      <LiveReadinessWidget
        status={model.systemState.readinessState.simulationReady ? 'WARNING' : 'FAILED'}
        whyLocked={model.systemState.readinessState.reason}
      />
    </div>
  );
}
