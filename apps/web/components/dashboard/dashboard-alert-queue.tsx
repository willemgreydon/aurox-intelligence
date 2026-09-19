import Link from 'next/link';
import { DashboardPanel } from './dashboard-panel';
import type { AppMessages } from '../../lib/i18n/messages';
import type { DashboardExecutiveViewModel } from '../../server/services/dashboard-executive-service';

export function DashboardAlertQueue({ model, messages }: { model: DashboardExecutiveViewModel; messages: AppMessages }) {
  const t = messages.dashboard.panels;
  return (
    <DashboardPanel eyebrow={t.alertEyebrow} title={t.alertTitle} description={t.alertDescription} href="/alerts">
      <div className="dashboard-exec-list">
        {model.alertQueue.length === 0 ? <p className="text-muted">{t.alertEmpty}</p> : model.alertQueue.map((row) => (
          <article key={row.id} className="dashboard-exec-list__item">
            <strong>{row.title}</strong>
            <span className={`status-pill status-pill--${row.severity === 'CRITICAL' ? 'danger' : row.severity === 'WARNING' ? 'warning' : row.severity === 'WATCH' ? 'info' : 'success'}`}>{row.severity}</span>
            <span className="text-muted">{row.symbol ?? 'n/a'} · {row.status}</span>
            <Link href={row.href}>{t.replay}</Link>
          </article>
        ))}
      </div>
    </DashboardPanel>
  );
}
