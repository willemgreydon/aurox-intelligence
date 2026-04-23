import { StatusBadge } from '../ui/status-badge';

type OperationalStatusCardProps = {
  eyebrow: string;
  title: string;
  summary: string;
  detail: string;
  statusLabel: string;
  statusTone: 'success' | 'warning' | 'danger' | 'info';
  timestampLabel: string;
};

export function OperationalStatusCard({
  eyebrow,
  title,
  summary,
  detail,
  statusLabel,
  statusTone,
  timestampLabel,
}: OperationalStatusCardProps) {
  return (
    <article className="surface ops-card">
      <div className="surface__inner ops-card__inner">
        <div className="ops-card__meta">
          <div className="ops-card__eyebrow">{eyebrow}</div>
          <StatusBadge tone={statusTone}>{statusLabel}</StatusBadge>
        </div>
        <h3 className="ops-card__title">{title}</h3>
        <p className="ops-card__summary">{summary}</p>
        <p className="ops-card__detail">{detail}</p>
        <div className="ops-card__timestamp">{timestampLabel}</div>
      </div>
    </article>
  );
}
