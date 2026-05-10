import type { ReactNode } from 'react';
import Link from 'next/link';
import { StatusBadge } from '../ui/status-badge';
import { Card } from '../ui/card';
import { cn } from '../../lib/utils';
import { MiniIndicatorChart } from '../charts/mini-indicator-chart';
import { SignalSummary } from '../signals/signal-summary';
import type { SignalScoreLabel, SignalVisualState } from '../signals/signal-score-types';
import type { MiniIndicatorChartModel } from '../../lib/charts/mini-indicator-model';

type InvestableAssetCardProps = {
  href: string;
  title: string;
  symbol: string;
  thesis: string;
  priceLabel: string;
  changeLabel: string;
  freshnessLabel: string;
  actionAvailability: 'available' | 'simulated' | 'planned' | 'unavailable';
  insightStance: 'positive' | 'negative' | 'neutral';
  riskSummary: string;
  sparkline?: number[];
  categoryLabel?: string;
  actions?: ReactNode;
  signal?: {
    score: number;
    label: SignalScoreLabel;
    confidence: number;
    explanation: string;
    indicators: string[];
    visualState?: SignalVisualState;
  };
  riskLabel?: 'Low' | 'Medium' | 'High' | 'Extreme';
  miniChartModel?: MiniIndicatorChartModel;
};

function mapTone(value: InvestableAssetCardProps['actionAvailability']) {
  if (value === 'available') {
    return 'success' as const;
  }
  if (value === 'planned') {
    return 'warning' as const;
  }
  if (value === 'unavailable') {
    return 'danger' as const;
  }
  return 'info' as const;
}

export function InvestableAssetCard(props: InvestableAssetCardProps) {
  return (
    <Card className="analytics-card market-card">
      <div className="analytics-card__header">
        <div>
          <div className="section__eyebrow">{props.categoryLabel ?? props.symbol}</div>
          <h3>{props.title}</h3>
          <p className="market-card__symbol">{props.symbol}</p>
        </div>
        <StatusBadge tone={mapTone(props.actionAvailability)}>{props.actionAvailability}</StatusBadge>
      </div>
      <div className="comparison-stat market-card__quote-grid">
        <div>
          <div className="comparison-stat__label">Quote</div>
          <div className="comparison-stat__value">{props.priceLabel}</div>
        </div>
        <div>
          <div className="comparison-stat__label">Move</div>
          <div
            className={cn(
              'comparison-stat__subvalue',
              props.insightStance === 'positive' && 'signal-breakdown__value--positive',
              props.insightStance === 'negative' && 'signal-breakdown__value--negative',
              props.insightStance === 'neutral' && 'signal-breakdown__value--neutral',
            )}
          >
            {props.changeLabel}
          </div>
        </div>
        <div className="market-card__chart">
          <MiniIndicatorChart
            points={props.sparkline}
            label={`${props.symbol} trend`}
            signalScore={props.signal?.score}
            model={props.miniChartModel}
          />
        </div>
      </div>
      <div className="analytics-card__body">
        <p>{props.thesis}</p>
        <p className="market-card__meta-row">
          {props.riskLabel ? <span className="market-card__risk-badge">Risk: {props.riskLabel}</span> : null}
          <span className="market-card__freshness">Updated {props.freshnessLabel}</span>
        </p>
        {props.signal ? (
          <SignalSummary
            score={props.signal.score}
            label={props.signal.label}
            confidence={props.signal.confidence}
            explanation={props.signal.explanation}
            indicators={props.signal.indicators}
            visualState={props.signal.visualState}
          />
        ) : null}
        <div className="asset-card-actions">
          <div className="asset-card-actions__primary">
            <Link href={props.href} className="button button--secondary asset-card-action asset-card-action--inspect">
              Inspect
            </Link>
          </div>
          {props.actions}
        </div>
      </div>
    </Card>
  );
}
