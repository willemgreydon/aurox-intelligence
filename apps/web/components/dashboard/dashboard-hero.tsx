import Link from 'next/link';
import type { DashboardExecutiveViewModel } from '../../server/services/dashboard-executive-service';

export function DashboardHero({ model }: { model: DashboardExecutiveViewModel }) {
  return (
    <section className="dashboard-section dashboard-section--hero dashboard-exec-hero">
      <div className="dashboard-exec-hero__inner">
        <div className="section__eyebrow">Command Header</div>
        <h1>{model.hero.title}</h1>
        <p>{model.hero.subtitle}</p>
        <div className="dashboard-exec-chips">
          {model.hero.chips.map((chip) => (
            <span key={chip.label} className={`status-pill status-pill--${chip.tone}`}>{chip.label}: {chip.value}</span>
          ))}
        </div>
        <div className="dashboard-exec-actions">
          <Link href="/market" className="button">Open Market</Link>
          <Link href="/observe" className="button button--secondary">Open Observer</Link>
          <Link href="/alerts" className="button button--secondary">Open Alerts</Link>
          <Link href="/invest/simulation" className="button button--secondary">Open Simulation</Link>
        </div>
        <p className="text-muted">Press Ctrl/Cmd+K to jump anywhere.</p>
      </div>
    </section>
  );
}
