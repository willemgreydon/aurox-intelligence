import type { CSSProperties } from 'react';
import type { DashboardViewModel } from '../../server/mappers/dashboard-mapper';
import { StatusBadge } from '../ui/status-badge';

type ForecastSummaryCardProps = {
  forecast: DashboardViewModel['forecastOverview']['items'][number];
};

const BIAS_GLYPH: Record<'bullish' | 'bearish' | 'neutral', string> = {
  bullish: '▲',
  bearish: '▼',
  neutral: '—',
};

export function ForecastSummaryCard({ forecast }: ForecastSummaryCardProps) {
  const glyph = BIAS_GLYPH[forecast.directionalBias];
  const hasScore = typeof forecast.confidenceScore === 'number';
  const confidencePct = hasScore ? Math.round((forecast.confidenceScore ?? 0) * 100) : null;
  const confidenceVars = { '--confidence-pct': `${confidencePct ?? 0}%` } as CSSProperties;

  return (
    <article className="forecast-card surface surface--ghost gt-hover-lift">
      <div className="surface__inner forecast-card__inner">
        <header className="forecast-card__header">
          <div>
            <div className="forecast-card__symbol">{forecast.symbol}</div>
            <h3 className="forecast-card__title">{forecast.assetName}</h3>
          </div>
          <span className="forecast-card__bias">
            <span
              className={`forecast-card__bias-glyph forecast-card__bias-glyph--${forecast.directionalBias}`}
              aria-hidden="true"
            >
              {glyph}
            </span>
            <StatusBadge tone={forecast.biasTone}>{forecast.biasLabel}</StatusBadge>
          </span>
        </header>

        <dl className="forecast-card__facts">
          <div>
            <dt>Asset class</dt>
            <dd>{forecast.assetClass.toUpperCase()}</dd>
          </div>
          <div>
            <dt>Horizon</dt>
            <dd>{forecast.horizon}</dd>
          </div>
          <div>
            <dt>Confidence</dt>
            <dd>{forecast.confidenceLabel}</dd>
          </div>
          <div>
            <dt>Produced</dt>
            <dd>{forecast.producedAtLabel}</dd>
          </div>
        </dl>

        {hasScore ? (
          <div
            className="forecast-card__confidence"
            data-tone={forecast.biasTone}
            style={confidenceVars}
            role="img"
            aria-label={`Confidence ${confidencePct}%`}
          >
            <div className="forecast-card__confidence-track">
              <div className="forecast-card__confidence-fill" />
            </div>
            <span className="forecast-card__confidence-value">{confidencePct}%</span>
          </div>
        ) : null}

        <div className="forecast-card__body">
          <div>
            <h4>Key driver summary</h4>
            <p>{forecast.keyDriverSummary}</p>
          </div>
          <div>
            <h4>Risk summary</h4>
            <p>{forecast.riskSummary}</p>
          </div>
        </div>
      </div>
    </article>
  );
}
