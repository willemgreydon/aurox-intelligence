import { buildAreaPath, buildLinePath, normalizeUnit } from '../../lib/charts/chart-geometry';
import type { VolatilityBand, VolatilityPulse as VolatilityPulseModel } from '../../lib/volatility-pulse';

/**
 * Volatility Pulse — 20-session rolling realized volatility, with the current
 * reading placed relative to the asset's OWN recent history (quiet / normal /
 * elevated / extreme). Answers "is this market unusually volatile — for itself?"
 * Server component; all math is done in the pure `computeVolatilityPulse`.
 */

const W = 480;
const H = 88;

const BAND_LABEL: Record<VolatilityBand, string> = {
  quiet: 'Quiet',
  normal: 'Normal',
  elevated: 'Elevated',
  extreme: 'Extreme',
};

export function VolatilityPulse({ pulse }: { pulse: VolatilityPulseModel }) {
  if (!pulse.hasData) {
    return (
      <div className="volpulse volpulse--empty" role="status">
        <p className="volpulse__empty-text">Not enough history to read volatility yet.</p>
      </div>
    );
  }

  const values = pulse.series.map((point) => point.volPct);
  const bounds = { min: 0, max: Math.max(pulse.maxVolPct, 1e-6), range: Math.max(pulse.maxVolPct, 1e-6) };
  const area = buildAreaPath(values, { width: W, height: H, bounds });
  const line = buildLinePath(values, { width: W, height: H, bounds });
  const markerPct = normalizeUnit(pulse.currentVolPct, pulse.minVolPct, pulse.maxVolPct);

  const summary = `Realized volatility ${pulse.currentVolPct.toFixed(1)}% — ${BAND_LABEL[pulse.band]} versus its own recent history (median ${pulse.medianVolPct.toFixed(1)}%).`;

  return (
    <div className={`volpulse volpulse--${pulse.band}`}>
      <div className="volpulse__head">
        <div className="volpulse__reading">
          <span className="volpulse__value">{pulse.currentVolPct.toFixed(1)}%</span>
          <span className="volpulse__label">annualized realized vol</span>
        </div>
        <span className="volpulse__band">{BAND_LABEL[pulse.band]}</span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="volpulse__svg" role="img" aria-label={summary} preserveAspectRatio="none">
        <path d={area} className="volpulse__area" />
        <path d={line} className="volpulse__line" />
      </svg>

      {/* Percentile bar: where the current reading sits within its own range. */}
      <div className="volpulse__range" aria-hidden="true">
        <div className="volpulse__range-track">
          <span className="volpulse__range-marker" style={{ left: `${(markerPct * 100).toFixed(1)}%` }} />
        </div>
        <div className="volpulse__range-labels">
          <span>{pulse.minVolPct.toFixed(0)}%</span>
          <span>median {pulse.medianVolPct.toFixed(0)}%</span>
          <span>{pulse.maxVolPct.toFixed(0)}%</span>
        </div>
      </div>

      <p className="volpulse__caption">
        20-session rolling realized volatility, ranked within the last {pulse.series.length} readings.
      </p>
    </div>
  );
}
