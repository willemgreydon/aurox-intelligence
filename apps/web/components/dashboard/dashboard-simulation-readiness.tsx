import { DashboardPanel } from './dashboard-panel';
import type { AppMessages } from '../../lib/i18n/messages';
import type { DashboardExecutiveViewModel } from '../../server/services/dashboard-executive-service';

export function DashboardSimulationReadiness({ model, messages }: { model: DashboardExecutiveViewModel; messages: AppMessages }) {
  const t = messages.dashboard.panels;
  return (
    <DashboardPanel eyebrow={t.readinessEyebrow} title={t.readinessTitle} description={t.readinessDescription} href="/invest/simulation">
      <div className="dashboard-exec-list">
        <article className="dashboard-exec-list__item">
          <strong>{model.simulationReadiness.symbol ?? t.noSymbol}</strong>
          <span className={`status-pill status-pill--${model.simulationReadiness.status.includes('BLOCKED') ? 'warning' : model.simulationReadiness.status.includes('READY') ? 'success' : 'info'}`}>
            {model.simulationReadiness.status}
          </span>
        </article>
        {model.simulationReadiness.explanation.map((line) => (
          <p key={line} className="text-muted">{line}</p>
        ))}
      </div>
    </DashboardPanel>
  );
}
