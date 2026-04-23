import { ChartLegend } from './chart-legend';
import { ChartPanel } from './chart-panel';

type PriceHistoryPoint = {
  label: string;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
};

type PriceHistoryPanelProps = {
  title: string;
  subtitle: string;
  points: PriceHistoryPoint[];
  note?: string;
  rail?: React.ReactNode;
  emptyMessage?: string | null;
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

export function PriceHistoryPanel({ title, subtitle, points, note, rail, emptyMessage }: PriceHistoryPanelProps) {
  if (points.length < 2) {
    return (
      <ChartPanel title={title} subtitle={subtitle} note={note} rail={rail}>
        <div className="table-panel__empty">{emptyMessage ?? 'No price history is available yet.'}</div>
      </ChartPanel>
    );
  }

  const closes = points.map((point) => point.close);
  const highs = points.map((point) => point.high);
  const lows = points.map((point) => point.low);
  const closePath = buildPath(closes, 520, 220);
  const highPath = buildPath(highs, 520, 220);
  const lowPath = buildPath(lows, 520, 220);
  const axisPoints = points.filter((_, index) => index === 0 || index === points.length - 1 || index % Math.max(1, Math.floor(points.length / 4)) === 0);

  return (
    <ChartPanel
      title={title}
      subtitle={subtitle}
      legend={<ChartLegend items={[{ label: 'Close', tone: 'a' }, { label: 'High', tone: 'b' }, { label: 'Low', tone: 'neutral' }]} />}
      note={note}
      rail={rail}
    >
      <div className="chart-canvas">
        <div className="chart-canvas__grid" aria-hidden="true" />
        <svg viewBox="0 0 520 220" className="chart-svg" role="img" aria-label={title}>
          <path d={highPath} className="chart-svg__line chart-svg__line--benchmark" />
          <path d={lowPath} className="chart-svg__line chart-svg__line--ghost" />
          <path d={closePath} className="chart-svg__line chart-svg__line--primary" />
        </svg>
        <div className="chart-axis">
          {axisPoints.map((point) => (
            <span key={point.timestamp}>{point.label}</span>
          ))}
        </div>
      </div>
    </ChartPanel>
  );
}
