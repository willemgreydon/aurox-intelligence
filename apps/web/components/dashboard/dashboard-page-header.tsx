import Link from 'next/link';
import type { DashboardViewModel } from '../../server/mappers/dashboard-mapper';
import { StatusBadge } from '../ui/status-badge';

type DashboardPageHeaderProps = {
  overview: DashboardViewModel['overview'];
  labels: {
    eyebrow: string;
    lastUpdated: string;
    freshness: string;
    destinations: string;
  };
};

export function DashboardPageHeader({ overview, labels }: DashboardPageHeaderProps) {
  return (
    <header className="dashboard-page-header surface surface--accent">
      <div className="surface__inner dashboard-page-header__inner">
        <div className="dashboard-page-header__content">
          <div className="section__eyebrow">{labels.eyebrow}</div>
          <div className="dashboard-page-header__headline">
            <div>
              <h1 className="dashboard-page-header__title">{overview.title}</h1>
              <p className="dashboard-page-header__description">{overview.description}</p>
            </div>
            <StatusBadge tone={overview.statusTone}>{overview.statusLabel}</StatusBadge>
          </div>

          <p className="dashboard-page-header__summary">{overview.freshnessSummary}</p>

          <dl className="dashboard-page-header__meta">
            <div>
              <dt>{labels.lastUpdated}</dt>
              <dd>{overview.lastUpdatedLabel}</dd>
            </div>
            <div>
              <dt>{labels.freshness}</dt>
              <dd>{overview.freshnessLabel}</dd>
            </div>
          </dl>
        </div>

        {overview.callToActions.length > 0 ? (
          <details className="dashboard-page-header__destinations">
            <summary className="dashboard-page-header__destinations-toggle">{labels.destinations}</summary>
            <nav className="dashboard-page-header__actions" aria-label={labels.destinations}>
              {overview.callToActions.map((action) => (
                <Link key={action.href + action.label} href={action.href} className="dashboard-page-header__quicklink">
                  {action.label}
                </Link>
              ))}
            </nav>
          </details>
        ) : null}
      </div>
    </header>
  );
}
