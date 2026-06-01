import { DashboardPanel } from './dashboard-panel';
import type { DashboardExecutiveViewModel } from '../../server/services/dashboard-executive-service';

/**
 * Derive a single provider data-state pill from the health counts.
 * No real data → OFFLINE; any degraded → DEGRADED; otherwise LIVE.
 */
function deriveProviderState(health: DashboardExecutiveViewModel['providerHealth']): {
  label: 'LIVE' | 'DEGRADED' | 'OFFLINE';
  tone: 'live' | 'degraded' | 'offline';
} {
  if (health.total === 0) return { label: 'OFFLINE', tone: 'offline' };
  if (health.degraded > 0) return { label: 'DEGRADED', tone: 'degraded' };
  return { label: 'LIVE', tone: 'live' };
}

export function DashboardProviderHealth({ model }: { model: DashboardExecutiveViewModel }) {
  const state = deriveProviderState(model.providerHealth);
  return (
    <DashboardPanel eyebrow="Provider Health" title="Data/provider status" description={model.providerHealth.summary} href="/admin/monitoring/providers">
      <div className="dashboard-exec-list">
        <article className="dashboard-exec-list__item">
          <strong>Status</strong>
          <span className={`status-pill status-pill--xs status-pill--${state.tone}`}>{state.label}</span>
        </article>
        <article className="dashboard-exec-list__item">
          <strong>Healthy</strong>
          <span className="num-bubble num-bubble--success num-bubble--small" aria-label={`${model.providerHealth.healthy} healthy providers`}>{model.providerHealth.healthy}</span>
        </article>
        <article className="dashboard-exec-list__item">
          <strong>Degraded</strong>
          <span className={`num-bubble num-bubble--small ${model.providerHealth.degraded > 0 ? 'num-bubble--warning' : 'num-bubble--muted'}`} aria-label={`${model.providerHealth.degraded} degraded providers`}>{model.providerHealth.degraded}</span>
        </article>
        <article className="dashboard-exec-list__item">
          <strong>Total</strong>
          <span className="num-bubble num-bubble--neutral num-bubble--small" aria-label={`${model.providerHealth.total} providers total`}>{model.providerHealth.total}</span>
        </article>
      </div>
    </DashboardPanel>
  );
}
