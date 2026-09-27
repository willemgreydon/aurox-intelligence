'use client';

import { useMemo, useState } from 'react';
import type {
  ReturnDistributionParams,
  ReturnDistributionResult,
  ReturnScenario,
  VarEstimate,
} from '@repo/api-contracts';
import { runReturnDistributionStudy } from '@repo/forecasting';

/**
 * Return Distribution + Value-at-Risk — the shape of holding-period returns and
 * the tail-risk it implies, with the EMPIRICAL tail compared to the naive normal
 * assumption so fat-tail understatement is explicit.
 *
 * DB-free by construction: the study runs the pure, seeded engine
 * (`runReturnDistributionStudy`) in the browser on a clearly-labelled SYNTHETIC
 * return process — never real market data. Deterministic: the same scenario,
 * horizon, base vol, and seed always reproduce the same distribution.
 */

const GENERATED_AT = '2025-01-01T00:00:00.000Z';

const W = 1000;
const H = 420;
const PAD = { top: 22, right: 20, bottom: 40, left: 48 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

const SCENARIOS: Array<{ id: ReturnScenario; label: string }> = [
  { id: 'normal', label: 'Normal' },
  { id: 'fat_tailed', label: 'Fat-tailed' },
  { id: 'crash_skew', label: 'Crash skew' },
  { id: 'calm', label: 'Calm' },
  { id: 'volatile', label: 'Volatile' },
];

const pct = (v: number, d = 2) => `${(v * 100).toFixed(d)}%`;
const signedPct = (v: number, d = 2) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(d)}%`;

export function ReturnDistribution() {
  const [scenario, setScenario] = useState<ReturnScenario>('fat_tailed');
  const [horizonDays, setHorizonDays] = useState(1);
  const [baseVolPct, setBaseVolPct] = useState(20);
  const [confidence, setConfidence] = useState<0.95 | 0.99>(0.99);
  const [seed, setSeed] = useState(7);

  const params: ReturnDistributionParams = {
    scenario,
    horizonDays,
    baseVolPct,
    annualDriftPct: 8,
    samples: 6000,
    seed,
  };

  const result = useMemo(
    () => runReturnDistributionStudy(params, GENERATED_AT),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scenario, horizonDays, baseVolPct, seed],
  );

  const active = result.varEstimates.find((v) => v.confidence === confidence) ?? result.varEstimates[0]!;

  return (
    <div className="ret-dist">
      {/* Controls */}
      <div className="surface">
        <div className="surface__inner path-explorer__controls-inner">
          <div className="path-explorer__presets">
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`path-chip${scenario === s.id ? ' path-chip--active' : ''}`}
                onClick={() => setScenario(s.id)}
                aria-pressed={scenario === s.id}
              >
                {s.label}
              </button>
            ))}
            <button
              type="button"
              className="path-chip path-chip--ghost"
              onClick={() => setSeed((s) => (s * 1103515245 + 12345) >>> 0)}
              title="Redraw the illustrative return sample with a new seed"
            >
              ↻ Reshuffle
            </button>
          </div>
          <div className="path-explorer__sliders">
            <Slider id="rd-horizon" label="Holding horizon" value={horizonDays} min={1} max={21} step={1} display={`${horizonDays}d`} onChange={setHorizonDays} />
            <Slider id="rd-vol" label="Base volatility (annual)" value={baseVolPct} min={5} max={80} step={1} display={`${baseVolPct}%`} onChange={setBaseVolPct} />
            <div className="path-slider">
              <span className="path-slider__label"><span>Confidence</span></span>
              <div className="ret-dist__conf-toggle" role="group" aria-label="VaR confidence level">
                {([0.95, 0.99] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`path-chip${confidence === c ? ' path-chip--active' : ''}`}
                    onClick={() => setConfidence(c)}
                    aria-pressed={confidence === c}
                  >
                    {Math.round(c * 100)}%
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Histogram */}
      <figure className="surface">
        <div className="surface__inner">
          <Histogram result={result} active={active} />
          <ul className="candle-annotator__legend">
            <li><span className="vol-swatch vol-swatch--inner" /> gain</li>
            <li><span className="ret-swatch ret-swatch--loss" /> loss tail (beyond VaR)</li>
            <li><span className="ret-swatch ret-swatch--var" /> empirical VaR</li>
            <li><span className="ret-swatch ret-swatch--gauss" /> normal VaR</li>
            <li><span className="ret-swatch ret-swatch--mean" /> mean</li>
          </ul>
          <p className="path-explorer__readout" role="status" aria-live="polite">{result.summary}</p>
        </div>
      </figure>

      {/* VaR comparison + stats */}
      <div className="ret-dist__grid">
        <div className="surface">
          <div className="surface__inner">
            <h3 className="candle-annotator__panel-title">
              Tail risk at {Math.round(active.confidence * 100)}%
              <span className="candle-annotator__panel-hint">empirical vs normal assumption</span>
            </h3>
            <div className="ret-dist__var-cards">
              <VarCard label="Value-at-Risk" empirical={active.empiricalVar} gaussian={active.gaussianVar} understatement={active.varUnderstatement} />
              <VarCard label="Expected shortfall (CVaR)" empirical={active.empiricalCVar} gaussian={active.gaussianCVar} understatement={null} />
            </div>
            {active.varUnderstatement != null && active.varUnderstatement > 0.05 ? (
              <p className="ret-dist__warn">
                ⚠ A normal-distribution model would under-reserve for this tail by{' '}
                {Math.round(active.varUnderstatement * 100)}% — the classic fat-tail trap.
              </p>
            ) : active.varUnderstatement != null && active.varUnderstatement < -0.05 ? (
              <p className="ret-dist__note-line">
                The normal model overstates this tail by {Math.round(-active.varUnderstatement * 100)}% here.
              </p>
            ) : (
              <p className="ret-dist__note-line">The normal model tracks this tail closely for this scenario.</p>
            )}
          </div>
        </div>

        <div className="surface">
          <div className="surface__inner">
            <h3 className="candle-annotator__panel-title">Distribution shape</h3>
            <div className="ret-dist__stats">
              <Stat label="Mean" value={signedPct(result.stats.mean)} />
              <Stat label="Std dev" value={pct(result.stats.stdev)} />
              <Stat label="Skewness" value={result.stats.skewness.toFixed(2)} tone={result.stats.skewness < -0.3 ? 'negative' : result.stats.skewness > 0.3 ? 'positive' : 'neutral'} />
              <Stat label="Excess kurtosis" value={result.stats.excessKurtosis.toFixed(2)} tone={result.stats.excessKurtosis > 1 ? 'negative' : 'neutral'} />
              <Stat label="P(loss)" value={pct(result.probabilityOfLoss, 0)} />
              <Stat label="Worst sample" value={signedPct(result.worst, 1)} tone="negative" />
            </div>
          </div>
        </div>
      </div>

      <p className="path-explorer__disclaimer">
        Illustrative synthetic scenarios only — not real market data and not financial advice. This runs the pure,
        deterministic engine (<code>runReturnDistributionStudy</code>); the same scenario, horizon, base vol, and
        seed always reproduce the same distribution. Empirical VaR is the {Math.round(active.confidence * 100)}%
        quantile of {result.stats.samples.toLocaleString()} simulated {result.horizonDays}-day returns; the normal
        estimate uses the sample mean and standard deviation. Runs entirely in your browser — no market data or
        database required.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Histogram
// ---------------------------------------------------------------------------

function Histogram({ result, active }: { result: ReturnDistributionResult; active: VarEstimate }) {
  const bins = result.histogram;
  const n = bins.length;
  const maxDensity = Math.max(...bins.map((b) => b.density), 1e-9);

  const min = bins[0]!.start;
  const max = bins[n - 1]!.end;
  const span = max - min || 1;
  const x = (v: number) => PAD.left + ((v - min) / span) * PLOT_W;
  const yTop = (density: number) => PAD.top + (1 - density / maxDensity) * PLOT_H;
  const baseY = PAD.top + PLOT_H;

  const varReturn = -active.empiricalVar; // loss threshold as a (negative) return
  const gaussReturn = -active.gaussianVar;
  const barW = PLOT_W / n;

  // x-axis ticks: min, a few between, max, plus 0.
  const xTicks = Array.from({ length: 6 }, (_, i) => min + (span * i) / 5);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="candle-annotator__svg"
      role="img"
      aria-label={result.summary}
      preserveAspectRatio="xMidYMid meet"
    >
      <title>Return distribution — {result.scenario} scenario, {result.horizonDays}-day horizon</title>

      {/* x-axis ticks */}
      {xTicks.map((t) => (
        <text key={t} x={x(t)} y={H - 14} textAnchor="middle" className="candle-chart__axis">
          {signedPct(t, 0)}
        </text>
      ))}
      <line x1={PAD.left} y1={baseY} x2={W - PAD.right} y2={baseY} className="candle-chart__grid" />

      {/* bars */}
      {bins.map((b, i) => {
        const mid = (b.start + b.end) / 2;
        const isLossTail = mid <= varReturn;
        const bx = x(b.start) + 1;
        const bw = Math.max(1, barW - 2);
        const by = yTop(b.density);
        return (
          <rect
            key={i}
            x={bx}
            y={by}
            width={bw}
            height={Math.max(0, baseY - by)}
            className={`ret-dist__bar${isLossTail ? ' ret-dist__bar--loss' : ''}`}
          >
            <title>{`${signedPct(b.start)} … ${signedPct(b.end)}: ${(b.density * 100).toFixed(1)}% of samples`}</title>
          </rect>
        );
      })}

      {/* mean line */}
      {result.stats.mean >= min && result.stats.mean <= max ? (
        <line x1={x(result.stats.mean)} y1={PAD.top} x2={x(result.stats.mean)} y2={baseY} className="ret-dist__mean-line" />
      ) : null}

      {/* Gaussian VaR line */}
      {gaussReturn >= min && gaussReturn <= max ? (
        <g>
          <line x1={x(gaussReturn)} y1={PAD.top} x2={x(gaussReturn)} y2={baseY} className="ret-dist__gauss-line" />
          <text x={x(gaussReturn)} y={PAD.top + 10} textAnchor="middle" className="ret-dist__var-label ret-dist__var-label--gauss">
            normal
          </text>
        </g>
      ) : null}

      {/* Empirical VaR line */}
      {varReturn >= min && varReturn <= max ? (
        <g>
          <line x1={x(varReturn)} y1={PAD.top} x2={x(varReturn)} y2={baseY} className="ret-dist__var-line" />
          <text x={x(varReturn)} y={PAD.top - 4} textAnchor="middle" className="ret-dist__var-label">
            VaR {pct(active.empiricalVar, 1)}
          </text>
        </g>
      ) : null}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Small pieces
// ---------------------------------------------------------------------------

function VarCard({
  label,
  empirical,
  gaussian,
  understatement,
}: {
  label: string;
  empirical: number;
  gaussian: number;
  understatement: number | null;
}) {
  return (
    <div className="ret-dist__var-card">
      <span className="path-stat__label">{label}</span>
      <div className="ret-dist__var-row">
        <div className="ret-dist__var-metric">
          <span className="ret-dist__var-metric-label">Empirical</span>
          <span className="ret-dist__var-metric-value ret-dist__var-metric-value--emp">{pct(empirical)}</span>
        </div>
        <div className="ret-dist__var-metric">
          <span className="ret-dist__var-metric-label">Normal</span>
          <span className="ret-dist__var-metric-value ret-dist__var-metric-value--gauss">{pct(gaussian)}</span>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'positive' | 'negative' | 'neutral' }) {
  return (
    <div className={`path-stat path-stat--${tone}`}>
      <span className="path-stat__label">{label}</span>
      <span className="path-stat__value">{value}</span>
    </div>
  );
}

function Slider(props: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="path-slider">
      <label htmlFor={props.id} className="path-slider__label">
        <span>{props.label}</span>
        <span className="path-slider__value">{props.display}</span>
      </label>
      <input
        id={props.id}
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
        className="path-slider__input"
      />
    </div>
  );
}
