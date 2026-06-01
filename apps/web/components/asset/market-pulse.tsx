import {
  classifyVolatility,
  classifyVolumeIntensity,
  type RangeMetrics,
} from '../../lib/market-pulse';

type MarketPulseProps = {
  metrics: RangeMetrics;
  assetClass: 'stock' | 'etf' | 'crypto';
  rangeLabel: string;
  /** Display currency for price values. */
  currency?: 'USD' | 'EUR';
  unavailableLabel: string;
};

function fmtPrice(value: number | null, currency: 'USD' | 'EUR', unavailable: string): string {
  if (value === null || !Number.isFinite(value)) return unavailable;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
}

function fmtPct(value: number | null, unavailable: string): string {
  if (value === null || !Number.isFinite(value)) return unavailable;
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function fmtCompact(value: number | null, unavailable: string): string {
  if (value === null || !Number.isFinite(value)) return unavailable;
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

const volBandLabel: Record<string, string> = {
  low: 'Low volatility',
  moderate: 'Moderate volatility',
  elevated: 'Elevated volatility',
  high: 'High volatility',
};

const volBandTone: Record<string, string> = {
  low: 'pulse-meter--positive',
  moderate: 'pulse-meter--neutral',
  elevated: 'pulse-meter--warning',
  high: 'pulse-meter--negative',
};

const volBandFill: Record<string, number> = { low: 0.25, moderate: 0.5, elevated: 0.75, high: 1 };

const liqBandLabel: Record<string, string> = {
  thin: 'Thin activity',
  moderate: 'Moderate activity',
  deep: 'Above-average activity',
  unknown: 'Activity unavailable',
};

/**
 * Market Pulse infographic — a scannable, real-data view derived purely from
 * OHLCV. Renders only what the data supports; every metric falls back to the
 * unavailable label rather than fabricating a value. Includes a text-first
 * range summary so the visual is not the only carrier of meaning (a11y).
 */
export function MarketPulse({ metrics, assetClass, rangeLabel, currency = 'USD', unavailableLabel }: MarketPulseProps) {
  if (!metrics.hasData) {
    return (
      <div className="market-pulse market-pulse--empty" role="group" aria-label="Market pulse">
        <p className="market-pulse__empty">
          Not enough historical data from the current provider to compute pulse metrics for this {assetClass}.
        </p>
      </div>
    );
  }

  const volBand = classifyVolatility(metrics.realizedVolatilityPct, assetClass);
  const liqBand = classifyVolumeIntensity(metrics.volumeIntensity);
  const positionPct = metrics.rangePosition !== null ? Math.round(metrics.rangePosition * 100) : null;

  const returnTone =
    metrics.rangeReturnPct === null
      ? 'neutral'
      : metrics.rangeReturnPct > 0
        ? 'positive'
        : metrics.rangeReturnPct < 0
          ? 'negative'
          : 'neutral';

  return (
    <div className="market-pulse" role="group" aria-label={`Market pulse over ${rangeLabel}`}>
      {/* Text-first summary for screen readers and quick scanning. */}
      <p className="market-pulse__summary">
        {rangeLabel} range: <strong className={`market-pulse__return market-pulse__return--${returnTone}`}>{fmtPct(metrics.rangeReturnPct, unavailableLabel)}</strong>
        {' · '}High {fmtPrice(metrics.high, currency, unavailableLabel)}
        {' · '}Low {fmtPrice(metrics.low, currency, unavailableLabel)}
        {metrics.realizedVolatilityPct !== null ? ` · Volatility ${metrics.realizedVolatilityPct.toFixed(0)}% ann.` : ''}
      </p>

      {/* Range position bar: where the latest price sits in [low, high]. */}
      {metrics.rangePosition !== null ? (
        <div className="pulse-range">
          <div className="pulse-range__labels">
            <span>{fmtPrice(metrics.low, currency, unavailableLabel)}</span>
            <span className="pulse-range__caption">Range position{positionPct !== null ? ` · ${positionPct}%` : ''}</span>
            <span>{fmtPrice(metrics.high, currency, unavailableLabel)}</span>
          </div>
          <div
            className="pulse-range__track"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={positionPct ?? 0}
            aria-label="Latest price position within the range"
          >
            <span className="pulse-range__marker" style={{ left: `${positionPct ?? 0}%` }} aria-hidden="true" />
          </div>
        </div>
      ) : null}

      <div className="pulse-metric-grid">
        <div className="pulse-metric">
          <span className="pulse-metric__label">{rangeLabel} return</span>
          <span className={`pulse-metric__value pulse-metric__value--${returnTone}`}>{fmtPct(metrics.rangeReturnPct, unavailableLabel)}</span>
        </div>
        <div className="pulse-metric">
          <span className="pulse-metric__label">{rangeLabel} high</span>
          <span className="pulse-metric__value">{fmtPrice(metrics.high, currency, unavailableLabel)}</span>
        </div>
        <div className="pulse-metric">
          <span className="pulse-metric__label">{rangeLabel} low</span>
          <span className="pulse-metric__value">{fmtPrice(metrics.low, currency, unavailableLabel)}</span>
        </div>
        <div className="pulse-metric">
          <span className="pulse-metric__label">Realized vol (ann.)</span>
          <span className="pulse-metric__value">
            {metrics.realizedVolatilityPct !== null ? `${metrics.realizedVolatilityPct.toFixed(0)}%` : unavailableLabel}
          </span>
        </div>
        <div className="pulse-metric">
          <span className="pulse-metric__label">Latest volume</span>
          <span className="pulse-metric__value">{fmtCompact(metrics.latestVolume, unavailableLabel)}</span>
        </div>
        <div className="pulse-metric">
          <span className="pulse-metric__label">Avg volume</span>
          <span className="pulse-metric__value">{fmtCompact(metrics.averageVolume, unavailableLabel)}</span>
        </div>
      </div>

      <div className="pulse-bands">
        {volBand ? (
          <div className={`pulse-meter ${volBandTone[volBand]}`}>
            <div className="pulse-meter__head">
              <span>{volBandLabel[volBand]}</span>
              <span className="pulse-meter__sub">
                {assetClass === 'crypto' ? 'Crypto-adjusted scale' : 'vs typical range'}
              </span>
            </div>
            <div className="pulse-meter__track" aria-hidden="true">
              <span className="pulse-meter__fill" style={{ width: `${Math.round((volBandFill[volBand] ?? 0) * 100)}%` }} />
            </div>
          </div>
        ) : null}
        <div className="pulse-meter pulse-meter--neutral">
          <div className="pulse-meter__head">
            <span>{liqBandLabel[liqBand]}</span>
            <span className="pulse-meter__sub">
              {metrics.volumeIntensity !== null ? `${metrics.volumeIntensity.toFixed(2)}× avg` : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
