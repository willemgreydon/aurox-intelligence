'use client';

import { useMemo, useState } from 'react';
import {
  PULSE_RANGE_OPTIONS,
  computeRangeMetrics,
  sliceBarsByRange,
  type OhlcvBar,
  type PulseRangeId,
} from '../../lib/market-pulse';
import { MarketPulse } from './market-pulse';

type AssetPriceExplorerProps = {
  bars: OhlcvBar[];
  /** Latest live quote price; overrides the last bar's close for range metrics. */
  referencePrice: number | null;
  assetClass: 'stock' | 'etf' | 'crypto';
  currency?: 'USD' | 'EUR';
  unavailableLabel: string;
  emptyMessage: string;
  defaultRange?: PulseRangeId;
};

const CHART_WIDTH = 640;
const CHART_HEIGHT = 180;

function buildLinePath(values: number[]): string {
  if (values.length < 2) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1e-9, max - min);
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * CHART_WIDTH;
      const y = CHART_HEIGHT - ((value - min) / range) * CHART_HEIGHT;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function fmtPrice(value: number | null, currency: 'USD' | 'EUR', unavailable: string): string {
  if (value === null || !Number.isFinite(value)) return unavailable;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
}

function fmtPct(value: number | null, unavailable: string): string {
  if (value === null || !Number.isFinite(value)) return unavailable;
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

/**
 * Interactive price explorer. Slices the ALREADY-FETCHED daily OHLCV bars by a
 * chosen range — no refetch, no fabricated data. The chart is a lightweight
 * inline SVG (no charting dependency). A text summary always accompanies the
 * visual so meaning is not carried by color/shape alone.
 *
 * Ranges are daily-granularity only (1M…ALL); intraday ranges are intentionally
 * omitted because the cached history is daily.
 */
export function AssetPriceExplorer({
  bars,
  referencePrice,
  assetClass,
  currency = 'USD',
  unavailableLabel,
  emptyMessage,
  defaultRange = '1Y',
}: AssetPriceExplorerProps) {
  const [range, setRange] = useState<PulseRangeId>(defaultRange);

  const { metrics, path, positive } = useMemo(() => {
    const slicedBars = sliceBarsByRange(bars, range);
    const rangeMetrics = computeRangeMetrics(slicedBars, referencePrice);
    const closes = slicedBars.map((b) => b.close).filter((c) => Number.isFinite(c));
    return {
      metrics: rangeMetrics,
      path: buildLinePath(closes),
      positive: (rangeMetrics.rangeReturnPct ?? 0) >= 0,
    };
  }, [bars, range, referencePrice]);

  const rangeLabel = PULSE_RANGE_OPTIONS.find((opt) => opt.id === range)?.label ?? range;

  if (bars.length < 2) {
    return (
      <div className="price-explorer price-explorer--empty">
        <p className="price-explorer__empty">{emptyMessage}</p>
      </div>
    );
  }

  const summary = metrics.hasData
    ? `Selected range ${rangeLabel}: ${fmtPct(metrics.rangeReturnPct, unavailableLabel)}, high ${fmtPrice(metrics.high, currency, unavailableLabel)}, low ${fmtPrice(metrics.low, currency, unavailableLabel)} across ${metrics.barCount} daily bars.`
    : `Not enough data in the ${rangeLabel} range to summarize.`;

  return (
    <div className="price-explorer">
      <div className="price-explorer__controls" role="group" aria-label="Price history range">
        {PULSE_RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={`price-explorer__range-btn${range === opt.id ? ' price-explorer__range-btn--active' : ''}`}
            aria-pressed={range === opt.id}
            onClick={() => setRange(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Visible, always-present textual summary (a11y + scannability). */}
      <p className="price-explorer__summary" aria-live="polite">{summary}</p>

      {path ? (
        <svg
          className="price-explorer__chart"
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={summary}
        >
          <path
            d={path}
            fill="none"
            stroke={positive ? 'var(--chart-positive)' : 'var(--chart-negative)'}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      ) : (
        <p className="price-explorer__empty">{emptyMessage}</p>
      )}

      <MarketPulse
        metrics={metrics}
        assetClass={assetClass}
        rangeLabel={rangeLabel}
        currency={currency}
        unavailableLabel={unavailableLabel}
      />
    </div>
  );
}
