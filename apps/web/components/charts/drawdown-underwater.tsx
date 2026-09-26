import { buildLinePath, projectSeries } from '../../lib/charts/chart-geometry';
import type { DrawdownAnalytics } from '../../lib/portfolio-drawdown';

/**
 * Drawdown Underwater chart. The 0% line sits at the top; the shaded region
 * hangs below it, deepest at the equity trough, recovering to 0 whenever a prior
 * peak is reclaimed. Answers "how far below its high-water mark has the account
 * been, and is it recovered?" Server component; all math is done upstream in the
 * pure `computeDrawdownAnalytics`.
 */

const W = 720;
const H = 200;

function formatPct(value: number): string {
  return `${value <= 0 ? '' : '+'}${value.toFixed(1)}%`;
}

export function DrawdownUnderwater({ analytics }: { analytics: DrawdownAnalytics }) {
  if (!analytics.hasData) {
    return (
      <div className="drawdown drawdown--empty" role="status">
        <p className="drawdown__empty-text">
          Drawdown appears once at least two account snapshots are recorded.
        </p>
      </div>
    );
  }

  const values = analytics.series.map((point) => point.drawdownPct);
  const minDd = analytics.maxDrawdownPct; // most negative (<= 0)
  const pad = minDd === 0 ? 1 : Math.abs(minDd) * 0.08;
  const bounds = { min: minDd - pad, max: 0, range: 0 - (minDd - pad) };

  const points = projectSeries(values, { width: W, height: H, bounds });
  const curve = buildLinePath(values, { width: W, height: H, bounds });
  // Underwater fill: curve, then close UP to the 0% line (top edge).
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const area = `${curve} L ${last.x} 0 L ${first.x} 0 Z`;

  const summary = `Maximum drawdown ${formatPct(analytics.maxDrawdownPct)}, current ${formatPct(
    analytics.currentDrawdownPct,
  )}. ${analytics.atPeak ? 'Account is at its high-water mark.' : 'Account is below its high-water mark.'}`;

  return (
    <div className="drawdown">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="drawdown__svg"
        role="img"
        aria-label={summary}
        preserveAspectRatio="none"
      >
        {/* 0% high-water line */}
        <line x1={0} x2={W} y1={0.5} y2={0.5} className="drawdown__zero" />
        <path d={area} className="drawdown__area" />
        <path d={curve} className="drawdown__line" />
      </svg>
      <dl className="drawdown__stats">
        <div>
          <dt>Max drawdown</dt>
          <dd className="drawdown__stat drawdown__stat--negative">{formatPct(analytics.maxDrawdownPct)}</dd>
        </div>
        <div>
          <dt>Current</dt>
          <dd className={`drawdown__stat ${analytics.atPeak ? 'drawdown__stat--flat' : 'drawdown__stat--negative'}`}>
            {analytics.atPeak ? 'At peak' : formatPct(analytics.currentDrawdownPct)}
          </dd>
        </div>
        <div>
          <dt>Trough</dt>
          <dd className="drawdown__stat drawdown__stat--muted">{analytics.troughDate ?? '—'}</dd>
        </div>
      </dl>
    </div>
  );
}
