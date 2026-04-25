type MiniSparklineProps = {
  points: number[] | null | undefined;
  label: string;
  trend?: 'up' | 'down' | 'flat';
  signalScore?: number;
  showMovingAverage?: boolean;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function buildLinePath(points: number[], width: number, height: number) {
  if (points.length === 0) {
    return '';
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = Math.max(1, max - min);

  return points
    .map((value, index) => {
      const x = (index / Math.max(1, points.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${index === 0 ? 'M' : 'L'} ${x} ${clamp(y, 0, height)}`;
    })
    .join(' ');
}

function buildAreaPath(points: number[], width: number, height: number) {
  if (points.length === 0) {
    return '';
  }

  const line = buildLinePath(points, width, height);
  return `${line} L ${width} ${height} L 0 ${height} Z`;
}

function inferTrend(points: number[]): 'up' | 'down' | 'flat' {
  if (points.length < 2) {
    return 'flat';
  }

  const first = points[0];
  const last = points.at(-1);
  if (typeof first !== 'number' || typeof last !== 'number') {
    return 'flat';
  }
  const delta = last - first;

  if (Math.abs(delta) <= 1e-6) {
    return 'flat';
  }

  return delta > 0 ? 'up' : 'down';
}

export function MiniSparkline({ points, label, trend }: MiniSparklineProps) {
  const normalized = (points ?? []).filter((value) => Number.isFinite(value));
  const resolvedTrend = trend ?? inferTrend(normalized);

  if (normalized.length < 2) {
    return (
      <div className="mini-sparkline mini-sparkline--empty" role="img" aria-label={`${label} trend unavailable`}>
        <span />
      </div>
    );
  }

  const width = 120;
  const height = 34;
  const linePath = buildLinePath(normalized, width, height);
  const areaPath = buildAreaPath(normalized, width, height);
  const movingAveragePath = (() => {
    if (normalized.length < 3) {
      return '';
    }
    const maWindow = Math.min(5, normalized.length);
    const averages = normalized.map((_, index) => {
      const start = Math.max(0, index - maWindow + 1);
      const segment = normalized.slice(start, index + 1);
      const sum = segment.reduce((acc, value) => acc + value, 0);
      return sum / Math.max(1, segment.length);
    });
    return buildLinePath(averages, width, height);
  })();
  const lastPoint = normalized.at(-1);
  const min = Math.min(...normalized);
  const max = Math.max(...normalized);
  const range = Math.max(1, max - min);
  const markerY =
    typeof lastPoint === 'number'
      ? height - ((lastPoint - min) / range) * height
      : height;
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
