import type { HeatmapRow } from '../../lib/dashboard/analytics-fixtures';
import { ChartPanel } from './chart-panel';

type HeatmapPanelProps = {
  title: string;
  subtitle: string;
  rows: HeatmapRow[];
};

function tone(value: number) {
  if (value >= 0.7) return 'positive';
  if (value >= 0.25) return 'neutral';
  if (value <= -0.1) return 'negative';
  return 'warning';
}

export function HeatmapPanel({ title, subtitle, rows }: HeatmapPanelProps) {
  if (rows.length === 0) {
    return (
      <ChartPanel title={title} subtitle={subtitle} note="Heatmap shell for correlation, regime strength, or cross-asset stress mapping.">
        <div className="table-panel__empty">No live heatmap data is currently available.</div>
      </ChartPanel>
    );
  }

  return (
    <ChartPanel title={title} subtitle={subtitle} note="Heatmap shell for correlation, regime strength, or cross-asset stress mapping.">
      <div className="heatmap">
        <div className="heatmap__header">
          <span />
          {rows[0]?.cells.map((cell) => (
            <span key={cell.label}>{cell.label}</span>
          ))}
        </div>
        {rows.map((row) => (
          <div key={row.label} className="heatmap__row">
            <span className="heatmap__label">{row.label}</span>
            {row.cells.map((cell) => (
              <span key={`${row.label}-${cell.label}`} className={`heatmap__cell heatmap__cell--${tone(cell.value)}`}>
                {cell.value.toFixed(2)}
              </span>
            ))}
          </div>
        ))}
      </div>
    </ChartPanel>
  );
}
