import Link from 'next/link';
import { DashboardPanel } from './dashboard-panel';
import type { AppMessages } from '../../lib/i18n/messages';
import type { DashboardExecutiveViewModel } from '../../server/services/dashboard-executive-service';

export function DashboardObservationSummary({ model, messages }: { model: DashboardExecutiveViewModel; messages: AppMessages }) {
  const t = messages.dashboard.panels;
  return (
    <DashboardPanel eyebrow={t.obsEyebrow} title={t.obsTitle} description={t.obsDescription} href="/observe">
      <div className="dashboard-exec-list">
        {model.observations.length === 0 ? <p className="text-muted">{t.obsEmpty}</p> : model.observations.map((row) => (
          <article key={row.id} className="dashboard-exec-list__item">
            <strong>{row.title}</strong>
            <span className={`status-pill status-pill--${row.severity === 'CRITICAL' ? 'danger' : row.severity === 'WARNING' ? 'warning' : row.severity === 'WATCH' ? 'info' : 'success'}`}>{row.severity}</span>
            <p className="text-muted">{row.reason}</p>
            <Link href={row.href}>{t.inspect}</Link>
          </article>
        ))}
      </div>
    </DashboardPanel>
  );
}
