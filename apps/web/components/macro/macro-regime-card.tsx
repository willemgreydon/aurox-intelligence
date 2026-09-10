import type { CSSProperties } from 'react';

type RegimeTone = 'positive' | 'negative' | 'neutral';

function toneFor(score: number): RegimeTone {
  if (score > 0.05) return 'positive';
  if (score < -0.05) return 'negative';
  return 'neutral';
}

const TONE_META: Record<RegimeTone, { arrow: string; label: string; pill: string }> = {
  // Convention matches MacroRiskOverlay: positive = supportive (green), negative = pressure (red).
  positive: { arrow: '▲', label: 'Supportive', pill: 'success' },
  negative: { arrow: '▼', label: 'Pressure', pill: 'danger' },
  neutral: { arrow: '—', label: 'Neutral', pill: 'neutral' },
};

/**
 * Macro regime card (AUR-064). Encodes a signed −1..+1 regime score with a direction
 * arrow, semantic color, a diverging meter (centre = 0), and a scale legend so the raw
 * number is never shown unlabelled. When confidence is 0 the score is withheld and a
 * degraded state is shown instead of false precision.
 */
export function MacroRegimeCard({
  title,
  score,
  detail,
  confidence = 1,
}: {
  title: string;
  score: number;
  detail: string;
  confidence?: number;
}) {
  const hasData = confidence > 0;
  const tone = toneFor(score);
  const meta = TONE_META[tone];

  // Map −1..+1 to 0..100% for the meter; fill spans from centre (50%) to the marker.
  const pos = Math.min(100, Math.max(0, ((score + 1) / 2) * 100));
  const fillLeft = Math.min(50, pos);
  const fillWidth = Math.abs(pos - 50);
  const meterVars = {
    '--fill-left': `${fillLeft}%`,
    '--fill-width': `${fillWidth}%`,
    '--marker-pos': `${pos}%`,
  } as CSSProperties;

  return (
    <article className="analytics-card observation-regime-card gt-hover-lift">
      <div className="analytics-stat__label">{title}</div>

      {hasData ? (
        <>
          <div className="macro-regime-card__readout">
            <span className={`macro-regime-card__arrow macro-regime-card__arrow--${tone}`} aria-hidden="true">
              {meta.arrow}
            </span>
            <span className="analytics-stat__value">{score.toFixed(2)}</span>
            <span className={`status-pill status-pill--${meta.pill}`}>{meta.label}</span>
          </div>

          <div
            className="macro-meter"
            data-tone={tone}
            style={meterVars}
            role="img"
            aria-label={`Score ${score.toFixed(2)} on a scale from −1 (pressure) through 0 (neutral) to +1 (supportive)`}
          >
            <div className="macro-meter__track" />
            <div className="macro-meter__fill" />
            <div className="macro-meter__center" aria-hidden="true" />
            <div className="macro-meter__marker" aria-hidden="true" />
          </div>
          <div className="macro-meter__legend" aria-hidden="true">
            <span>−1 pressure</span>
            <span>0</span>
            <span>+1 supportive</span>
          </div>
        </>
      ) : (
        <p className="analytics-stat__footnote text-muted">Insufficient macro data — score unavailable.</p>
      )}

      <div className="analytics-stat__footnote">{detail}</div>
    </article>
  );
}
