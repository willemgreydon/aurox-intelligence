import { ChartPanel } from './chart-panel';

type DonutSegment = {
  label: string;
  value: number;
  tone: 'positive' | 'negative' | 'neutral';
};

type DonutChartPanelProps = {
  title: string;
  subtitle: string;
  segments: DonutSegment[];
  note?: string;
};

function toneColor(tone: DonutSegment['tone']) {
  if (tone === 'positive') {
    return 'var(--chart-positive)';
  }
  if (tone === 'negative') {
    return 'var(--chart-negative)';
  }

  return 'var(--chart-neutral)';
}

export function DonutChartPanel({ title, subtitle, segments, note }: DonutChartPanelProps) {
  if (segments.length === 0) {
    return (
      <ChartPanel title={title} subtitle={subtitle} note={note}>
        <div className="table-panel__empty">No donut chart data is currently available.</div>
      </ChartPanel>
    );
  }

  const total = Math.max(segments.reduce((sum, segment) => sum + segment.value, 0), 1);
  let offset = 0;

  return (
    <ChartPanel title={title} subtitle={subtitle} note={note}>
      <div className="donut-chart">
        <svg viewBox="0 0 120 120" className="donut-chart__svg" role="img" aria-label={title}>
          {segments.map((segment) => {
            const circumference = 2 * Math.PI * 42;
            const length = (segment.value / total) * circumference;
            const strokeDasharray = `${length} ${circumference - length}`;
            const strokeDashoffset = -offset;
            offset += length;

            return (
              <circle
                key={segment.label}
                cx="60"
                cy="60"
                r="42"
                fill="transparent"
                stroke={toneColor(segment.tone)}
                strokeWidth="12"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                transform="rotate(-90 60 60)"
              />
            );
          })}
        </svg>
        <div className="donut-chart__legend">
          {segments.map((segment) => (
            <div key={segment.label} className="donut-chart__legend-item">
              <span className={`chart-legend__swatch chart-legend__swatch--${segment.tone}`} />
              <strong>{segment.label}</strong>
              <span>{segment.value}</span>
            </div>
          ))}
        </div>
      </div>
    </ChartPanel>
  );
}
