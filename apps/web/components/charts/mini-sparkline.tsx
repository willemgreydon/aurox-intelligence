type MiniSparklineProps = {
  points: number[] | null | undefined;
  label: string;
  trend?: 'up' | 'down' | 'flat';
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

  return (
    <div className={`mini-sparkline mini-sparkline--${resolvedTrend}`}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${label} mini trend`}>
        <path d={areaPath} className="mini-sparkline__area" />
        <path d={linePath} className="mini-sparkline__line" />
      </svg>
    </div>
  );
}
