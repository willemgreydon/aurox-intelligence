import { Card } from '../ui/card';
import { Section } from '../ui/section';
import { StatusBadge } from '../ui/status-badge';

type SystemStatusSectionProps = {
  labels: {
    eyebrow: string;
    title: string;
    description: string;
    systemStatusTitle: string;
    systemStatusBody: string;
    systemStatusBadge: string;
    roadmapTitle: string;
    roadmapBody: string;
    systems: Array<{
      name: string;
      detail: string;
      label: string;
      tone: string;
    }>;
    roadmap: Array<{
      title: string;
      detail: string;
    }>;
  };
};

export function SystemStatusSection({ labels }: SystemStatusSectionProps) {
  function resolveTone(tone: string): 'success' | 'warning' | 'danger' | 'info' {
    if (tone === 'warning' || tone === 'danger' || tone === 'info') {
      return tone;
    }

    return 'success';
  }

  return (
    <Section>
      <div className="section__header">
        <div className="section__eyebrow">{labels.eyebrow}</div>
        <h2 className="section__title">{labels.title}</h2>
        <p className="section__description">{labels.description}</p>
      </div>

      <div className="status-grid">
        <Card className="status-card">
          <div className="status-card__meta">
            <div>
              <h3 className="status-card__title">{labels.systemStatusTitle}</h3>
              <p className="status-card__body">{labels.systemStatusBody}</p>
            </div>
            <StatusBadge tone="success">{labels.systemStatusBadge}</StatusBadge>
          </div>

          <div className="status-list">
            {labels.systems.map((system) => (
              <article key={system.name} className="status-list__item">
                <div>
                  <div className="status-list__name">{system.name}</div>
                  <p className="status-list__detail">{system.detail}</p>
                </div>
                <StatusBadge tone={resolveTone(system.tone)}>{system.label}</StatusBadge>
              </article>
            ))}
          </div>
        </Card>

        <Card className="status-card" tone="ghost">
          <h3 className="status-card__title">{labels.roadmapTitle}</h3>
          <p className="status-card__body">{labels.roadmapBody}</p>

          <div className="roadmap roadmap--spaced">
            {labels.roadmap.map((item) => (
              <article key={item.title} className="roadmap__item">
                <div className="roadmap__title">{item.title}</div>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>
        </Card>
      </div>
    </Section>
  );
}
