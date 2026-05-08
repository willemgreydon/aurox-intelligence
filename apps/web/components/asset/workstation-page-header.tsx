import Link from 'next/link';
import { StatusBadge } from '../ui/status-badge';

type WorkstationPageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  summary: string;
  statusLabel: string;
  statusTone: 'success' | 'warning' | 'danger' | 'info';
  meta: Array<{
    label: string;
    value: string;
  }>;
  actions: Array<{
    href: string;
    label: string;
  }>;
  actionsLabel?: string;
};

export function WorkstationPageHeader({
  eyebrow,
  title,
  description,
  summary,
  statusLabel,
  statusTone,
  meta,
  actions,
  actionsLabel = 'Destinations',
}: WorkstationPageHeaderProps) {
  return (
    <header className="dashboard-page-header">
      <div className="dashboard-page-header__inner">
        <div className="dashboard-page-header__content">
          <div className="section__eyebrow">{eyebrow}</div>
          <div className="dashboard-page-header__headline">
            <div>
              <h1 className="dashboard-page-header__title">{title}</h1>
              <p className="dashboard-page-header__description">{description}</p>
            </div>
            <StatusBadge tone={statusTone}>{statusLabel}</StatusBadge>
          </div>

          <p className="dashboard-page-header__summary">{summary}</p>

          <dl className="dashboard-page-header__meta">
            {meta.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {actions.length > 0 ? (
          <details className="dashboard-page-header__destinations" open>
            <summary className="dashboard-page-header__destinations-toggle">{actionsLabel}</summary>
            <nav className="dashboard-page-header__actions" aria-label={`${title} destinations`}>
              {actions.map((action) => (
                <Link key={action.href} href={action.href} className="dashboard-page-header__quicklink">
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
