import { Section } from '../ui/section';
import { CompactStatCard } from '../stats/compact-stat-card';

type PortfolioMetricsSectionProps = {
  snapshot: {
    portfolioValue: number;
    investedCapital: number;
    unrealizedPnl: number;
    realizedPnl: number;
  };
};

/**
 * Simulation portfolio pulse. Rendered above the hero on the authenticated
 * home page so a returning user sees their portfolio metrics first. Purely
 * presentational — receives a pre-shaped snapshot read model.
 */
export function PortfolioMetricsSection({ snapshot }: PortfolioMetricsSectionProps) {
  return (
    <Section className="home-fancy home-fancy--portfolio">
      <header className="home-fancy__header">
        <div className="section__eyebrow">Portfolio metrics</div>
        <h2 className="section__title">Simulation portfolio pulse</h2>
        <p className="section__description">
          Live snapshot of your simulated portfolio value and deployed capital.
        </p>
      </header>
      <div className="analytics-strip">
        <CompactStatCard
          label="Portfolio value"
          value={`$${snapshot.portfolioValue.toFixed(2)}`}
          valueTone={snapshot.portfolioValue > 0 ? 'positive' : snapshot.portfolioValue < 0 ? 'negative' : 'neutral'}
          detail="Current market value of active simulated positions."
        />
        <CompactStatCard
          label="Invested capital"
          value={`$${snapshot.investedCapital.toFixed(2)}`}
          valueTone={snapshot.investedCapital > 0 ? 'positive' : snapshot.investedCapital < 0 ? 'negative' : 'neutral'}
          detail="Capital currently allocated across open positions."
        />
        <CompactStatCard
          label="Unrealized P&L"
          value={`${snapshot.unrealizedPnl >= 0 ? '+' : ''}$${Math.abs(snapshot.unrealizedPnl).toFixed(2)}`}
          valueTone={snapshot.unrealizedPnl > 0 ? 'positive' : snapshot.unrealizedPnl < 0 ? 'negative' : 'neutral'}
          detail="Mark-to-market gain/loss on currently open positions."
        />
        <CompactStatCard
          label="Realized P&L"
          value={`${snapshot.realizedPnl >= 0 ? '+' : ''}$${Math.abs(snapshot.realizedPnl).toFixed(2)}`}
          valueTone={snapshot.realizedPnl > 0 ? 'positive' : snapshot.realizedPnl < 0 ? 'negative' : 'neutral'}
          detail="Locked-in gain/loss from completed simulated trades."
        />
      </div>
    </Section>
  );
}
