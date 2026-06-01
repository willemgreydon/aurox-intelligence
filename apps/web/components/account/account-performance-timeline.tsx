'use client';

import { useMemo, useState } from 'react';
import type { AccountIntelligenceViewModel } from '../../server/services/account-intelligence-service';

type Props = {
  timeline: AccountIntelligenceViewModel['timeline'];
  period: Pick<AccountIntelligenceViewModel['hero'], 'todayPnl' | 'sevenDayPnl' | 'thirtyDayPnl'>;
};

type RangeId = '7D' | '30D' | '90D' | 'YTD' | 'ALL';
const RANGES: Array<{ id: RangeId; label: string; days: number | null }> = [
  { id: '7D', label: '7D', days: 7 },
  { id: '30D', label: '30D', days: 30 },
  { id: '90D', label: '90D', days: 90 },
  { id: 'YTD', label: 'YTD', days: null },
  { id: 'ALL', label: 'All', days: null },
];

const CHART_WIDTH = 720;
const CHART_HEIGHT = 160;
const BAR_STRIP_HEIGHT = 52;

type Point = AccountIntelligenceViewModel['timeline']['points'][number];

/** Days between two YYYY-MM-DD strings (pure; no ambient Date.now). */
function daysBetween(fromDate: string, toDate: string): number {
  const a = Date.parse(`${fromDate}T00:00:00.000Z`);
  const b = Date.parse(`${toDate}T00:00:00.000Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return Number.POSITIVE_INFINITY;
  return Math.abs(b - a) / 86_400_000;
}

function sliceByRange(points: Point[], range: RangeId): Point[] {
  if (points.length === 0 || range === 'ALL') return points;
  const latest = points[points.length - 1]!.date;
  if (range === 'YTD') {
    const year = latest.slice(0, 4);
    return points.filter((p) => p.date.slice(0, 4) === year);
  }
  const days = RANGES.find((r) => r.id === range)?.days ?? null;
  if (days === null) return points;
  return points.filter((p) => daysBetween(p.date, latest) <= days);
}

function fmt(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}`;
}

/**
 * Interactive daily account-value timeline. Slices the real snapshot-derived
 * daily points by a selected range (no refetch). Lightweight inline SVG line +
 * an always-visible text summary so meaning is not carried by color alone.
 */
export function AccountPerformanceTimeline({ timeline, period }: Props) {
  const [range, setRange] = useState<RangeId>('ALL');

  const sliced = useMemo(() => sliceByRange(timeline.points, range), [timeline.points, range]);

  if (!timeline.hasData) {
    return (
      <div className="account-timeline account-timeline--empty">
        <p className="account-empty">
          Daily P/L appears once simulated activity is recorded across multiple days. Your first snapshots are captured as you trade.
        </p>
      </div>
    );
  }

  const values = sliced.map((p) => p.accountValue);
  const hasLine = values.length >= 2;
  const min = hasLine ? Math.min(...values) : 0;
  const max = hasLine ? Math.max(...values) : 1;
  const span = Math.max(1e-9, max - min);
  const linePath = hasLine
    ? sliced
        .map((p, i) => {
          const x = (i / (sliced.length - 1)) * CHART_WIDTH;
          const y = CHART_HEIGHT - ((p.accountValue - min) / span) * CHART_HEIGHT;
          return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
        })
        .join(' ')
    : '';

  const first = sliced[0];
  const last = sliced[sliced.length - 1];
  const overallUp = first && last ? last.accountValue >= first.accountValue : true;
  const rangeReturn = first && last && first.accountValue !== 0
    ? ((last.accountValue - first.accountValue) / first.accountValue) * 100
    : null;

  const rangeLabel = RANGES.find((r) => r.id === range)?.label ?? range;
  const summary = hasLine
    ? `${rangeLabel} account value across ${sliced.length} recorded days — change ${fmt(rangeReturn)}%. ${timeline.winLossLabel ?? ''}`.trim()
    : `Not enough recorded days in the ${rangeLabel} range to draw a line.`;

  // Daily P/L bars (diverging from a centre baseline). Real per-day P/L from the
  // snapshot series; days without a prior point (dailyPnL === null) are skipped.
  const dayBars = sliced.map((p) => p.dailyPnL).filter((v): v is number => v !== null && Number.isFinite(v));
  const hasBars = dayBars.length >= 1;
  const maxAbs = hasBars ? Math.max(...dayBars.map((v) => Math.abs(v)), 1e-9) : 1;
  const barCount = sliced.length;
  const barBand = barCount > 0 ? CHART_WIDTH / barCount : CHART_WIDTH;
  const barW = Math.max(1, barBand * 0.62);
  const mid = BAR_STRIP_HEIGHT / 2;
  const pnlSummary = hasBars
    ? `Daily P/L bars: ${timeline.winLossLabel ?? ''}${timeline.bestDayLabel ? ` Best ${timeline.bestDayLabel}.` : ''}`.trim()
    : 'Daily P/L bars appear after two or more recorded days.';

  return (
    <div className="account-timeline">
      <div className="account-timeline__head">
        <div className="account-timeline__chips" role="group" aria-label="Period performance">
          <PeriodChip label="Today" metric={period.todayPnl} />
          <PeriodChip label="7 days" metric={period.sevenDayPnl} />
          <PeriodChip label="30 days" metric={period.thirtyDayPnl} />
        </div>
        <div className="account-timeline__ranges" role="group" aria-label="Timeline range">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              className={`account-range-btn${range === r.id ? ' account-range-btn--active' : ''}`}
              aria-pressed={range === r.id}
              onClick={() => setRange(r.id)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <p className="account-timeline__summary" aria-live="polite">{summary}</p>

      {hasLine ? (
        <svg
          className="account-timeline__chart"
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={summary}
        >
          <path
            className="account-timeline__line"
            d={linePath}
            pathLength={1}
            fill="none"
            stroke={overallUp ? 'var(--chart-positive)' : 'var(--chart-negative)'}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      ) : (
        <p className="account-empty">{summary}</p>
      )}

      {/* Daily P/L bars — capital "rhythm" beneath the value line. */}
      {hasLine ? (
        <>
          <p className="account-timeline__bars-label">Daily P/L</p>
          <svg
            className="account-timeline__bars"
            viewBox={`0 0 ${CHART_WIDTH} ${BAR_STRIP_HEIGHT}`}
            preserveAspectRatio="none"
            role="img"
            aria-label={pnlSummary}
          >
            <line x1={0} y1={mid} x2={CHART_WIDTH} y2={mid} stroke="var(--border-subtle)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            {sliced.map((p, i) => {
              if (p.dailyPnL === null || !Number.isFinite(p.dailyPnL)) return null;
              const h = (Math.abs(p.dailyPnL) / maxAbs) * (mid - 2);
              const up = p.dailyPnL >= 0;
              const x = i * barBand + (barBand - barW) / 2;
              const y = up ? mid - h : mid;
              return (
                <rect
                  key={p.date}
                  className="account-timeline__bar"
                  x={x.toFixed(2)}
                  y={y.toFixed(2)}
                  width={barW.toFixed(2)}
                  height={Math.max(0.5, h).toFixed(2)}
                  fill={up ? 'var(--chart-positive)' : 'var(--chart-negative)'}
                  style={{ '--bar-index': i } as React.CSSProperties}
                />
              );
            })}
          </svg>
        </>
      ) : null}

      <div className="account-timeline__stats">
        {timeline.bestDayLabel ? <div><span>Best day</span><strong className="account-pnl--positive">{timeline.bestDayLabel}</strong></div> : null}
        {timeline.worstDayLabel ? <div><span>Worst day</span><strong className="account-pnl--negative">{timeline.worstDayLabel}</strong></div> : null}
        {timeline.averageDailyLabel ? <div><span>Avg daily</span><strong>{timeline.averageDailyLabel}</strong></div> : null}
        {timeline.winLossLabel ? <div><span>Up / down days</span><strong>{timeline.winLossLabel}</strong></div> : null}
      </div>

      <p className="account-muted">{timeline.estimatedNote}</p>
    </div>
  );
}

function PeriodChip({ label, metric }: { label: string; metric: { label: string; tone: 'positive' | 'negative' | 'neutral'; available: boolean } }) {
  return (
    <div className={`account-period-chip account-period-chip--${metric.tone}`}>
      <span className="account-period-chip__label">{label}</span>
      <span className="account-period-chip__value">{metric.available ? metric.label : '—'}</span>
    </div>
  );
}
