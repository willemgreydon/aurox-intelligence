type HorizonComparisonBlockProps = {
  items: Array<{ horizon: string; bias: string; confidence: string }>;
};

export function HorizonComparisonBlock({ items }: HorizonComparisonBlockProps) {
  return (
    <article className="analytics-card analytics-card--horizons">
      <header className="analytics-card__header">
        <h3>Horizon comparison</h3>
      </header>
      <div className="horizon-grid">
        {items.map((item) => (
          <div key={item.horizon} className="horizon-grid__item">
            <div className="analytics-stat__label">{item.horizon}</div>
            <div className="comparison-stat__value">{item.bias}</div>
            <p className="analytics-stat__detail">{item.confidence}</p>
          </div>
        ))}
      </div>
    </article>
  );
}
