import {
  buildAreaPath,
  buildLinePath,
  clamp,
  computeBounds,
  inferTrend,
  movingAverage,
  trendFromSignalScore,
  yFor,
} from '../../lib/charts/chart-geometry';

type MiniSparklineProps = {
  points: number[] | null | undefined;
  label: string;
  trend?: 'up' | 'down' | 'flat';
  signalScore?: number;
  showMovingAverage?: boolean;
};

export function MiniSparkline({
  points,
  label,
  trend,
  signalScore,
  showMovingAverage = true,
}: MiniSparklineProps) {
  const normalized = (points ?? []).filter((value) => Number.isFinite(value));
  // Color/trend precedence: an explicit `trend` wins; otherwise the deterministic
  // signal score drives the tone (so a bearish signal on a price-up series renders
  // bearish, matching the signal label shown alongside the chart); price action is
  // the final fallback when no signal is supplied.
  const resolvedTrend =
    trend ?? (typeof signalScore === 'number' ? trendFromSignalScore(signalScore) : inferTrend(normalized));

  if (normalized.length < 2) {
    return (
      <div className="mini-sparkline mini-sparkline--empty" role="img" aria-label={`${label} trend unavailable`}>
        <span />
      </div>
    );
  }

  const width = 120;
  const height = 34;
  const geom = { width, height, clampY: true } as const;
  const linePath = buildLinePath(normalized, geom);
  const areaPath = buildAreaPath(normalized, geom);
  const movingAveragePath =
    showMovingAverage && normalized.length >= 3
      ? buildLinePath(movingAverage(normalized, 5), geom)
      : '';
  const lastPoint = normalized.at(-1);
  const bounds = computeBounds(normalized);
  const markerY = typeof lastPoint === 'number' ? yFor(lastPoint, bounds, height) : height;
  const markerX = width;

  return (
    <div className={`mini-sparkline mini-sparkline--${resolvedTrend}`}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${label} mini trend with last price marker`}>
        <path d={areaPath} className="mini-sparkline__area" />
        <path d={linePath} className="mini-sparkline__line" />
        {movingAveragePath ? <path d={movingAveragePath} className="mini-sparkline__ma" /> : null}
        <circle cx={markerX} cy={clamp(markerY, 0, height)} r="2" className="mini-sparkline__marker" />
      </svg>
    </div>
  );
}
