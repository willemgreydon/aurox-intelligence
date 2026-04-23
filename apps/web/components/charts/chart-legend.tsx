type ChartLegendItem = {
  label: string;
  tone: 'a' | 'b' | 'c' | 'd' | 'e' | 'positive' | 'negative' | 'neutral';
};

type ChartLegendProps = {
  items: ChartLegendItem[];
};

export function ChartLegend({ items }: ChartLegendProps) {
  return (
    <ul className="chart-legend" aria-label="Chart legend">
      {items.map((item) => (
        <li key={item.label} className="chart-legend__item">
          <span className={`chart-legend__swatch chart-legend__swatch--${item.tone}`} aria-hidden="true" />
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
