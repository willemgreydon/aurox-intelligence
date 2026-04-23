'use client';

import { Section } from '../../../components/ui/section';
import { Card } from '../../../components/ui/card';

export default function PortfolioError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <Section className="dashboard-section">
      <Card className="analytics-card">
        <div className="analytics-card__header">
          <div>
            <div className="section__eyebrow">Invest / Portfolio</div>
            <h3>Unable to load portfolio</h3>
            <p>{error.message || 'An unexpected error occurred while loading portfolio data.'}</p>
          </div>
        </div>
        <div className="analytics-card__action-grid">
          <button type="button" className="button button--primary" onClick={reset}>
            Retry
          </button>
        </div>
      </Card>
    </Section>
  );
}
