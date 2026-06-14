type ConfidenceBand = 'high' | 'moderate' | 'low' | 'none';

type ConfidenceMeterProps = {
  label: string;
  /** Confidence on a 0–100 scale. */
  value: number;
  /** Render the threshold legend (collapsed by default). */
  showLegend?: boolean;
};

const BAND_LABEL: Record<ConfidenceBand, string> = {
  high: 'High',
  moderate: 'Moderate',
  low: 'Low',
  none: 'None',
};

// Thresholds per AUR-005 / confidence-score-rule.md: >=70 high, 40–69 moderate,
// >0 & <40 low, 0 none. Drives the semantic fill colour and the aria-label.
function bandFor(value: number): ConfidenceBand {
  if (value >= 70) return 'high';
  if (value >= 40) return 'moderate';
  if (value > 0) return 'low';
  return 'none';
}

export function ConfidenceMeter({ label, value, showLegend = false }: ConfidenceMeterProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const band = bandFor(clamped);
  const width = `${clamped}%`;

  return (
    <div className="confidence-meter" aria-label={`${label}: ${clamped}% — ${BAND_LABEL[band]} confidence`}>
      <div className="confidence-meter__header">
        <span>{label}</span>
        <strong>{clamped}%</strong>
      </div>
      <div className="confidence-meter__track">
        <div className={`confidence-meter__fill confidence-meter__fill--${band}`} style={{ width }} />
      </div>
      {showLegend ? (
        <details className="confidence-meter__legend">
          <summary>Confidence levels</summary>
          <ul className="confidence-meter__legend-list">
            <li><span className="confidence-meter__swatch confidence-meter__swatch--high" aria-hidden="true" />High — 70% and above</li>
            <li><span className="confidence-meter__swatch confidence-meter__swatch--moderate" aria-hidden="true" />Moderate — 40–69%</li>
            <li><span className="confidence-meter__swatch confidence-meter__swatch--low" aria-hidden="true" />Low — below 40%</li>
            <li><span className="confidence-meter__swatch confidence-meter__swatch--none" aria-hidden="true" />None — insufficient data</li>
          </ul>
        </details>
      ) : null}
    </div>
  );
}
