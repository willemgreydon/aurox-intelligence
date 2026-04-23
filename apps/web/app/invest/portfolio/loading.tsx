import { Section } from '../../../components/ui/section';
import { Card } from '../../../components/ui/card';

export default function PortfolioLoading() {
  return (
    <Section className="dashboard-section">
      <Card className="analytics-card">
        <div className="analytics-card__header">
          <div>
            <div className="section__eyebrow">Invest / Portfolio</div>
            <h3>Loading portfolio workspace</h3>
            <p>Fetching positions, allocations, and recent trades...</p>
          </div>
        </div>
      </Card>
    </Section>
  );
}
