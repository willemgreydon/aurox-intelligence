type OverlayTone = 'positive' | 'negative' | 'neutral';

function toneFor(score: number): OverlayTone {
  if (score > 0.05) return 'positive';
  if (score < -0.05) return 'negative';
  return 'neutral';
}

const TONE_META: Record<OverlayTone, { arrow: string; verdict: string; pill: string }> = {
  positive: { arrow: '▲', verdict: 'Risk supportive', pill: 'success' },
  negative: { arrow: '▼', verdict: 'Risk pressure', pill: 'danger' },
  neutral: { arrow: '—', verdict: 'Neutral', pill: 'neutral' },
};

/**
 * Macro risk overlay verdict (AUR-064). Adds a direction arrow + semantic pill + a
 * confidence read so the headline score carries visual encoding, not just text.
 */
export function MacroRiskOverlay({ score, confidence, note }: { score: number; confidence: number; note: string }) {
  const tone = toneFor(score);
  const meta = TONE_META[tone];
  const hasData = confidence > 0;

  return (
    <article className="analytics-card">
      <div className="section__eyebrow">Macro risk overlay</div>
      <h3 className="macro-regime-card__readout">
        <span className={`macro-regime-card__arrow macro-regime-card__arrow--${tone}`} aria-hidden="true">
          {meta.arrow}
        </span>
        <span>{hasData ? meta.verdict : 'Insufficient data'}</span>
        {hasData ? <span className={`status-pill status-pill--${meta.pill}`}>{meta.verdict}</span> : null}
      </h3>
      <p>{note}</p>
      <p className="simulation-form__meta">
        {hasData
          ? `Score ${score.toFixed(2)} (−1 pressure … +1 supportive) · Confidence ${(confidence * 100).toFixed(0)}%`
          : 'Macro signal confidence is currently zero — treat as no dominant signal.'}
      </p>
    </article>
  );
}
