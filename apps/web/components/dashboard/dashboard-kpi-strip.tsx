import Link from 'next/link';
import type { AppMessages } from '../../lib/i18n/messages';
import type { DashboardExecutiveViewModel } from '../../server/services/dashboard-executive-service';

export function DashboardKpiStrip({ model, messages }: { model: DashboardExecutiveViewModel; messages: AppMessages }) {
  return (
    <section className="dashboard-section dashboard-section--compact">
      <div className="dashboard-exec-kpi-strip gt-rise-stagger">
        {model.kpis.map((kpi) => (
          <article key={kpi.id} className="analytics-card dashboard-exec-kpi gt-hover-lift">
            <div className="analytics-stat__label">{kpi.label}</div>
            <div className="analytics-stat__value">{kpi.value}</div>
            <p className="text-muted">{kpi.detail}</p>
            <div>
              <span className={`status-pill status-pill--${kpi.tone}`}>{kpi.tone}</span>
            </div>
            <Link href={kpi.href} className="dashboard-exec-kpi__link">{messages.dashboard.exec.viewDetails}</Link>
          </article>
        ))}
      </div>
    </section>
  );
}
