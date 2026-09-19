import { DashboardPanel } from './dashboard-panel';
import type { AppMessages } from '../../lib/i18n/messages';
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

export function DashboardProviderHealth({ model, messages }: { model: DashboardExecutiveViewModel; messages: AppMessages }) {
  const t = messages.dashboard.panels;
  const state = deriveProviderState(model.providerHealth);
  return (
    <DashboardPanel eyebrow={t.providerEyebrow} title={t.providerTitle} description={model.providerHealth.summary} href="/admin/monitoring/providers">
      <div className="dashboard-exec-list">
        <article className="dashboard-exec-list__item">
          <strong>{t.statusLabel}</strong>
          <span className={`status-pill status-pill--xs status-pill--${state.tone}`}>{state.label}</span>
        </article>
        <article className="dashboard-exec-list__item">
          <strong>{t.healthy}</strong>
          <span className="num-bubble num-bubble--success num-bubble--small" aria-label={`${model.providerHealth.healthy} healthy providers`}>{model.providerHealth.healthy}</span>
        </article>
        <article className="dashboard-exec-list__item">
          <strong>{t.degraded}</strong>
          <span className={`num-bubble num-bubble--small ${model.providerHealth.degraded > 0 ? 'num-bubble--warning' : 'num-bubble--muted'}`} aria-label={`${model.providerHealth.degraded} degraded providers`}>{model.providerHealth.degraded}</span>
        </article>
        <article className="dashboard-exec-list__item">
          <strong>{t.total}</strong>
          <span className="num-bubble num-bubble--neutral num-bubble--small" aria-label={`${model.providerHealth.total} providers total`}>{model.providerHealth.total}</span>
        </article>
      </div>
    </DashboardPanel>
  );
}
