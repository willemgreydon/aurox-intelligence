import { DashboardPanel } from './dashboard-panel';
import type { DashboardExecutiveViewModel } from '../../server/services/dashboard-executive-service';

export function DashboardMarketPulse({ model }: { model: DashboardExecutiveViewModel }) {
  return (
    <DashboardPanel eyebrow="Market Pulse" title="Live pulse snapshot" description="Top watchlist movers and freshness." href="/market">
      <div className="dashboard-exec-list">
        {model.marketPulse.length === 0 ? <p className="text-muted">Unavailable</p> : model.marketPulse.map((row) => (
          <article key={row.symbol} className="dashboard-exec-list__item">
            <strong>{row.symbol}</strong>
            <span>{row.price}</span>
            <span>{row.move}</span>
            <span className="text-muted">{row.freshness}</span>
          </article>
        ))}
      </div>
    </DashboardPanel>
  );
}
