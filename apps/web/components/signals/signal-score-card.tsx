import { Card } from '../ui/card';
import { SignalScoreBadge } from './signal-score-badge';
import { SignalScoreMeter } from './signal-score-meter';
import type { SignalScorePresentation } from './signal-score-types';

type SignalScoreCardProps = {
  title?: string;
  signal: SignalScorePresentation;
  indicators?: string[];
};

export function SignalScoreCard({
  title = 'Signal score',
  signal,
  indicators = [],
}: SignalScoreCardProps) {
  return (
    <Card className="analytics-card analytics-card--signal-score">
      <div className="analytics-card__header">
        <div>
          <div className="section__eyebrow">Signal</div>
          <h3>{title}</h3>
        </div>
        <SignalScoreBadge
          score={signal.score}
          label={signal.label}
          confidence={signal.confidence}
          visualState={signal.visualState}
        />
      </div>
      <div className="analytics-card__body">
        <SignalScoreMeter
          score={signal.score}
          confidence={signal.confidence}
          visualState={signal.visualState}
        />
        <p>{signal.explanation}</p>
        {indicators.length > 0 ? (
          <p className="signal-summary__indicators" aria-label="Signal contributing indicators">
            Indicators: {indicators.join(' | ')}
          </p>
        ) : null}
      </div>
    </Card>
  );
}

