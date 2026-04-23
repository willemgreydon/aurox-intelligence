import Link from 'next/link';
import { StatusBadge } from '../ui/status-badge';

type WorkspaceLinkCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  linkLabel: string;
  statusLabel: string;
  statusTone: 'success' | 'warning' | 'danger' | 'info';
  meta: Array<{
    label: string;
    value: string;
  }>;
};

export function WorkspaceLinkCard({
  eyebrow,
  title,
  description,
  href,
  linkLabel,
  statusLabel,
  statusTone,
  meta,
}: WorkspaceLinkCardProps) {
  return (
    <article className="module-panel surface">
      <div className="surface__inner module-panel__inner">
        <div className="module-panel__meta">
          <div className="module-panel__eyebrow">{eyebrow}</div>
          <StatusBadge tone={statusTone}>{statusLabel}</StatusBadge>
        </div>
        <h3 className="module-panel__title">{title}</h3>
        <p className="module-panel__description">{description}</p>
        <dl className="workspace-link-card__meta">
          {meta.map((item) => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
        <Link href={href} className="module-panel__link">
          {linkLabel}
        </Link>
      </div>
    </article>
  );
}
