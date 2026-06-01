import type { ClaudeFinanceCockpitViewModel } from '@repo/api-contracts';

type FinanceHeroBarProps = {
  cockpit: ClaudeFinanceCockpitViewModel;
};

/**
 * Orientation bar for the cockpit. The SIMULATION badge is always visible
 * (financial-ui-safety-rule). All values are pre-formatted read-model strings.
 */
export function FinanceHeroBar({ cockpit }: FinanceHeroBarProps) {
  const { hero } = cockpit;
  return (
    <div className="finance-hero">
      <div className="finance-hero__head">
        <div className="finance-hero__title-group">
          <span className="finance-hero__badge" aria-label="Simulation mode">
            SIMULATION
          </span>
          <h1 className="finance-hero__title">Claude Finance</h1>
          <p className="finance-hero__subtitle">
            An explainable, simulation-only finance cockpit. Observe markets, track lanes, and preview
            risk-checked simulated broker activity. Not financial advice.
          </p>
        </div>
        <div className="finance-hero__actions">
          <a className="button button--primary" href="#finance-generate">
            Generate simulated activity
          </a>
          <a className="button button--secondary" href="/portfolio/intelligence">
            Review portfolio intelligence
          </a>
        </div>
      </div>

      <dl className="finance-hero__stats">
        <div className="finance-hero__stat">
          <dt>Portfolio value</dt>
          <dd className="finance-hero__stat-value">{hero.portfolioValueLabel}</dd>
        </div>
        <div className="finance-hero__stat">
          <dt>Simulated cash</dt>
          <dd className="finance-hero__stat-value">{hero.cashLabel}</dd>
        </div>
        <div className="finance-hero__stat">
          <dt>Invested</dt>
          <dd className="finance-hero__stat-value">{hero.investedLabel}</dd>
        </div>
        <div className="finance-hero__stat">
          <dt>Open positions</dt>
          <dd className="finance-hero__stat-value">{hero.openPositionsLabel}</dd>
        </div>
        <div className="finance-hero__stat">
          <dt>Workstation</dt>
          <dd className="finance-hero__stat-value finance-hero__stat-value--muted">{hero.freshnessLabel}</dd>
        </div>
      </dl>

      <p className="finance-hero__state">{hero.portfolioState}</p>
    </div>
  );
}
