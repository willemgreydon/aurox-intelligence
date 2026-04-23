import type { MarketInsightSummary } from '@repo/api-contracts';
import { Card } from '../ui/card';
import { StatusBadge } from '../ui/status-badge';

type MarketIntelligenceCardProps = {
  insight: MarketInsightSummary | null;
};

function mapTone(stance: MarketInsightSummary['stance']) {
  if (stance === 'positive') {
    return 'success' as const;
  }

  if (stance === 'negative') {
    return 'danger' as const;
  }

  return 'info' as const;
}

export function MarketIntelligenceCard({ insight }: MarketIntelligenceCardProps) {
  return (
    <Card className="analytics-card analytics-card--callout">
      <div className="analytics-card__header">
        <div>
          <div className="section__eyebrow">AI market intelligence</div>
          <h3>{insight?.headline ?? 'Structured market interpretation pending'}</h3>
          <p>{insight?.summary ?? 'No structured market intelligence output is currently available for this surface.'}</p>
        </div>
        {insight ? <StatusBadge tone={mapTone(insight.stance)}>{insight.stance}</StatusBadge> : null}
      </div>
      <div className="analytics-card__body">
        <ul className="detail-slot-card__list">
          {(insight?.factors ?? []).map((factor) => (
            <li key={factor.key}>
              <strong>{factor.label}:</strong> {factor.value}
            </li>
          ))}
          {insight?.riskFlags[0] ? <li>{insight.riskFlags[0].detail}</li> : <li>AI enrichment will remain explicitly partial until more structured inputs arrive.</li>}
        </ul>
      </div>
    </Card>
  );
}
