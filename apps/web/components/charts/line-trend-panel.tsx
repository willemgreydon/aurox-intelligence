import type { ReactNode } from 'react';
import type { SeriesPoint } from '../../lib/dashboard/analytics-fixtures';
import { ChartLegend } from './chart-legend';
import { ChartPanel } from './chart-panel';

type LineTrendPanelProps = {
  title: string;
  subtitle: string;
  points: SeriesPoint[];
  rail?: ReactNode;
};

function buildPath(values: number[], width: number, height: number) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);

  return values
    .map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
}

function buildPoints(values: number[], width: number, height: number) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);

  return values.map((value, index) => {
    const x = (index / Math.max(1, values.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  });
}

export function LineTrendPanel({ title, subtitle, points, rail }: LineTrendPanelProps) {
  if (points.length === 0) {
    return (
      <ChartPanel
        title={title}
        subtitle={subtitle}
        legend={<ChartLegend items={[{ label: 'Primary model', tone: 'a' }, { label: 'Benchmark', tone: 'b' }, { label: 'Confidence band', tone: 'neutral' }]} />}
        rail={rail}
        note="Prepared as a reusable line-trend shell for future chart-library or live-series integration."
      >
        <div className="table-panel__empty">No live trend series is currently available.</div>
      </ChartPanel>
    );
  }

  const primary = buildPath(points.map((point) => point.primary), 520, 220);
  const benchmark = buildPath(points.map((point) => point.benchmark ?? point.primary), 520, 220);
  const upper = buildPath(points.map((point) => point.upper ?? point.primary), 520, 220);
  const lower = buildPath(points.map((point) => point.lower ?? point.primary), 520, 220);
  const upperPoints = buildPoints(points.map((point) => point.upper ?? point.primary), 520, 220);
  const lowerPoints = buildPoints(points.map((point) => point.lower ?? point.primary), 520, 220).reverse();

  return (
    <ChartPanel
      title={title}
      subtitle={subtitle}
      legend={<ChartLegend items={[{ label: 'Primary model', tone: 'a' }, { label: 'Benchmark', tone: 'b' }, { label: 'Confidence band', tone: 'neutral' }]} />}
      rail={rail}
      note="Prepared as a reusable line-trend shell for future chart-library or live-series integration."
    >
      <div className="chart-canvas">
        <div className="chart-canvas__grid" aria-hidden="true" />
        <svg viewBox="0 0 520 220" className="chart-svg" role="img" aria-label={title}>
          <polygon points={[...upperPoints, ...lowerPoints].join(' ')} className="chart-svg__band" />
          <path d={benchmark} className="chart-svg__line chart-svg__line--benchmark" />
          <path d={primary} className="chart-svg__line chart-svg__line--primary" />
          <path d={upper} className="chart-svg__line chart-svg__line--ghost" />
          <path d={lower} className="chart-svg__line chart-svg__line--ghost" />
        </svg>
        <div className="chart-axis">
          {points.map((point) => (
            <span key={point.label}>{point.label}</span>
          ))}
        </div>
      </div>
    </ChartPanel>
  );
}
