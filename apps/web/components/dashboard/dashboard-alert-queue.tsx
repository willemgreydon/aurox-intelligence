import Link from 'next/link';
import { DashboardPanel } from './dashboard-panel';
import type { DashboardExecutiveViewModel } from '../../server/services/dashboard-executive-service';

export function DashboardAlertQueue({ model }: { model: DashboardExecutiveViewModel }) {
  return (
    <DashboardPanel eyebrow="Alert Queue" title="Escalation queue" description="Critical and warning items first." href="/alerts">
      <div className="dashboard-exec-list">
        {model.alertQueue.length === 0 ? <p className="text-muted">No active alerts.</p> : model.alertQueue.map((row) => (
          <article key={row.id} className="dashboard-exec-list__item">
            <strong>{row.title}</strong>
            <span className={`status-pill status-pill--${row.severity === 'CRITICAL' ? 'danger' : row.severity === 'WARNING' ? 'warning' : row.severity === 'WATCH' ? 'info' : 'success'}`}>{row.severity}</span>
            <span className="text-muted">{row.symbol ?? 'n/a'} · {row.status}</span>
            <Link href={row.href}>Replay</Link>
          </article>
        ))}
      </div>
    </DashboardPanel>
  );
}
