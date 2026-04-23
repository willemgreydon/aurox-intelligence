import Link from 'next/link';
import { Card } from '../ui/card';
import { Section } from '../ui/section';

type ModulesSectionProps = {
  labels: {
    eyebrow: string;
    title: string;
    description: string;
    enterModule: string;
    items: Array<{
      eyebrow: string;
      title: string;
      description: string;
      href: string;
    }>;
  };
};

export function ModulesSection({ labels }: ModulesSectionProps) {
  return (
    <Section>
      <div className="section__header">
        <div className="section__eyebrow">{labels.eyebrow}</div>
        <h2 className="section__title">{labels.title}</h2>
        <p className="section__description">{labels.description}</p>
      </div>

      <div className="card-grid card-grid--two">
        {labels.items.map((module) => (
          <Card key={module.title} className="module-card" tone="ghost">
            <article>
              <div className="module-card__eyebrow">{module.eyebrow}</div>
              <h3 className="module-card__title">{module.title}</h3>
              <p className="module-card__body">{module.description}</p>
              <Link href={module.href} className="module-card__link">
                {labels.enterModule}
              </Link>
            </article>
          </Card>
        ))}
      </div>
    </Section>
  );
}
