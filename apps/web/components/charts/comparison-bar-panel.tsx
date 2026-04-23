import type { ComparisonBar } from '../../lib/dashboard/analytics-fixtures';
import { ChartPanel } from './chart-panel';

type ComparisonBarPanelProps = {
  title: string;
  subtitle: string;
  items: ComparisonBar[];
};

export function ComparisonBarPanel({ title, subtitle, items }: ComparisonBarPanelProps) {
  if (items.length === 0) {
    return (
      <ChartPanel title={title} subtitle={subtitle} note="Comparison bar shell for factor, sector, or basket performance spreads.">
        <div className="table-panel__empty">No live comparison data is currently available.</div>
      </ChartPanel>
    );
  }

  const max = Math.max(...items.map((item) => Math.abs(item.value)), 1);

  return (
    <ChartPanel title={title} subtitle={subtitle} note="Comparison bar shell for factor, sector, or basket performance spreads.">
      <div className="comparison-bars">
        {items.map((item) => (
          <div key={item.label} className="comparison-bars__row">
            <span>{item.label}</span>
            <div className="comparison-bars__track">
              <div
                className={`comparison-bars__bar comparison-bars__bar--${item.tone}`}
                style={{ width: `${(Math.abs(item.value) / max) * 100}%` }}
              />
            </div>
            <strong>{item.value > 0 ? `+${item.value}` : item.value}</strong>
          </div>
        ))}
      </div>
    </ChartPanel>
  );
}
