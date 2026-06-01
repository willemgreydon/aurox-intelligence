import Link from 'next/link';
import { DashboardPanel } from './dashboard-panel';
import type { DashboardExecutiveViewModel } from '../../server/services/dashboard-executive-service';

export function DashboardAssetClassSnapshot({ model }: { model: DashboardExecutiveViewModel }) {
  return (
    <DashboardPanel eyebrow="Asset Classes" title="Stocks, ETFs, Crypto overview" description="Coverage and confidence by lane.">
      <div className="dashboard-exec-list">
        {model.assetClassSnapshot.length === 0 ? <p className="text-muted">Unavailable</p> : model.assetClassSnapshot.map((row) => (
          <article key={row.assetClass} className="dashboard-exec-list__item">
            <strong>{row.assetClass.toUpperCase()}</strong>
            <span>
              <span className="num-bubble num-bubble--info num-bubble--small" aria-label={`${row.count} assets`}>{row.count}</span> assets
            </span>
            <span className="text-muted">{row.avgConfidence}</span>
            <Link href={row.href}>Open lane</Link>
          </article>
        ))}
      </div>
    </DashboardPanel>
  );
}
