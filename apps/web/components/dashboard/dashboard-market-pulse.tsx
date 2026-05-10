import { DashboardPanel } from './dashboard-panel';
import type { DashboardExecutiveViewModel } from '../../server/services/dashboard-executive-service';
import type { AppMessages } from '../../lib/i18n/messages';

type Props = {
  model: DashboardExecutiveViewModel;
  labels: {
    eyebrow: string;
    title: string;
    description: string;
    unavailable: string;
  };
};

export function DashboardMarketPulse({ model, labels }: Props) {
  return (
    <DashboardPanel eyebrow={labels.eyebrow} title={labels.title} description={labels.description} href="/watchlist">
      <div className="dashboard-exec-list">
        {model.marketPulse.length === 0 ? (
          <p className="text-muted">{labels.unavailable}</p>
        ) : (
          model.marketPulse.map((row) => (
            <article key={row.symbol} className="dashboard-exec-list__item">
              <strong>{row.symbol}</strong>
              <span>{row.price}</span>
              <span>{row.move}</span>
              <span className="text-muted">{row.freshness}</span>
            </article>
          ))
        )}
      </div>
    </DashboardPanel>
  );
}
