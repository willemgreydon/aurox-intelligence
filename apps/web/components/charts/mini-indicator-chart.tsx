import type { MiniIndicatorChartModel } from '../../lib/charts/mini-indicator-model';

type MiniIndicatorChartProps = {
  points: number[] | null | undefined;
  label: string;
  signalScore?: number;
  model?: MiniIndicatorChartModel;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalizePoints(points: number[] | null | undefined): number[] {
  return (points ?? []).filter((value) => Number.isFinite(value));
}

function buildPath(points: number[], width: number, height: number, min: number, range: number) {
  if (points.length === 0) {
    return '';
  }

  return points
    .map((value, index) => {
      const x = (index / Math.max(1, points.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${index === 0 ? 'M' : 'L'} ${x} ${clamp(y, 0, height)}`;
    })
    .join(' ');
}

function buildAreaPath(points: number[], width: number, height: number, min: number, range: number) {
  const line = buildPath(points, width, height, min, range);
  if (!line) return '';
  return `${line} L ${width} ${height} L 0 ${height} Z`;
}

function inferTrend(points: number[]): 'up' | 'down' | 'flat' {
  if (points.length < 2) return 'flat';
  const first = points[0] ?? 0;
  const last = points.at(-1) ?? first;
  const delta = last - first;
  if (Math.abs(delta) <= 1e-6) return 'flat';
  return delta > 0 ? 'up' : 'down';
}

export function MiniIndicatorChart({ points, label, signalScore, model }: MiniIndicatorChartProps) {
  const normalized = normalizePoints(points);
  const resolvedModel: MiniIndicatorChartModel = model ?? {
    points: normalized.slice(-24),
    movingAveragePoints: [],
    volatilityUpperBand: [],
    volatilityLowerBand: [],
    signalMarkerValue: normalized.at(-1) ?? null,
    signalScore: typeof signalScore === 'number' ? clamp(signalScore, -1, 1) : null,
    summary: 'Indicator overlays unavailable.',
    hasInsufficientData: normalized.length < 5,
  };

  if (resolvedModel.points.length < 2) {
    return (
      <div
        className="mini-sparkline mini-sparkline--empty"
        role="img"
        aria-label={`${label} unavailable. Insufficient data.`}
      >
        <span />
      </div>
    );
  }

  const width = 120;
  const height = 34;
  const allValues = [
    ...resolvedModel.points,
    ...resolvedModel.movingAveragePoints,
    ...resolvedModel.volatilityUpperBand,
    ...resolvedModel.volatilityLowerBand,
  ].filter((value) => Number.isFinite(value));
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = Math.max(1, max - min);
  const trend = inferTrend(resolvedModel.points);

  const priceAreaPath = buildAreaPath(resolvedModel.points, width, height, min, range);
  const priceLinePath = buildPath(resolvedModel.points, width, height, min, range);
  const maPath = buildPath(resolvedModel.movingAveragePoints, width, height, min, range);
  const upperBandPath = buildPath(resolvedModel.volatilityUpperBand, width, height, min, range);
  const lowerBandPath = buildPath(resolvedModel.volatilityLowerBand, width, height, min, range);

  const markerValue = resolvedModel.signalMarkerValue;
  const markerY =
    typeof markerValue === 'number' ? height - ((markerValue - min) / range) * height : height / 2;

  return (
    <div className={`mini-sparkline mini-sparkline--${trend}`}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${label}. ${resolvedModel.summary}`}
      >
        <path d={priceAreaPath} className="mini-sparkline__area" />
        {upperBandPath ? <path d={upperBandPath} className="mini-sparkline__vol-band" /> : null}
        {lowerBandPath ? <path d={lowerBandPath} className="mini-sparkline__vol-band" /> : null}
        {maPath ? <path d={maPath} className="mini-sparkline__ma" /> : null}
        <path d={priceLinePath} className="mini-sparkline__line" />
        {typeof resolvedModel.signalScore === 'number' ? (
          <circle
            cx={width}
            cy={clamp(markerY, 0, height)}
            r="2.4"
            className={
              resolvedModel.signalScore >= 0.2
                ? 'mini-sparkline__signal-marker mini-sparkline__signal-marker--bullish'
                : resolvedModel.signalScore <= -0.2
                  ? 'mini-sparkline__signal-marker mini-sparkline__signal-marker--bearish'
                  : 'mini-sparkline__signal-marker mini-sparkline__signal-marker--neutral'
            }
          />
        ) : null}
      </svg>
    </div>
  );
}

export function SparklineWithSignal({ points, label, signalScore, model }: MiniIndicatorChartProps) {
  return <MiniIndicatorChart points={points} label={label} signalScore={signalScore} model={model} />;
}

export function AssetMiniChart({ points, label, signalScore, model }: MiniIndicatorChartProps) {
  return <MiniIndicatorChart points={points} label={label} signalScore={signalScore} model={model} />;
}

