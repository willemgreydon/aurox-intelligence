import Link from 'next/link';
import type { DashboardExecutiveViewModel } from '../../server/services/dashboard-executive-service';

export function DashboardKpiStrip({ model }: { model: DashboardExecutiveViewModel }) {
  return (
    <section className="dashboard-section dashboard-section--compact">
      <div className="dashboard-exec-kpi-strip">
        {model.kpis.map((kpi) => (
          <article key={kpi.id} className="analytics-card dashboard-exec-kpi">
            <div className="analytics-stat__label">{kpi.label}</div>
            <div className="analytics-stat__value">{kpi.value}</div>
            <p className="text-muted">{kpi.detail}</p>
            <div>
              <span className={`status-pill status-pill--${kpi.tone}`}>{kpi.tone}</span>
            </div>
            <Link href={kpi.href} className="dashboard-exec-kpi__link">View details</Link>
          </article>
        ))}
      </div>
    </section>
  );
}
