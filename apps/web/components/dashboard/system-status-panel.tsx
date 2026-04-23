import type { DashboardViewModel } from '../../server/mappers/dashboard-mapper';
import { StatusBadge } from '../ui/status-badge';

type SystemStatusPanelProps = {
  statuses: DashboardViewModel['systemStatuses'];
  readinessNotes: DashboardViewModel['readinessNotes'];
};

export function SystemStatusPanel({ statuses, readinessNotes }: SystemStatusPanelProps) {
  return (
    <div className="dashboard-system-grid">
      <section className="surface dashboard-health-panel" aria-labelledby="system-health-heading">
        <div className="surface__inner">
          <header className="dashboard-section-heading">
            <div>
              <div className="section__eyebrow">System health</div>
              <h2 id="system-health-heading" className="dashboard-section-heading__title">
                Platform readiness and operational visibility
              </h2>
            </div>
          </header>

          <div className="status-stream">
            {statuses.map((status) => (
              <article key={status.id} className="status-stream__item">
                <div className="status-stream__content">
                  <div className="status-stream__header">
                    <h3>{status.name}</h3>
                    <StatusBadge tone={status.statusTone}>{status.statusLabel}</StatusBadge>
                  </div>
                  <p className="status-stream__summary">{status.summary}</p>
                  <p className="status-stream__detail">{status.detail}</p>
                </div>
                <div className="status-stream__timestamp">{status.lastUpdatedLabel}</div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <aside className="surface surface--ghost dashboard-readiness-panel" aria-labelledby="readiness-heading">
        <div className="surface__inner">
          <header className="dashboard-section-heading">
            <div>
              <div className="section__eyebrow">Readiness notes</div>
              <h2 id="readiness-heading" className="dashboard-section-heading__title">
                Ready for live data replacement
              </h2>
            </div>
          </header>

          <ul className="readiness-list">
            {readinessNotes.map((note) => (
              <li key={note} className="readiness-list__item">
                {note}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
