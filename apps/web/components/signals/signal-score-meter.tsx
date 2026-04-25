import type { SignalVisualState } from './signal-score-types';

type SignalScoreMeterProps = {
  score: number;
  confidence: number;
  visualState: SignalVisualState;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function scorePercent(score: number) {
  return ((clamp(score, -1, 1) + 1) / 2) * 100;
}

function scoreLabel(score: number, visualState: SignalVisualState) {
  if (visualState === 'insufficient-data') return 'Insufficient data';
  return `${clamp(score, -1, 1).toFixed(2)} score`;
}

export function SignalScoreMeter({ score, confidence, visualState }: SignalScoreMeterProps) {
  const scoreFill = scorePercent(score);
  const confidenceFill = clamp(confidence, 0, 1) * 100;
  const toneClass =
    visualState === 'bullish'
      ? 'signal-score-meter--bullish'
      : visualState === 'bearish'
        ? 'signal-score-meter--bearish'
        : visualState === 'insufficient-data'
          ? 'signal-score-meter--insufficient'
          : 'signal-score-meter--neutral';

  return (
    <div className={`signal-score-meter ${toneClass}`} aria-label={`Signal meter: ${scoreLabel(score, visualState)}`}>
      <div className="signal-score-meter__row">
        <span>Score</span>
        <strong>{scoreLabel(score, visualState)}</strong>
      </div>
      <div className="signal-score-meter__track" aria-hidden="true">
        <div className="signal-score-meter__score-fill" style={{ width: `${scoreFill}%` }} />
      </div>
      <div className="signal-score-meter__row">
        <span>Confidence</span>
        <strong>{confidenceFill.toFixed(0)}%</strong>
      </div>
      <div className="signal-score-meter__track" aria-hidden="true">
        <div className="signal-score-meter__confidence-fill" style={{ width: `${confidenceFill}%` }} />
      </div>
    </div>
  );
}

