type SignalBreakdownPanelProps = {
  title: string;
  items: Array<{ label: string; value: string; tone: 'positive' | 'negative' | 'neutral' }>;
};

export function SignalBreakdownPanel({ title, items }: SignalBreakdownPanelProps) {
  return (
    <article className="analytics-card analytics-card--breakdown">
      <header className="analytics-card__header">
        <h3>{title}</h3>
      </header>
      <div className="signal-breakdown">
        {items.map((item) => (
          <div key={item.label} className="signal-breakdown__row">
            <span>{item.label}</span>
            <strong className={`signal-breakdown__value signal-breakdown__value--${item.tone}`}>{item.value}</strong>
          </div>
        ))}
      </div>
    </article>
  );
}
