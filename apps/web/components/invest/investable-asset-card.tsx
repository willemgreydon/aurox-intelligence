import type { ReactNode } from 'react';
import Link from 'next/link';
import { StatusBadge } from '../ui/status-badge';
import { Card } from '../ui/card';
import { cn } from '../../lib/utils';

type InvestableAssetCardProps = {
  href: string;
  title: string;
  symbol: string;
  thesis: string;
  priceLabel: string;
  changeLabel: string;
  freshnessLabel: string;
  actionAvailability: 'available' | 'simulated' | 'planned' | 'unavailable';
  insightStance: 'positive' | 'negative' | 'neutral';
  riskSummary: string;
  actions?: ReactNode;
};

function mapTone(value: InvestableAssetCardProps['actionAvailability']) {
  if (value === 'available') {
    return 'success' as const;
  }
  if (value === 'planned') {
    return 'warning' as const;
  }
  if (value === 'unavailable') {
    return 'danger' as const;
  }
  return 'info' as const;
}

export function InvestableAssetCard(props: InvestableAssetCardProps) {
  return (
    <Card className="analytics-card">
      <div className="analytics-card__header">
        <div>
          <div className="section__eyebrow">{props.symbol}</div>
          <h3>{props.title}</h3>
          <p>{props.thesis}</p>
        </div>
        <StatusBadge tone={mapTone(props.actionAvailability)}>{props.actionAvailability}</StatusBadge>
      </div>
      <div className="comparison-stat">
        <div>
          <div className="comparison-stat__label">Quote</div>
          <div className="comparison-stat__value">{props.priceLabel}</div>
        </div>
        <div>
          <div className="comparison-stat__label">Move</div>
          <div
            className={cn(
              'comparison-stat__subvalue',
              props.insightStance === 'positive' && 'signal-breakdown__value--positive',
              props.insightStance === 'negative' && 'signal-breakdown__value--negative',
              props.insightStance === 'neutral' && 'signal-breakdown__value--neutral',
            )}
          >
            {props.changeLabel}
          </div>
        </div>
      </div>
      <div className="analytics-card__body">
        <p>{props.riskSummary}</p>
        <p>Freshness: {props.freshnessLabel}</p>
        <div className="analytics-card__actions">
          <Link href={props.href} className="button button--secondary">
            Open asset lane
          </Link>
          {props.actions}
        </div>
      </div>
    </Card>
  );
}
