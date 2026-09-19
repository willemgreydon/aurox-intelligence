import type { ClaudeFinanceCockpitViewModel } from '@repo/api-contracts';
import type { AppMessages } from '../../lib/i18n/messages';

type FinanceHeroBarProps = {
  cockpit: ClaudeFinanceCockpitViewModel;
  simulationModeAria: string;
  subtitle: string;
  labels: AppMessages['finance']['hero'];
};

/**
 * Orientation bar for the cockpit. The SIMULATION badge is always visible
 * (financial-ui-safety-rule). All values are pre-formatted read-model strings.
 */
export function FinanceHeroBar({ cockpit, simulationModeAria, subtitle, labels }: FinanceHeroBarProps) {
  const { hero } = cockpit;
  return (
    <div className="finance-hero">
      <div className="finance-hero__head">
        <div className="finance-hero__title-group">
          <span className="finance-hero__badge" aria-label={simulationModeAria}>
            SIMULATION
          </span>
          <h1 className="finance-hero__title">Claude Finance</h1>
          <p className="finance-hero__subtitle">{subtitle}</p>
        </div>
        <div className="finance-hero__actions">
          <a className="button button--primary" href="#finance-generate">
            {labels.generateCta}
          </a>
          <a className="button button--secondary" href="/portfolio/intelligence">
            {labels.reviewCta}
          </a>
        </div>
      </div>

      <dl className="finance-hero__stats">
        <div className="finance-hero__stat">
          <dt>{labels.statPortfolioValue}</dt>
          <dd className="finance-hero__stat-value">{hero.portfolioValueLabel}</dd>
        </div>
        <div className="finance-hero__stat">
          <dt>{labels.statSimulatedCash}</dt>
          <dd className="finance-hero__stat-value">{hero.cashLabel}</dd>
        </div>
        <div className="finance-hero__stat">
          <dt>{labels.statInvested}</dt>
          <dd className="finance-hero__stat-value">{hero.investedLabel}</dd>
        </div>
        <div className="finance-hero__stat">
          <dt>{labels.statOpenPositions}</dt>
          <dd className="finance-hero__stat-value">{hero.openPositionsLabel}</dd>
        </div>
        <div className="finance-hero__stat">
          <dt>{labels.statWorkstation}</dt>
          <dd className="finance-hero__stat-value finance-hero__stat-value--muted">{hero.freshnessLabel}</dd>
        </div>
      </dl>

      <p className="finance-hero__state">{hero.portfolioState}</p>
    </div>
  );
}
