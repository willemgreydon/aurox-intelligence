type AnomalyPanelProps = {
  title: string;
  items: Array<{ label: string; detail: string }>;
};

export function AnomalyPanel({ title, items }: AnomalyPanelProps) {
  return (
    <article className="analytics-card analytics-card--anomaly">
      <header className="analytics-card__header">
        <h3>{title}</h3>
      </header>
      <div className="anomaly-list">
        {items.map((item) => (
          <div key={item.label} className="anomaly-list__item">
            <strong>{item.label}</strong>
            <p>{item.detail}</p>
          </div>
        ))}
      </div>
    </article>
  );
}
