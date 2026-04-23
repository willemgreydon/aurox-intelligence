import { Card } from '../ui/card';
import { StatusBadge } from '../ui/status-badge';

type RecommendationCardProps = {
  symbol: string;
  action: 'accumulate' | 'hold' | 'watch' | 'trim' | 'avoid';
  confidence: number;
  summary: string;
  reasons: string[];
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

export function RecommendationCard({ symbol, action, confidence, summary, reasons }: RecommendationCardProps) {
  return (
    <Card className="analytics-card">
      <div className="analytics-card__header">
        <div>
          <div className="section__eyebrow">AI recommendation</div>
          <h3>{symbol}</h3>
          <p>{summary}</p>
        </div>
        <StatusBadge tone={mapTone(action)}>{action}</StatusBadge>
      </div>
      <div className="analytics-card__body">
        <p>Confidence: {(confidence * 100).toFixed(0)}%</p>
        <ul className="detail-slot-card__list">
          {reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
