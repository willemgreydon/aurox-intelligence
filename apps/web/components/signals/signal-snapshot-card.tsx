import { ConfidenceMeter } from '../stats/confidence-meter';
import { DeltaIndicator } from '../stats/delta-indicator';

type SignalSnapshotCardProps = {
  title: string;
  score: string;
  direction: 'up' | 'down' | 'flat';
  tone: 'positive' | 'negative' | 'neutral';
  description: string;
  confidence: number;
};

export function SignalSnapshotCard(props: SignalSnapshotCardProps) {
  return (
    <article className="analytics-card analytics-card--signal">
      <header className="analytics-card__header">
        <div>
          <div className="analytics-stat__label">Signal snapshot</div>
          <h3>{props.title}</h3>
        </div>
        <DeltaIndicator value={props.score} direction={props.direction} tone={props.tone} />
      </header>
      <p className="analytics-stat__detail">{props.description}</p>
      <ConfidenceMeter label="Confidence" value={props.confidence} />
    </article>
  );
}
