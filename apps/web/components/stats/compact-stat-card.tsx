import type { ReactNode } from 'react';
import { DeltaIndicator } from './delta-indicator';

type CompactStatCardProps = {
  label: string;
  value: string;
  detail: string;
  valueTone?: 'positive' | 'negative' | 'neutral';
  delta?: {
    value: string;
    direction: 'up' | 'down' | 'flat';
    tone: 'positive' | 'negative' | 'neutral';
  };
  aside?: ReactNode;
};

export function CompactStatCard({ label, value, detail, valueTone = 'neutral', delta, aside }: CompactStatCardProps) {
  return (
    <article className="analytics-card analytics-card--compact">
      <div className="analytics-card__body">
        <div className="analytics-stat__label">{label}</div>
        <div className={`analytics-stat__value analytics-stat__value--${valueTone}`}>{value}</div>
        <p className="analytics-stat__detail">{detail}</p>
        {delta ? <DeltaIndicator {...delta} /> : null}
      </div>
      {aside ? <aside className="analytics-card__aside">{aside}</aside> : null}
    </article>
  );
}
