import type { ReactNode } from 'react';
import Link from 'next/link';
import { Card } from '../ui/card';
import { StatusBadge } from '../ui/status-badge';

type BankConnectionCardProps = {
  providerLabel: string;
  connectionStatus: 'available' | 'credentials-required' | 'sandbox' | 'unsupported' | 'connected';
  accessModel: 'psd2-xs2a' | 'partner-api';
  disclosure: string;
  setupHint: string;
  supportedScopes: string[];
  actions?: ReactNode;
};

function mapTone(status: BankConnectionCardProps['connectionStatus']) {
  if (status === 'available' || status === 'connected') {
    return 'success' as const;
  }

  if (status === 'sandbox') {
    return 'info' as const;
  }

  if (status === 'credentials-required') {
    return 'warning' as const;
  }

  return 'danger' as const;
}

export function BankConnectionCard(props: BankConnectionCardProps) {
  return (
    <Card className="analytics-card">
      <div className="analytics-card__header">
        <div>
          <div className="section__eyebrow">Bank connectivity</div>
          <h3>{props.providerLabel}</h3>
          <p>{props.disclosure}</p>
        </div>
        <StatusBadge tone={mapTone(props.connectionStatus)}>{props.connectionStatus}</StatusBadge>
      </div>
      <div className="analytics-card__body">
        <p>Access model: {props.accessModel}</p>
        <p>Scopes: {props.supportedScopes.join(', ')}</p>
        <p>{props.setupHint}</p>
        <div className="analytics-card__actions">
          <Link href="/invest/accounts" className="button button--secondary">
            Open account connections
          </Link>
          {props.actions}
        </div>
      </div>
    </Card>
  );
}
