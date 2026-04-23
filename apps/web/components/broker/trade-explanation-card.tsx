import type { TradeExplanation } from '@repo/agents';
import { Card } from '../ui/card';

type Props = {
  explanation: TradeExplanation;
  symbol: string;
  source: string;
  orderState: string;
  executionTarget: string;
};

function CheckList({
  items,
  tone,
}: {
  items: readonly string[];
  tone: 'success' | 'warning' | 'info';
}) {
  if (items.length === 0) return null;

  return (
    <ul style={{ display: 'grid', gap: '0.75rem', margin: 0, paddingLeft: '1rem' }}>
      {items.map((item, index) => (
        <li key={`${tone}-${index}`}>
          <span className={`status-pill status-pill--${tone}`} aria-hidden="true">
            {tone === 'success' ? '✓' : tone === 'warning' ? '!' : '·'}
          </span>{' '}
          {item}
        </li>
      ))}
    </ul>
  );
}

function getStateTone(orderState: string): 'success' | 'warning' | 'danger' | 'info' {
  if (orderState === 'filled' || orderState === 'approved') return 'success';
  if (orderState === 'awaiting_user_approval') return 'warning';
  if (orderState.startsWith('rejected') || orderState === 'failed') return 'danger';
  return 'info';
}

export function TradeExplanationCard({
  explanation,
  symbol,
  source,
  orderState,
  executionTarget,
}: Props) {
  const stateTone = getStateTone(orderState);

  return (
    <Card className="analytics-card">
      <div className="analytics-card__header">
        <div>
          <div className="section__eyebrow">Trade decision · {symbol}</div>
          <h3>{explanation.summary}</h3>
          <p>
            Source: {source.replace(/_/g, ' ')} · Target: {executionTarget.replace(/_/g, ' ')}
          </p>
        </div>
        <span className={`status-pill status-pill--${stateTone}`}>
          {orderState.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="analytics-card__body" style={{ display: 'grid', gap: '1rem' }}>
        {explanation.signalReason.length > 0 ? (
          <section>
            <div className="section__eyebrow" style={{ marginBottom: '0.5rem' }}>
              Signal
            </div>
            <CheckList items={explanation.signalReason} tone="info" />
          </section>
        ) : null}

        {explanation.riskChecks.length > 0 ? (
          <section>
            <div className="section__eyebrow" style={{ marginBottom: '0.5rem' }}>
              Risk checks
            </div>
            <CheckList items={explanation.riskChecks} tone="success" />
          </section>
        ) : null}

        {explanation.policyChecks.length > 0 ? (
          <section>
            <div className="section__eyebrow" style={{ marginBottom: '0.5rem' }}>
              Policy checks
            </div>
            <CheckList items={explanation.policyChecks} tone="success" />
          </section>
        ) : null}

        {explanation.sizingExplanation.length > 0 ? (
          <section>
            <div className="section__eyebrow" style={{ marginBottom: '0.5rem' }}>
              Sizing
            </div>
            <CheckList items={explanation.sizingExplanation} tone="info" />
          </section>
        ) : null}

        {explanation.warnings.length > 0 ? (
          <section>
            <div className="section__eyebrow" style={{ marginBottom: '0.5rem' }}>
              Warnings
            </div>
            <CheckList items={explanation.warnings} tone="warning" />
          </section>
        ) : null}
      </div>
    </Card>
  );
}