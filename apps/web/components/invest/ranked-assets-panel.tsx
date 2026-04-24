'use client';

import { useId, useState } from 'react';
import type { AssetRanking } from '@repo/api-contracts';
import { StatusBadge } from '../ui/status-badge';

type RankedAssetsPanelProps = {
  items: AssetRanking[];
};

function mapRecommendationTone(
  recommendation: AssetRanking['recommendation'],
): 'success' | 'warning' | 'danger' | 'info' {
  if (recommendation === 'strong_buy' || recommendation === 'buy') {
    return 'success';
  }

  if (recommendation === 'strong_sell' || recommendation === 'sell') {
    return 'danger';
  }

  if (recommendation === 'hold') {
    return 'info';
  }

  return 'warning';
}

function toSentenceList(explanation: string): string[] {
  const parts = explanation
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [explanation];
}

function getTopReason(explanation: string): string {
  return toSentenceList(explanation)[0] ?? explanation;
}

function buildCaveats(item: AssetRanking): string[] {
  const caveats: string[] = [];
  const explanation = item.explanation.toLowerCase();
  const signal = item.signalSummary.toLowerCase();

  if (item.confidence <= 0.35) {
    caveats.push('Low confidence output. Use as context, not a standalone decision trigger.');
  }

  if (explanation.includes('fallback') || explanation.includes('missing critical market data')) {
    caveats.push('Partial data path used; score quality may be reduced.');
  }

  if (signal.includes('no price movement data')) {
    caveats.push('Price-movement input is incomplete for this asset.');
  }

  return caveats;
}

export function RankedAssetsPanel({ items }: RankedAssetsPanelProps) {
  const [expandedAssetId, setExpandedAssetId] = useState<string | null>(null);
  const idPrefix = useId();

  return (
    <div className="market-ranking" role="list" aria-label="Market ranking list">
      {items.map((item) => {
        const isOpen = expandedAssetId === item.assetId;
        const detailsId = `${idPrefix}-${item.assetId}`;
        const explanationBullets = toSentenceList(item.explanation);
        const caveats = buildCaveats(item);

        return (
          <article key={item.assetId} className="market-ranking__row" role="listitem">
            <div className="market-ranking__summary">
              <div className="market-ranking__rank">#{item.rank}</div>
              <div className="market-ranking__identity">
                <strong>{item.symbol}</strong>
                <span>{item.assetKind.toUpperCase()}</span>
              </div>
              <div className="market-ranking__recommendation">
                <StatusBadge tone={mapRecommendationTone(item.recommendation)}>
                  {item.recommendation.replace('_', ' ')}
                </StatusBadge>
              </div>
              <div className="market-ranking__metric">
                <span>Score</span>
                <strong>{item.score.toFixed(3)}</strong>
              </div>
              <div className="market-ranking__metric">
                <span>Confidence</span>
                <strong>{(item.confidence * 100).toFixed(0)}%</strong>
              </div>
              <p className="market-ranking__reason">{getTopReason(item.explanation)}</p>
              <p className="market-ranking__signal">{item.signalSummary}</p>
              <p className="market-ranking__risk">{item.riskSummary}</p>
              <button
                type="button"
                className="button button--secondary market-ranking__toggle"
                aria-expanded={isOpen}
                aria-controls={detailsId}
                onClick={() => setExpandedAssetId(isOpen ? null : item.assetId)}
              >
                {isOpen ? 'Hide details' : 'View details'}
              </button>
            </div>

            <div
              id={detailsId}
              className="market-ranking__details"
              hidden={!isOpen}
              aria-live="polite"
            >
              {isOpen ? (
                <div className="market-ranking__details-grid">
                  <section className="market-ranking__block">
                    <h4>Explanation bullets</h4>
                    <ul className="market-ranking__bullets">
                      {explanationBullets.map((bullet, index) => (
                        <li key={`${item.assetId}-exp-${index}`}>{bullet}</li>
                      ))}
                    </ul>
                  </section>

                  <section className="market-ranking__block">
                    <h4>Signal summary</h4>
                    <p>{item.signalSummary}</p>
                    <h4>Factor summary</h4>
                    <p>{item.factorSummary}</p>
                    <h4>Regime summary</h4>
                    <p>{item.regimeSummary}</p>
                    <h4>Risk summary</h4>
                    <p>{item.riskSummary}</p>
                  </section>

                  {caveats.length > 0 ? (
                    <section className="market-ranking__block market-ranking__block--caveat">
                      <h4>Data caveats</h4>
                      <ul className="market-ranking__bullets">
                        {caveats.map((caveat, index) => (
                          <li key={`${item.assetId}-caveat-${index}`}>{caveat}</li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                </div>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
