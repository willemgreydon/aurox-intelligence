import { DashboardPanel } from './dashboard-panel';
import type { DashboardExecutiveViewModel } from '../../server/services/dashboard-executive-service';

export function DashboardProviderHealth({ model }: { model: DashboardExecutiveViewModel }) {
  return (
    <DashboardPanel eyebrow="Provider Health" title="Data/provider status" description={model.providerHealth.summary} href="/admin/monitoring/providers">
      <div className="dashboard-exec-list">
        <article className="dashboard-exec-list__item">
          <strong>Healthy</strong>
          <span>{model.providerHealth.healthy}</span>
        </article>
        <article className="dashboard-exec-list__item">
          <strong>Degraded</strong>
          <span>{model.providerHealth.degraded}</span>
        </article>
        <article className="dashboard-exec-list__item">
          <strong>Total</strong>
          <span>{model.providerHealth.total}</span>
        </article>
      </div>
    </DashboardPanel>
  );
}
