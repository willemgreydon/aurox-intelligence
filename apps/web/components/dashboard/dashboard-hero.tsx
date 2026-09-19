import Link from 'next/link';
import type { AppMessages } from '../../lib/i18n/messages';
import type { DashboardExecutiveViewModel } from '../../server/services/dashboard-executive-service';

export function DashboardHero({ model, messages }: { model: DashboardExecutiveViewModel; messages: AppMessages }) {
  const t = messages.dashboard.exec;
  return (
    <section className="dashboard-section dashboard-section--hero dashboard-exec-hero">
      <div className="dashboard-exec-hero__inner">
        <div className="section__eyebrow">{t.commandEyebrow}</div>
        <h1>{model.hero.title}</h1>
        <p>{model.hero.subtitle}</p>
        <div className="dashboard-exec-chips">
          {model.hero.chips.map((chip) => (
            <span key={chip.label} className={`status-pill status-pill--${chip.tone}`}>{chip.label}: {chip.value}</span>
          ))}
        </div>
        <div className="dashboard-exec-actions">
          <Link href="/market" className="button">{t.openMarket}</Link>
          <Link href="/observe" className="button button--secondary">{t.openObserver}</Link>
          <Link href="/alerts" className="button button--secondary">{t.openAlerts}</Link>
          <Link href="/invest/simulation" className="button button--secondary">{t.openSimulation}</Link>
        </div>
        <p className="text-muted">{t.shortcutHint}</p>
      </div>
    </section>
  );
}
