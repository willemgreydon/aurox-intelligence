/**
 * Shared, PURE SVG chart geometry primitives for the Aurox visual-intelligence
 * layer. This module is the single home for the value → pixel projection math
 * that was previously re-implemented (identically) inside every sparkline,
 * line panel, and price chart.
 *
 * Design rules (mirrors `chart-intelligence-projection.ts`):
 *  - No I/O, no financial math, no randomness — deterministic geometry only,
 *    so every function is unit-testable against fixed inputs.
 *  - Never throws on degenerate input (empty series, flat series, NaN): callers
 *    in a financial UI must be able to render a safe empty/flat state instead.
 *  - Numeric behaviour matches the legacy inline builders exactly so components
 *    can adopt these helpers without changing a single rendered pixel:
 *      range = max(1, max - min);  x = i/(n-1) * width;  y = height - t*height.
 *
 * These are display helpers. They do NOT decide financial truth — a mapper/
 * service produces the numbers; this module only turns numbers into coordinates.
 */

export type Point = { x: number; y: number };

export type Bounds = { min: number; max: number; range: number };

export type ProjectOptions = {
  width: number;
  height: number;
  /** Fractional vertical padding applied to the domain (0 = none, legacy default). */
  padPct?: number;
  /** Share a domain across multiple series (e.g. line + area + moving average). */
  bounds?: Bounds;
  /** Clamp projected y into [0, height]. Legacy sparkline did this; line panels did not. */
  clampY?: boolean;
};

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Finite numbers only — the guard every builder applies before projecting. */
export function sanitizeSeries(values: readonly number[] | null | undefined): number[] {
  if (!values) return [];
  return values.filter((value) => Number.isFinite(value));
}

/**
 * Compute the vertical domain for a series. `range` is floored at 1 (matching
 * legacy behaviour) so a flat series renders as a centred/edge line rather than
 * dividing by zero. `padPct` widens the domain symmetrically when requested.
 */
export function computeBounds(values: readonly number[], padPct = 0): Bounds {
  const finite = sanitizeSeries(values);
  if (finite.length === 0) {
    return { min: 0, max: 1, range: 1 };
  }
  let min = Math.min(...finite);
  let max = Math.max(...finite);
  if (padPct > 0 && max > min) {
    const pad = (max - min) * padPct;
    min -= pad;
    max += pad;
  }
  const range = Math.max(1, max - min);
  return { min, max, range };
}

/** X coordinate for the i-th of n evenly-spaced points across `width`. */
export function xAt(index: number, count: number, width: number): number {
  return (index / Math.max(1, count - 1)) * width;
}

/** Y coordinate for a value within `bounds`, projected into `height` (0 at top). */
export function yFor(value: number, bounds: Bounds, height: number, clampY = false): number {
  const y = height - ((value - bounds.min) / bounds.range) * height;
  return clampY ? clamp(y, 0, height) : y;
}

/** Project a series to {x,y} points. Shared basis for lines, areas, and markers. */
export function projectSeries(values: readonly number[], options: ProjectOptions): Point[] {
  const finite = sanitizeSeries(values);
  if (finite.length === 0) return [];
  const bounds = options.bounds ?? computeBounds(finite, options.padPct ?? 0);
  return finite.map((value, index) => ({
    x: xAt(index, finite.length, options.width),
    y: yFor(value, bounds, options.height, options.clampY ?? false),
  }));
}

/** SVG path `d` for a polyline through the series. Empty string when < 1 point. */
export function buildLinePath(values: readonly number[], options: ProjectOptions): string {
  const points = projectSeries(values, options);
  if (points.length === 0) return '';
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
}

/** SVG path `d` for a filled area under the series (closed to the baseline). */
export function buildAreaPath(values: readonly number[], options: ProjectOptions): string {
  const line = buildLinePath(values, options);
  if (line === '') return '';
  return `${line} L ${options.width} ${options.height} L 0 ${options.height} Z`;
}

/** `points` attribute (space-separated `x,y`) for <polyline>/<polygon>. */
export function buildPointsAttr(values: readonly number[], options: ProjectOptions): string {
  return projectSeries(values, options)
    .map((point) => `${point.x},${point.y}`)
    .join(' ');
}

/** Trailing simple moving average; window is clamped to the series length. */
export function movingAverage(values: readonly number[], window: number): number[] {
  const finite = sanitizeSeries(values);
  if (finite.length === 0) return [];
  const size = Math.max(1, Math.min(window, finite.length));
  return finite.map((_, index) => {
    const start = Math.max(0, index - size + 1);
    const segment = finite.slice(start, index + 1);
    const sum = segment.reduce((acc, value) => acc + value, 0);
    return sum / Math.max(1, segment.length);
  });
}

export type Trend = 'up' | 'down' | 'flat';

/** Direction of a price series from first → last finite value. */
export function inferTrend(values: readonly number[]): Trend {
  const finite = sanitizeSeries(values);
  if (finite.length < 2) return 'flat';
  const first = finite[0]!;
  const last = finite.at(-1)!;
  const delta = last - first;
  if (Math.abs(delta) <= 1e-6) return 'flat';
  return delta > 0 ? 'up' : 'down';
}

/**
 * Direction implied by a deterministic signal score in [-1, 1]. Used where the
 * signal — not raw price action — should drive the visual tone, so a bearish
 * signal on a price-up series still renders bearish (matching the signal label).
 */
export function trendFromSignalScore(score: number, deadzone = 0.1): Trend {
  if (!Number.isFinite(score) || Math.abs(score) <= deadzone) return 'flat';
  return score > 0 ? 'up' : 'down';
}

export type LinearScale = {
  (value: number): number;
  domain: readonly [number, number];
  range: readonly [number, number];
};

/**
 * Generic linear scale (domain → range), the basis for scatter charts
 * (Risk/Return Galaxy, Market State Constellation) and axis ticks. Degenerate
 * domains collapse to the range midpoint rather than producing NaN/Infinity.
 * `clampToRange` keeps outputs inside the range for out-of-domain inputs.
 */
export function scaleLinear(
  domain: readonly [number, number],
  range: readonly [number, number],
  clampToRange = false,
): LinearScale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0;
  const mid = (r0 + r1) / 2;
  const scale = ((value: number): number => {
    if (!Number.isFinite(value)) return mid;
    if (span === 0) return mid;
    const projected = r0 + ((value - d0) / span) * (r1 - r0);
    if (!clampToRange) return projected;
    const lo = Math.min(r0, r1);
    const hi = Math.max(r0, r1);
    return clamp(projected, lo, hi);
  }) as LinearScale;
  scale.domain = domain;
  scale.range = range;
  return scale;
}

/** Normalize a value into [0, 1] within [min, max]; safe on degenerate domains. */
export function normalizeUnit(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  const span = max - min;
  if (span <= 0) return 0;
  return clamp((value - min) / span, 0, 1);
}
