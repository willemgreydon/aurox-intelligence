import { Card } from '../ui/card';
import { StatusBadge } from '../ui/status-badge';
import { MiniSparkline } from '../charts/mini-sparkline';

type RecommendationCardProps = {
  symbol: string;
  action: 'accumulate' | 'hold' | 'watch' | 'trim' | 'avoid';
  confidence: number;
  summary: string;
  reasons: string[];
  sparkline?: number[];
  newsRiskFlag?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskLevel?: 'Low' | 'Medium' | 'High' | 'Extreme';
};

function mapTone(action: RecommendationCardProps['action']) {
  if (action === 'accumulate') {
    return 'success' as const;
  }

  if (action === 'avoid' || action === 'trim') {
    return 'danger' as const;
  }

  if (action === 'watch') {
    return 'warning' as const;
  }

  return 'info' as const;
}

export function RecommendationCard({ symbol, action, confidence, summary, reasons, sparkline, newsRiskFlag, riskLevel }: RecommendationCardProps) {
  return (
    <Card className="analytics-card market-card">
      <div className="analytics-card__header">
        <div>
          <div className="section__eyebrow">AI recommendation</div>
          <h3>{symbol}</h3>
          <p>{summary}</p>
        </div>
        <StatusBadge tone={mapTone(action)}>{action}</StatusBadge>
      </div>
      <div className="market-card__chart market-card__chart--recommendation">
        <MiniSparkline points={sparkline} label={`${symbol} recommendation trend`} />
      </div>
      <div className="analytics-card__body">
        <p>Confidence: {(confidence * 100).toFixed(0)}%</p>
        {riskLevel ? <p>Risk: {riskLevel}</p> : null}
        {newsRiskFlag === 'HIGH' || newsRiskFlag === 'CRITICAL' ? (
          <p className="simulation-form__meta simulation-form__meta--warning">
            News risk detected. Execution requires manual review.
          </p>
        ) : null}
        <ul className="detail-slot-card__list">
          {reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
