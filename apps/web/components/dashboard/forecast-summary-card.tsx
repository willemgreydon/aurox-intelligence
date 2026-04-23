import type { DashboardViewModel } from '../../server/mappers/dashboard-mapper';
import { StatusBadge } from '../ui/status-badge';

type ForecastSummaryCardProps = {
  forecast: DashboardViewModel['forecastOverview']['items'][number];
};

export function ForecastSummaryCard({ forecast }: ForecastSummaryCardProps) {
  return (
    <article className="forecast-card surface surface--ghost">
      <div className="surface__inner forecast-card__inner">
        <header className="forecast-card__header">
          <div>
            <div className="forecast-card__symbol">{forecast.symbol}</div>
            <h3 className="forecast-card__title">{forecast.assetName}</h3>
          </div>
          <StatusBadge tone={forecast.biasTone}>{forecast.biasLabel}</StatusBadge>
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
