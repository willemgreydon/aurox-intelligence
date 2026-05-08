import Link from 'next/link';
import { DashboardPanel } from './dashboard-panel';
import type { DashboardExecutiveViewModel } from '../../server/services/dashboard-executive-service';

export function DashboardObservationSummary({ model }: { model: DashboardExecutiveViewModel }) {
  return (
    <DashboardPanel eyebrow="Top Observations" title="Explainable observation queue" description="Most relevant observer outputs." href="/observe">
      <div className="dashboard-exec-list">
        {model.observations.length === 0 ? <p className="text-muted">Unavailable</p> : model.observations.map((row) => (
          <article key={row.id} className="dashboard-exec-list__item">
            <strong>{row.title}</strong>
            <span className={`status-pill status-pill--${row.severity === 'CRITICAL' ? 'danger' : row.severity === 'WARNING' ? 'warning' : row.severity === 'WATCH' ? 'info' : 'success'}`}>{row.severity}</span>
            <p className="text-muted">{row.reason}</p>
            <Link href={row.href}>Inspect</Link>
          </article>
        ))}
      </div>
    </DashboardPanel>
  );
}
