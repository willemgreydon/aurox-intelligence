import { StatusBadge } from '../ui/status-badge';
import type { SignalScoreLabel, SignalVisualState } from './signal-score-types';

type SignalScoreBadgeProps = {
  score: number;
  label: SignalScoreLabel;
  confidence: number;
  visualState?: SignalVisualState;
};

function toneForState(state: SignalVisualState): 'success' | 'warning' | 'danger' | 'info' {
  if (state === 'bullish') return 'success';
  if (state === 'bearish') return 'danger';
  if (state === 'insufficient-data') return 'warning';
  return 'info';
}

function resolveVisualState(
  label: SignalScoreLabel,
  visualState: SignalVisualState | undefined,
): SignalVisualState {
  if (visualState) return visualState;
  if (label === 'Strong Bullish' || label === 'Bullish') return 'bullish';
  if (label === 'Strong Bearish' || label === 'Bearish') return 'bearish';
  return 'neutral';
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function SignalScoreBadge({ score, label, confidence, visualState }: SignalScoreBadgeProps) {
  const clampedScore = clamp(score, -1, 1);
  const clampedConfidence = clamp(confidence, 0, 1);
  const state = resolveVisualState(label, visualState);
  const badgeText =
    state === 'insufficient-data'
      ? `${label} (insufficient data)`
      : `${label} (${clampedScore.toFixed(2)} | ${(clampedConfidence * 100).toFixed(0)}%)`;
  const ariaLabel =
    state === 'insufficient-data'
      ? `Signal is ${label}. Data is insufficient for a confident directional read.`
      : `Signal is ${label} with score ${clampedScore.toFixed(2)} and confidence ${(clampedConfidence * 100).toFixed(0)} percent.`;

  return (
    <span aria-label={ariaLabel}>
      <StatusBadge tone={toneForState(state)}>{badgeText}</StatusBadge>
    </span>
  );
}
