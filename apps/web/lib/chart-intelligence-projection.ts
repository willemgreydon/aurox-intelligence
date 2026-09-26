import type {
  ChartIntelligenceOverlay,
  ChartOverlayEvent,
  ChartOverlayLevel,
  ChartOverlayPattern,
  ChartOverlaySwing,
} from '../server/mappers/chart-intelligence-overlay-mapper';

/**
 * PURE projection layer: turns a coordinate-independent `ChartIntelligenceOverlay`
 * (price/timestamp anchored) into SVG primitives for the market chart's fixed
 * 980x420 viewBox. This is the ONLY place chart coordinates are computed for the
 * intelligence overlay — the SVG renderer receives display-ready x/y numbers and
 * the mapper/engine never learn about pixels.
 *
 * No I/O, no financial math, no randomness — deterministic geometry only, so it
 * can be unit-tested against fixed inputs. Anything that cannot be projected
 * (price outside the visible band, timestamp not in the current viewport) is
 * clipped out rather than clamped, matching the chart's own clipping behaviour.
 */

export const CHART_WIDTH = 980;
export const CHART_HEIGHT = 420;
/** Vertical band we keep primitives within (matches candle plot padding). */
const CLIP_TOP = 8;
const CLIP_BOTTOM = 412;
/** Minimum vertical gap before two same-kind levels are treated as duplicates. */
const LEVEL_MERGE_PX = 9;
/** Default cap on simultaneously rendered pattern glyphs. */
const DEFAULT_MAX_PATTERNS = 6;
/** Cap on simultaneously rendered structure-event markers. */
const MAX_EVENTS = 2;

export type ProjectionScale = {
  /** Ordered timestamps of the currently visible bars (viewportVisible). */
  timestamps: string[];
  mode: 'line' | 'candles';
  /** Candle-mode padded price bounds. */
  minPrice: number;
  priceRange: number;
  /** Line-mode padded close bounds. */
  closeMin: number;
  closeRange: number;
  /** Optional override for the pattern cap. */
  maxPatterns?: number;
};

export type ProjectedLevel = {
  kind: ChartOverlayLevel['kind'];
  label: string;
  y: number;
  touches: number;
  distancePct: number;
};

export type ProjectedSwing = {
  kind: ChartOverlaySwing['kind'];
  label: string;
  description: string;
  y: number;
};

export type ProjectedPattern = {
  key: string;
  glyph: string;
  label: string;
  direction: ChartOverlayPattern['direction'];
  strength: ChartOverlayPattern['strength'];
  x: number;
  y: number;
  placement: ChartOverlayPattern['placement'];
};

export type ProjectedEvent = {
  kind: ChartOverlayEvent['kind'];
  direction: ChartOverlayEvent['direction'];
  label: string;
  x: number;
  y: number;
};

export type ProjectedOverlay = {
  levels: ProjectedLevel[];
  swings: ProjectedSwing[];
  patterns: ProjectedPattern[];
  events: ProjectedEvent[];
};

const STRENGTH_RANK: Record<ChartOverlayPattern['strength'], number> = {
  strong: 3,
  moderate: 2,
  weak: 1,
};

/** Map an absolute price to a Y coordinate for the active mode, or null if degenerate. */
export function priceToY(price: number, scale: ProjectionScale): number | null {
  if (!Number.isFinite(price)) return null;
  if (scale.mode === 'candles') {
    if (!(scale.priceRange > 0)) return null;
    return 400 - ((price - scale.minPrice) / scale.priceRange) * 360;
  }
  if (!(scale.closeRange > 0)) return null;
  return CHART_HEIGHT - ((price - scale.closeMin) / scale.closeRange) * CHART_HEIGHT;
}

/** Map a visible-bar index to an X coordinate for the active mode. */
export function indexToX(index: number, count: number, mode: 'line' | 'candles'): number {
  const denom = Math.max(1, count - 1);
  if (mode === 'candles') {
    return (index / denom) * 940 + 20;
  }
  return (index / denom) * CHART_WIDTH;
}

function withinClip(y: number | null): y is number {
  return y !== null && y >= CLIP_TOP && y <= CLIP_BOTTOM;
}

function projectLevels(levels: readonly ChartOverlayLevel[], scale: ProjectionScale): ProjectedLevel[] {
  const projected = levels
    .map((level) => {
      const y = priceToY(level.price, scale);
      return withinClip(y)
        ? { kind: level.kind, label: level.label, y, touches: level.touches, distancePct: level.distancePct }
        : null;
    })
    .filter((value): value is ProjectedLevel => value !== null)
    // Higher touch-count first so it wins de-dup; deterministic tiebreak by y.
    .sort((a, b) => b.touches - a.touches || a.y - b.y);

  const kept: ProjectedLevel[] = [];
  for (const level of projected) {
    const clash = kept.some((existing) => existing.kind === level.kind && Math.abs(existing.y - level.y) < LEVEL_MERGE_PX);
    if (!clash) kept.push(level);
  }
  return kept.sort((a, b) => a.y - b.y);
}

