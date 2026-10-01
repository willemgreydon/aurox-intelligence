'use client';

import { useMemo, useState } from 'react';
import type { CandleIntelligence, CandleDirection, DetectedPattern } from '@repo/api-contracts';
import { CANDLE_LAB_SCENARIOS, computeCandleIntelligence } from '@repo/signals';
import { computeBounds, yFor } from '../../lib/charts/chart-geometry';

/**
 * Candlestick Annotator — explainability view for the deterministic candlestick
 * intelligence engine.
 *
 * DB-free: it runs the real `computeCandleIntelligence` from @repo/signals on a
 * transparent, clearly-labelled SYNTHETIC candle scenario (never real market
 * data) and annotates the chart with the engine's own findings — detected
 * patterns, support/resistance levels, swing points, multi-timeframe bias, and
 * the reasons / warnings / invalidation narrative. Deterministic: the same
 * scenario always reproduces the same read. Runs entirely in the browser.
 */

// Fixed injected timestamp — the engine never reads ambient time, and holding
// this constant keeps the whole tool reproducible.
const GENERATED_AT = '2025-01-01T00:00:00.000Z';

const W = 1000;
const H = 460;
const PAD = { top: 26, right: 120, bottom: 30, left: 56 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

const DIRECTION_TONE: Record<CandleDirection, 'positive' | 'negative' | 'neutral'> = {
  bullish: 'positive',
  bearish: 'negative',
  neutral: 'neutral',
};

const num = (v: number, d = 2) => v.toFixed(d);
const signed = (v: number, d = 2) => (v >= 0 ? '+' : '') + v.toFixed(d);
const pct = (v: number) => `${(v * 100 >= 0 ? '+' : '')}${(v * 100).toFixed(1)}%`;

export function CandlestickAnnotator() {
  const [scenarioId, setScenarioId] = useState(CANDLE_LAB_SCENARIOS[0]!.id);
  const [selectedPattern, setSelectedPattern] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const scenario = CANDLE_LAB_SCENARIOS.find((s) => s.id === scenarioId) ?? CANDLE_LAB_SCENARIOS[0]!;

  const { bars, intel } = useMemo(() => {
    const built = scenario.build();
    const result = computeCandleIntelligence({
      symbol: scenario.symbol,
      assetClass: scenario.assetClass,
      generatedAt: GENERATED_AT,
      bars: built,
    });
    return { bars: built, intel: result };
  }, [scenario]);

  const tone = DIRECTION_TONE[intel.direction];

  return (
    <div className="candle-annotator">
      {/* Scenario picker */}
      <div className="surface">
        <div className="surface__inner">
          <div className="path-explorer__presets">
            {CANDLE_LAB_SCENARIOS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`path-chip${scenarioId === s.id ? ' path-chip--active' : ''}`}
                onClick={() => {
                  setScenarioId(s.id);
                  setSelectedPattern(null);
                  setHoverIndex(null);
                }}
                aria-pressed={scenarioId === s.id}
              >
                {s.label}
              </button>
            ))}
          </div>
          <p className="candle-annotator__summary">{scenario.summary}</p>
        </div>
      </div>

      {intel.hasInsufficientData ? (
        <div className="surface">
          <div className="surface__inner candle-annotator__insufficient">
            Insufficient data for a candlestick read on this scenario.
          </div>
        </div>
      ) : (
        <div className="candle-annotator__grid">
          {/* Chart */}
          <figure className="surface candle-annotator__chart-panel">
            <div className="surface__inner">
              <CandleChart
                bars={bars}
                intel={intel}
                selectedPattern={selectedPattern}
                hoverIndex={hoverIndex}
                onHover={setHoverIndex}
                onSelectPattern={setSelectedPattern}
              />
              <ChartReadout bars={bars} hoverIndex={hoverIndex} intel={intel} />
              <ul className="candle-annotator__legend">
                <li><span className="candle-swatch candle-swatch--up" /> Up candle</li>
                <li><span className="candle-swatch candle-swatch--down" /> Down candle</li>
                <li><span className="candle-swatch candle-swatch--support" /> Support</li>
                <li><span className="candle-swatch candle-swatch--resistance" /> Resistance</li>
                <li><span className="candle-swatch candle-swatch--swing" /> Swing point</li>
              </ul>
            </div>
          </figure>

          {/* Verdict */}
          <div className="surface candle-annotator__verdict-panel">
            <div className="surface__inner candle-annotator__verdict">
              <div className="candle-annotator__verdict-head">
                <span className={`candle-badge candle-badge--${tone}`}>{intel.direction.toUpperCase()}</span>
                <span className="candle-annotator__regime">{intel.structure.regime}</span>
              </div>
              <div className="candle-annotator__composite">
                <span className="path-stat__label">Evidence score</span>
                <span className={`candle-annotator__composite-value candle-annotator__composite-value--${tone}`}>
                  {signed(intel.score)}
                </span>
                <span className="path-stat__label">range −1 … +1</span>
              </div>
              <Meter label="Confidence" value={intel.confidence} />
              <div className="candle-annotator__pressure">
                <Meter label="Buying pressure" value={intel.pressure.buyingPressure} tone="positive" />
                <Meter label="Selling pressure" value={intel.pressure.sellingPressure} tone="negative" />
                <Meter label="Exhaustion" value={intel.pressure.exhaustion} tone="neutral" />
              </div>
            </div>
          </div>
        </div>
      )}

      {!intel.hasInsufficientData && (
        <>
          {/* Multi-timeframe bias */}
          {intel.multiTimeframe.length > 0 && (
            <div className="surface">
              <div className="surface__inner">
                <h3 className="candle-annotator__panel-title">Multi-timeframe bias</h3>
                <div className="candle-annotator__mtf">
                  {intel.multiTimeframe.map((b) => (
                    <div key={b.timeframe} className={`candle-mtf candle-mtf--${DIRECTION_TONE[b.direction]}`}>
                      <span className="candle-mtf__tf">{b.timeframe}</span>
                      <span className="candle-mtf__dir">{b.direction}</span>
                      <span className="candle-mtf__meta">
                        {b.regime} · {Math.round(b.confidence * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Detected patterns */}
          <div className="surface">
            <div className="surface__inner">
              <h3 className="candle-annotator__panel-title">
                Detected patterns
                <span className="candle-annotator__panel-hint">select to highlight on the chart</span>
              </h3>
              {intel.detectedPatterns.length === 0 ? (
                <p className="candle-annotator__empty">No named candlestick pattern at the latest bar.</p>
              ) : (
                <ul className="candle-annotator__patterns">
                  {intel.detectedPatterns.map((p, i) => {
                    const active = selectedPattern === i;
                    return (
                      <li key={`${p.pattern}-${i}`}>
                        <button
                          type="button"
                          className={`candle-pattern candle-pattern--${DIRECTION_TONE[p.direction]}${active ? ' candle-pattern--active' : ''}`}
                          aria-pressed={active}
                          onClick={() => setSelectedPattern(active ? null : i)}
                        >
                          <span className="candle-pattern__head">
                            <span className="candle-pattern__name">{prettyPattern(p.pattern)}</span>
                            <span className={`candle-pattern__dir candle-pattern__dir--${DIRECTION_TONE[p.direction]}`}>
                              {p.direction} · {p.strength}
                            </span>
                          </span>
                          <span className="candle-pattern__conf">
                            evidence quality {Math.round(p.confidence * 100)}%
                          </span>
                          <span className="candle-pattern__explain">{p.explanation}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Narrative */}
          <div className="candle-annotator__narrative">
            <NarrativeList title="Supporting evidence" icon="✓" tone="positive" items={intel.reasons} />
            <NarrativeList title="Counter-evidence & caveats" icon="⚠" tone="neutral" items={intel.warnings} />
            <NarrativeList title="What would invalidate this" icon="✕" tone="negative" items={intel.invalidation} />
          </div>
        </>
      )}

      <p className="path-explorer__disclaimer">
        Illustrative synthetic scenarios only — not real market data and not financial advice. This runs the
        production deterministic candlestick engine (<code>computeCandleIntelligence</code>), so every pattern,
        level, and bias is exactly what Aurox computes. The same scenario always reproduces the same read. Runs
        entirely in your browser — no market data or database required.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chart
// ---------------------------------------------------------------------------

function CandleChart({
  bars,
  intel,
  selectedPattern,
  hoverIndex,
  onHover,
  onSelectPattern,
}: {
  bars: ReturnType<CandleLabBuild>;
  intel: CandleIntelligence;
  selectedPattern: number | null;
  hoverIndex: number | null;
  onHover: (i: number | null) => void;
  onSelectPattern: (i: number | null) => void;
}) {
  const n = bars.length;
  const { structure } = intel;

  // Domain over highs, lows, and any structural levels so overlays stay in view.
  const levelPrices = [structure.nearestSupport?.price, structure.nearestResistance?.price].filter(
    (v): v is number => typeof v === 'number',
  );
  const bounds = useMemo(
    () => computeBounds([...bars.map((b) => b.high), ...bars.map((b) => b.low), ...levelPrices], 0.06),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bars, structure.nearestSupport?.price, structure.nearestResistance?.price],
  );

  const slotW = PLOT_W / Math.max(1, n);
  const bodyW = Math.min(slotW * 0.62, 15);
  const xCenter = (i: number) => PAD.left + (i + 0.5) * slotW;
  const y = (price: number) => PAD.top + yFor(price, bounds, PLOT_H);

  // y-axis price ticks
  const yTicks = Array.from({ length: 5 }, (_, i) => bounds.min + (bounds.range * i) / 4);

  const selected = selectedPattern != null ? intel.detectedPatterns[selectedPattern] ?? null : null;
  const hasSelection = selected != null;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="candle-annotator__svg"
      role="img"
      aria-label={`Synthetic ${intel.assetClass} candlestick scenario for ${intel.symbol}: ${intel.structure.regime} regime, ${intel.direction} bias, ${intel.detectedPatterns.length} detected pattern(s).`}
      preserveAspectRatio="xMidYMid meet"
      onMouseLeave={() => onHover(null)}
    >
      <title>
        {intel.symbol} — {intel.structure.regime}, {intel.direction} bias
      </title>

      {/* gridlines + y labels */}
      {yTicks.map((t) => (
        <g key={t}>
          <line x1={PAD.left} y1={y(t)} x2={W - PAD.right} y2={y(t)} className="candle-chart__grid" />
          <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" className="candle-chart__axis">
            {num(t, 0)}
          </text>
        </g>
      ))}

      {/* Support / resistance levels */}
      {structure.nearestSupport ? (
        <LevelLine y={y(structure.nearestSupport.price)} kind="support" level={structure.nearestSupport} />
      ) : null}
      {structure.nearestResistance ? (
        <LevelLine y={y(structure.nearestResistance.price)} kind="resistance" level={structure.nearestResistance} />
      ) : null}

      {/* Pattern annotation boxes */}
      {intel.detectedPatterns.map((p, i) => {
        const idxs = p.candleIndexes.filter((idx) => idx >= 0 && idx < n);
        if (idxs.length === 0) return null;
        const minIdx = Math.min(...idxs);
        const maxIdx = Math.max(...idxs);
        const x0 = PAD.left + minIdx * slotW + slotW * 0.08;
        const boxW = (maxIdx - minIdx + 1) * slotW - slotW * 0.16;
        let hi = -Infinity;
        let lo = Infinity;
        for (const idx of idxs) {
          hi = Math.max(hi, bars[idx]!.high);
          lo = Math.min(lo, bars[idx]!.low);
        }
        const yTop = y(hi) - 8;
        const yBot = y(lo) + 8;
        const active = selectedPattern === i;
        const dim = hasSelection && !active;
        return (
          <g
            key={`ann-${p.pattern}-${i}`}
            className={`candle-annotation candle-annotation--${DIRECTION_TONE[p.direction]}${active ? ' candle-annotation--active' : ''}${dim ? ' candle-annotation--dim' : ''}`}
            onClick={() => onSelectPattern(active ? null : i)}
            role="button"
            aria-label={`${prettyPattern(p.pattern)} annotation`}
          >
            <rect x={x0} y={yTop} width={Math.max(boxW, bodyW)} height={Math.max(yBot - yTop, 12)} rx={4} className="candle-annotation__box" />
            {active ? (
              <text x={x0 + Math.max(boxW, bodyW) / 2} y={yTop - 5} textAnchor="middle" className="candle-annotation__label">
                {prettyPattern(p.pattern)}
              </text>
            ) : null}
          </g>
        );
      })}

      {/* Candles */}
      {bars.map((b, i) => {
        const up = b.close >= b.open;
        const cx = xCenter(i);
        const bodyTop = y(Math.max(b.open, b.close));
        const bodyBot = y(Math.min(b.open, b.close));
        const isHover = hoverIndex === i;
        const isSwingHigh = structure.lastSwingHigh != null && b.high === structure.lastSwingHigh;
        const isSwingLow = structure.lastSwingLow != null && b.low === structure.lastSwingLow;
        return (
          <g
            key={b.timestamp}
            className={`candle${up ? ' candle--up' : ' candle--down'}${isHover ? ' candle--hover' : ''}`}
            onMouseEnter={() => onHover(i)}
          >
            {/* invisible hit target across the whole slot */}
            <rect x={PAD.left + i * slotW} y={PAD.top} width={slotW} height={PLOT_H} className="candle__hit" />
            <line x1={cx} y1={y(b.high)} x2={cx} y2={y(b.low)} className="candle__wick" />
            <rect
              x={cx - bodyW / 2}
              y={bodyTop}
              width={bodyW}
              height={Math.max(1, bodyBot - bodyTop)}
              rx={1}
              className="candle__body"
            >
              <title>{`${b.timestamp.slice(0, 10)} · O ${num(b.open)} H ${num(b.high)} L ${num(b.low)} C ${num(b.close)}`}</title>
            </rect>
            {isSwingHigh ? <circle cx={cx} cy={y(b.high) - 9} r={3} className="candle-swing candle-swing--high" /> : null}
            {isSwingLow ? <circle cx={cx} cy={y(b.low) + 9} r={3} className="candle-swing candle-swing--low" /> : null}
          </g>
        );
      })}
    </svg>
  );
}

function LevelLine({
  y,
  kind,
  level,
}: {
  y: number;
  kind: 'support' | 'resistance';
  level: { price: number; touches: number; distancePct: number };
}) {
  return (
    <g className={`candle-level candle-level--${kind}`}>
      <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} className="candle-level__line" />
      <text x={W - PAD.right + 6} y={y - 3} className="candle-level__label">
        {kind === 'support' ? 'S' : 'R'} {num(level.price, 1)}
      </text>
      <text x={W - PAD.right + 6} y={y + 11} className="candle-level__meta">
        {level.touches}×· {pct(level.distancePct)}
      </text>
    </g>
  );
}

function ChartReadout({
  bars,
  hoverIndex,
  intel,
}: {
  bars: ReturnType<CandleLabBuild>;
  hoverIndex: number | null;
  intel: CandleIntelligence;
}) {
  if (hoverIndex != null && bars[hoverIndex]) {
    const b = bars[hoverIndex];
    return (
      <p className="path-explorer__readout" role="status" aria-live="polite">
        {b.timestamp.slice(0, 10)} — O {num(b.open)} · H {num(b.high)} · L {num(b.low)} · C {num(b.close)}
        {b.volume != null ? ` · Vol ${Math.round(b.volume)}` : ''}
      </p>
    );
  }
  return (
    <p className="path-explorer__readout" role="status" aria-live="polite">
      {intel.barsAnalyzed} bars analyzed · hover a candle to inspect its OHLC.
    </p>
  );
}

// ---------------------------------------------------------------------------
// Small pieces
// ---------------------------------------------------------------------------

function Meter({ label, value, tone = 'neutral' }: { label: string; value: number; tone?: 'positive' | 'negative' | 'neutral' }) {
  const wpct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className="candle-meter">
      <div className="candle-meter__head">
        <span className="path-stat__label">{label}</span>
        <span className="path-slider__value">{wpct}%</span>
      </div>
      <div className="candle-meter__track">
        <div className={`candle-meter__fill candle-meter__fill--${tone}`} style={{ width: `${wpct}%` }} />
      </div>
    </div>
  );
}

function NarrativeList({
  title,
  icon,
  tone,
  items,
}: {
  title: string;
  icon: string;
  tone: 'positive' | 'negative' | 'neutral';
  items: string[];
}) {
  return (
    <div className={`surface candle-narrative candle-narrative--${tone}`}>
      <div className="surface__inner">
        <h3 className="candle-annotator__panel-title">{title}</h3>
        {items.length === 0 ? (
          <p className="candle-annotator__empty">None.</p>
        ) : (
          <ul className="candle-narrative__list">
            {items.map((item, i) => (
              <li key={i} className="candle-narrative__item">
                <span className={`candle-narrative__icon candle-narrative__icon--${tone}`} aria-hidden="true">
                  {icon}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type CandleLabBuild = (typeof CANDLE_LAB_SCENARIOS)[number]['build'];

function prettyPattern(pattern: DetectedPattern['pattern']): string {
  return pattern
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
