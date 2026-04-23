import { ChartPanel } from './chart-panel';

type BarChartItem = {
  label: string;
  value: number;
};

type BarChartPanelProps = {
  title: string;
  subtitle: string;
  items: BarChartItem[];
  note?: string;
};

export function BarChartPanel({ title, subtitle, items, note }: BarChartPanelProps) {
  if (items.length === 0) {
    return (
      <ChartPanel title={title} subtitle={subtitle} note={note}>
        <div className="table-panel__empty">No bar chart data is currently available.</div>
      </ChartPanel>
    );
  }

  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <ChartPanel title={title} subtitle={subtitle} note={note}>
      <div className="distribution-chart">
        {items.map((item) => (
          <div key={item.label} className="distribution-chart__bucket">
            <div className="distribution-chart__bar-wrap">
              <div
                className="distribution-chart__bar"
                style={{ height: `${(item.value / max) * 100}%` }}
                aria-hidden="true"
              />
            </div>
            <strong>{item.value.toFixed(0)}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </ChartPanel>
  );
}
