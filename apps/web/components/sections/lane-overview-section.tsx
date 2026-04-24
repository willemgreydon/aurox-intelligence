import Link from 'next/link';
import { Card } from '../ui/card';
import { Section } from '../ui/section';
import { StatusBadge } from '../ui/status-badge';

type LaneOverviewSectionProps = {
  labels: {
    eyebrow: string;
    title: string;
    description: string;
    enterLane: string;
    flowSteps: string[];
    items: Array<{
      label: string;
      title: string;
      description: string;
      features: string[];
      href: string;
      statusLabel: string;
    }>;
  };
};

function resolveTone(statusLabel: string): 'success' | 'warning' | 'danger' | 'info' {
  if (statusLabel.toLowerCase() === 'gated') {
    return 'info';
  }

  return 'success';
}

export function LaneOverviewSection({ labels }: LaneOverviewSectionProps) {
  return (
    <Section className="lane-overview section section--tinted">
      <header className="lane-overview__header">
        <div className="section__eyebrow">{labels.eyebrow}</div>
        <h2 className="section__title">{labels.title}</h2>
        <p className="section__description">{labels.description}</p>
      </header>

      <ol className="lane-flow" aria-label="Platform data and execution flow">
        {labels.flowSteps.map((step) => (
          <li key={step} className="lane-flow__step">
            {step}
          </li>
        ))}
      </ol>

      <div className="lane-grid">
        {labels.items.map((lane) => (
          <Card key={lane.title} className="lane-card" tone="ghost">
            <article>
              <div className="lane-card__meta">
                <div className="lane-card__eyebrow">{lane.label}</div>
                <StatusBadge tone={resolveTone(lane.statusLabel)}>{lane.statusLabel}</StatusBadge>
              </div>
              <h3 className="lane-card__title">{lane.title}</h3>
              <p className="lane-card__text">{lane.description}</p>
              <ul className="lane-card__meta" aria-label={`${lane.title} highlights`}>
                {lane.features.map((feature) => (
                  <li key={feature} className="pill">
                    {feature}
                  </li>
                ))}
              </ul>
              <Link href={lane.href} className="module-card__link">
                {labels.enterLane}
              </Link>
            </article>
          </Card>
        ))}
      </div>
    </Section>
  );
}
