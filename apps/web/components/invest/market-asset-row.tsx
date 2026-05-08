import type { ReactNode } from 'react';
import { StatusBadge } from '../ui/status-badge';
import { MiniIndicatorChart } from '../charts/mini-indicator-chart';
import { cn } from '../../lib/utils';
import { SignalScoreBadge } from '../signals/signal-score-badge';
import type { SignalScoreLabel, SignalVisualState } from '../signals/signal-score-types';
import type { MiniIndicatorChartModel } from '../../lib/charts/mini-indicator-model';

type MarketAssetRowProps = {
  symbol: string;
  title: string;
  category: string;
  thesis: string;
  priceLabel: string;
  changeLabel: string;
  freshnessLabel: string;
  actionAvailability: 'available' | 'simulated' | 'planned' | 'unavailable';
  insightStance: 'positive' | 'negative' | 'neutral';
  sparkline?: number[];
  actions?: ReactNode;
  signal?: {
    score: number;
    label: SignalScoreLabel;
    confidence: number;
    visualState?: SignalVisualState;
    explanation?: string;
  };
  riskLabel?: 'Low' | 'Medium' | 'High' | 'Extreme';
  miniChartModel?: MiniIndicatorChartModel;
};

function mapTone(value: MarketAssetRowProps['actionAvailability']) {
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

export function MarketAssetRow(props: MarketAssetRowProps) {
  return (
    <article className="market-row">
      <div className="market-row__identity">
        <div className="market-row__symbol">{props.symbol}</div>
        <div className="market-row__title">{props.title}</div>
        <div className="market-row__meta">{props.category}</div>
      </div>

      <div className="market-row__price">{props.priceLabel}</div>
      <div
        className={cn(
          'market-row__move',
          props.insightStance === 'positive' && 'signal-breakdown__value--positive',
          props.insightStance === 'negative' && 'signal-breakdown__value--negative',
          props.insightStance === 'neutral' && 'signal-breakdown__value--neutral',
        )}
      >
        {props.changeLabel}
      </div>
      <div className="market-row__chart">
        <MiniIndicatorChart
          points={props.sparkline}
          label={`${props.symbol} trend`}
          signalScore={props.signal?.score}
          model={props.miniChartModel}
        />
      </div>
      <div className="market-row__freshness">{props.freshnessLabel}</div>
      <div className="market-row__status">
        <StatusBadge tone={mapTone(props.actionAvailability)}>{props.actionAvailability}</StatusBadge>
      </div>
      <div className="market-row__score">
        {props.signal ? (
          <SignalScoreBadge
            score={props.signal.score}
            label={props.signal.label}
            confidence={props.signal.confidence}
            visualState={props.signal.visualState}
          />
        ) : (
          <span className="market-row__meta">No signal</span>
        )}
      </div>
      <div className="market-row__confidence">
        Conf. {Math.round((props.signal?.confidence ?? 0) * 100)}%
      </div>
      <div className="market-row__risk">
        {props.riskLabel ? `Risk: ${props.riskLabel}` : 'Risk: n/a'}
      </div>
      <div className="market-row__actions">{props.actions}</div>
    </article>
  );
}
