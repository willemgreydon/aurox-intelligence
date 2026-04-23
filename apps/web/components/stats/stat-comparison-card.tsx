import { DeltaIndicator } from './delta-indicator';

type StatComparisonCardProps = {
  title: string;
  currentLabel: string;
  currentValue: string;
  previousLabel: string;
  previousValue: string;
  delta: {
    value: string;
    direction: 'up' | 'down' | 'flat';
    tone: 'positive' | 'negative' | 'neutral';
  };
};

export function StatComparisonCard(props: StatComparisonCardProps) {
  return (
    <article className="analytics-card analytics-card--comparison">
      <header className="analytics-card__header">
        <h3>{props.title}</h3>
        <DeltaIndicator {...props.delta} />
      </header>
      <div className="comparison-stat">
        <div>
          <div className="comparison-stat__label">{props.currentLabel}</div>
          <div className="comparison-stat__value">{props.currentValue}</div>
        </div>
        <div>
          <div className="comparison-stat__label">{props.previousLabel}</div>
          <div className="comparison-stat__subvalue">{props.previousValue}</div>
        </div>
      </div>
    </article>
  );
}
