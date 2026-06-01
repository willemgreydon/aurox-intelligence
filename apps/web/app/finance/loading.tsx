import { Section } from '../../components/ui/section';
import { Card } from '../../components/ui/card';

export default function ClaudeFinanceLoading() {
  return (
    <Section>
      <Card>
        <div className="finance-loading" role="status" aria-live="polite">
          <span className="finance-loading__badge">SIMULATION</span>
          <p className="finance-loading__text">Loading Claude Finance cockpit…</p>
        </div>
      </Card>
    </Section>
  );
}
