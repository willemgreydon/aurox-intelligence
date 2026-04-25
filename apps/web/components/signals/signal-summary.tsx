import { SignalScoreBadge } from './signal-score-badge';
import type { SignalScoreLabel, SignalVisualState } from './signal-score-types';

type SignalSummaryProps = {
  score: number;
  label: SignalScoreLabel;
  confidence: number;
  explanation: string;
  indicators: string[];
  visualState?: SignalVisualState;
};

export function SignalSummary({
  score,
  label,
  confidence,
  explanation,
  indicators,
  visualState,
}: SignalSummaryProps) {
  return (
    <div className="signal-summary">
      <SignalScoreBadge score={score} label={label} confidence={confidence} visualState={visualState} />
      <p className="signal-summary__explanation">{explanation}</p>
      {indicators.length > 0 ? (
        <p className="signal-summary__indicators" aria-label="Signal contributing indicators">
          Indicators: {indicators.join(' | ')}
        </p>
      ) : null}
    </div>
  );
}
