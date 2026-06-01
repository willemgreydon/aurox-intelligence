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
  /** Optional leading glyph/icon (decorative — keep it short, e.g. an emoji or small SVG). */
  icon?: ReactNode;
  /** Optional status pill rendered on the topline (a status, never a money value). */
  status?: {
    label: string;
    /** Maps to .status-pill--{tone}. */
    tone: 'live' | 'delayed' | 'degraded' | 'offline' | 'simulation' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  };
  /** Optional sparkline / chart area rendered beneath the value+detail block. */
  spark?: ReactNode;
  aside?: ReactNode;
};

/**
 * Executive-grade compact metric card. The topline carries an optional icon,
 * the label, and an optional status pill; value + detail never overlap because
 * the label truncates and the value wraps. `delta`, `spark`, and `aside` slots
 * are all optional and backward compatible with the original card.
 */
export function CompactStatCard({ label, value, detail, valueTone = 'neutral', delta, icon, status, spark, aside }: CompactStatCardProps) {
  return (
    <article className="analytics-card analytics-card--compact analytics-kpi">
      <div className="analytics-card__body">
        <div className="analytics-kpi__topline">
          {icon ? <span className="analytics-kpi__icon" aria-hidden="true">{icon}</span> : null}
          <div className="analytics-stat__label">{label}</div>
          {status ? <span className={`status-pill status-pill--xs status-pill--${status.tone}`}>{status.label}</span> : null}
        </div>
        <div className={`analytics-stat__value analytics-stat__value--${valueTone}`}>{value}</div>
        <p className="analytics-stat__detail">{detail}</p>
        {delta ? <DeltaIndicator {...delta} /> : null}
        {spark ? <div className="analytics-kpi__spark">{spark}</div> : null}
      </div>
      {aside ? <aside className="analytics-card__aside">{aside}</aside> : null}
    </article>
  );
}
