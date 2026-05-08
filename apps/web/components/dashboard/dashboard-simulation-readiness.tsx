import { DashboardPanel } from './dashboard-panel';
import type { DashboardExecutiveViewModel } from '../../server/services/dashboard-executive-service';

export function DashboardSimulationReadiness({ model }: { model: DashboardExecutiveViewModel }) {
  return (
    <DashboardPanel eyebrow="Simulation Readiness" title="Guardrail status" description="Trade readiness remains simulation-only." href="/invest/simulation">
      <div className="dashboard-exec-list">
        <article className="dashboard-exec-list__item">
          <strong>{model.simulationReadiness.symbol ?? 'No symbol selected'}</strong>
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
