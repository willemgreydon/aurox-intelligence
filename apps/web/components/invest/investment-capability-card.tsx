import { Card } from '../ui/card';

type CapabilityTone = 'success' | 'warning' | 'danger' | 'info';

export interface InvestmentCapabilityCardProps {
  title: string;
  description: string;
  statusLabel?: string;
  statusTone?: CapabilityTone;
  supportedActions?: readonly string[];
  constraints?: readonly string[];
  notes?: readonly string[];
  footer?: string;
}

function normalizeItems(items?: readonly string[]): string[] {
  if (!items) return [];
  return items.map((item) => item.trim()).filter(Boolean);
}

function renderList(items: readonly string[], emptyLabel: string) {
  if (items.length === 0) {
    return <p style={{ margin: 0, opacity: 0.72 }}>{emptyLabel}</p>;
  }

  return (
    <ul className="detail-slot-card__list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function InvestmentCapabilityCard({
  title,
  description,
  statusLabel = 'Available',
  statusTone = 'info',
  supportedActions,
  constraints,
  notes,
  footer,
}: InvestmentCapabilityCardProps) {
  const actionItems = normalizeItems(supportedActions);
  const constraintItems = normalizeItems(constraints);
  const noteItems = normalizeItems(notes);

  return (
    <Card className="analytics-card">
      <div className="analytics-card__header">
        <div>
          <div className="section__eyebrow">Investment capability</div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <span className={`status-pill status-pill--${statusTone}`}>{statusLabel}</span>
      </div>

      <div
        className="analytics-card__body"
        style={{ display: 'grid', gap: '1rem' }}
      >
        <section>
          <div className="section__eyebrow" style={{ marginBottom: '0.5rem' }}>
            Supported actions
          </div>
          {renderList(actionItems, 'No supported actions declared yet.')}
        </section>

        <section>
          <div className="section__eyebrow" style={{ marginBottom: '0.5rem' }}>
            Constraints
          </div>
          {renderList(constraintItems, 'No constraints declared yet.')}
        </section>

        <section>
          <div className="section__eyebrow" style={{ marginBottom: '0.5rem' }}>
            Notes
          </div>
          {renderList(noteItems, 'No additional notes.')}
        </section>

        {footer ? (
          <div
            style={{
              paddingTop: '0.25rem',
              borderTop: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
              opacity: 0.9,
            }}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </Card>
  );
}