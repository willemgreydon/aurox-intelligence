import type { SparkPoint } from '../../lib/dashboard/analytics-fixtures';
import { DeltaIndicator } from './delta-indicator';

type SparklineStatCardProps = {
  label: string;
  value: string;
  points: SparkPoint[];
  delta: {
    value: string;
    direction: 'up' | 'down' | 'flat';
    tone: 'positive' | 'negative' | 'neutral';
  };
};

function buildSparkPath(points: SparkPoint[]): string {
  if (points.length === 0) {
    return '';
  }

  const width = 160;
  const height = 48;
  const min = Math.min(...points.map((point) => point.value));
  const max = Math.max(...points.map((point) => point.value));
  const range = Math.max(1, max - min);

  return points
    .map((point, index) => {
      const x = (index / Math.max(1, points.length - 1)) * width;
      const y = height - ((point.value - min) / range) * height;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
}

export function SparklineStatCard({ label, value, points, delta }: SparklineStatCardProps) {
  const path = buildSparkPath(points);

  return (
    <article className="analytics-card analytics-card--spark">
      <div className="analytics-card__header">
        <div>
          <div className="analytics-stat__label">{label}</div>
          <div className="analytics-stat__value">{value}</div>
        </div>
        <DeltaIndicator {...delta} />
      </div>
      <svg viewBox="0 0 160 48" className="sparkline" role="img" aria-label={`${label} trend`}>
        <path d={path} className="sparkline__path" />
      </svg>
    </article>
  );
}
