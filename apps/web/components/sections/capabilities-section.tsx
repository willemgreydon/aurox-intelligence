import { Card } from '../ui/card';
import { Section } from '../ui/section';

type CapabilitiesSectionProps = {
  labels: {
    eyebrow: string;
    title: string;
    description: string;
    items: Array<{
      title: string;
      description: string;
    }>;
  };
};

export function CapabilitiesSection({ labels }: CapabilitiesSectionProps) {
  return (
    <Section className="section section--tinted">
      <div className="section__header">
        <div className="section__eyebrow">{labels.eyebrow}</div>
        <h2 className="section__title">{labels.title}</h2>
        <p className="section__description">{labels.description}</p>
      </div>

      <div className="card-grid card-grid--three">
        {labels.items.map((capability) => (
          <Card key={capability.title} className="capability-card">
            <article>
              <h3 className="capability-card__title">{capability.title}</h3>
              <p className="capability-card__body">{capability.description}</p>
            </article>
          </Card>
        ))}
      </div>
    </Section>
  );
}
