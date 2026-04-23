import { Card } from '../ui/card';
import { Section } from '../ui/section';

type ExplainabilitySectionProps = {
  labels: {
    eyebrow: string;
    title: string;
    description: string;
    dataFlowEyebrow: string;
    kpis: Array<{
      label: string;
      value: string;
    }>;
    flow: Array<{
      title: string;
      description: string;
      value: string;
    }>;
  };
};

export function ExplainabilitySection({ labels }: ExplainabilitySectionProps) {
  return (
    <Section className="section section--tinted">
      <div className="status-grid">
        <Card className="explainability-card">
          <div className="section__eyebrow">{labels.eyebrow}</div>
          <h2 className="explainability-card__title">{labels.title}</h2>
          <p className="explainability-card__body">{labels.description}</p>

          <div className="kpi-strip kpi-strip--spaced">
            {labels.kpis.map((item) => (
              <div key={item.label} className="kpi-strip__item">
                <div className="kpi-strip__label">{item.label}</div>
                <div className="kpi-strip__value">{item.value}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="explainability-card" tone="ghost">
          <div className="section__eyebrow">{labels.dataFlowEyebrow}</div>
          <div className="data-flow">
            {labels.flow.map((step, index) => (
              <article key={step.title} className="data-flow__row">
                <div className="data-flow__index">0{index + 1}</div>
                <div>
                  <div className="data-flow__title">{step.title}</div>
                  <p className="data-flow__body">{step.description}</p>
                </div>
                <div className="data-flow__value">{step.value}</div>
              </article>
            ))}
          </div>
        </Card>
      </div>
    </Section>
  );
}