function projectSwings(
  swings: readonly ChartOverlaySwing[],
  levels: readonly ProjectedLevel[],
  scale: ProjectionScale,
): ProjectedSwing[] {
  const projected: ProjectedSwing[] = [];
  for (const swing of swings) {
    const y = priceToY(swing.price, scale);
    if (!withinClip(y)) continue;
    // Suppress a swing chip that would sit on top of an S/R line — the level
    // already communicates that price; avoid a duplicate marker.
    if (levels.some((level) => Math.abs(level.y - y) < LEVEL_MERGE_PX)) continue;
    projected.push({ kind: swing.kind, label: swing.label, description: swing.description, y });
  }
  return projected;
}

function projectPatterns(
  patterns: readonly ChartOverlayPattern[],
  scale: ProjectionScale,
): ProjectedPattern[] {
  const maxPatterns = scale.maxPatterns ?? DEFAULT_MAX_PATTERNS;
  const indexByTimestamp = new Map<string, number>();
  scale.timestamps.forEach((timestamp, index) => {
    if (!indexByTimestamp.has(timestamp)) indexByTimestamp.set(timestamp, index);
  });

  // Resolve to the visible viewport; strongest pattern per candle wins.
  const bestPerIndex = new Map<number, { pattern: ChartOverlayPattern; index: number }>();
  for (const pattern of patterns) {
    const index = indexByTimestamp.get(pattern.anchorTimestamp);
    if (index === undefined) continue;
    const existing = bestPerIndex.get(index);
    if (!existing) {
      bestPerIndex.set(index, { pattern, index });
      continue;
    }
    const better =
      STRENGTH_RANK[pattern.strength] - STRENGTH_RANK[existing.pattern.strength] ||
      pattern.confidence - existing.pattern.confidence;
    if (better > 0) bestPerIndex.set(index, { pattern, index });
  }

  const ranked = [...bestPerIndex.values()].sort(
    (a, b) =>
      STRENGTH_RANK[b.pattern.strength] - STRENGTH_RANK[a.pattern.strength] ||
      b.pattern.confidence - a.pattern.confidence ||
      a.index - b.index,
  );

  const out: ProjectedPattern[] = [];
  const count = scale.timestamps.length;
  for (const { pattern, index } of ranked) {
    if (out.length >= maxPatterns) break;
    const y = priceToY(pattern.anchorPrice, scale);
    if (!withinClip(y)) continue;
    const offset = pattern.placement === 'below' ? 16 : -16;
    const markerY = Math.max(CLIP_TOP, Math.min(CLIP_BOTTOM, y + offset));
    out.push({
      key: pattern.key,
      glyph: pattern.glyph,
      label: pattern.label,
      direction: pattern.direction,
      strength: pattern.strength,
      x: indexToX(index, count, scale.mode),
      y: markerY,
      placement: pattern.placement,
    });
  }
  // Return in left-to-right order for stable DOM output.
  return out.sort((a, b) => a.x - b.x);
}

function projectEvents(events: readonly ChartOverlayEvent[], scale: ProjectionScale): ProjectedEvent[] {
  const indexByTimestamp = new Map<string, number>();
  scale.timestamps.forEach((timestamp, index) => {
    if (!indexByTimestamp.has(timestamp)) indexByTimestamp.set(timestamp, index);
  });
  const count = scale.timestamps.length;

  const out: ProjectedEvent[] = [];
  for (const event of events) {
    if (out.length >= MAX_EVENTS) break;
    const index = indexByTimestamp.get(event.anchorTimestamp);
    if (index === undefined) continue;
    const y = priceToY(event.price, scale);
    if (!withinClip(y)) continue;
    out.push({
      kind: event.kind,
      direction: event.direction,
      label: event.label,
      x: indexToX(index, count, scale.mode),
      y,
    });
  }
  return out;
}

/**
 * Project a full overlay onto the current chart viewport.
 *
 * Pattern glyphs are candle-mode only (they annotate individual candles); S/R
 * levels, swings and structure events remain meaningful in line mode and are
 * projected in both modes.
 */
export function projectChartIntelligence(
  overlay: ChartIntelligenceOverlay,
  scale: ProjectionScale,
): ProjectedOverlay {
  if (!overlay.available || scale.timestamps.length < 2) {
    return { levels: [], swings: [], patterns: [], events: [] };
  }
  const levels = projectLevels(overlay.levels, scale);
  const swings = projectSwings(overlay.swings, levels, scale);
  const patterns = scale.mode === 'candles' ? projectPatterns(overlay.patterns, scale) : [];
  const events = projectEvents(overlay.events, scale);
  return { levels, swings, patterns, events };
}
