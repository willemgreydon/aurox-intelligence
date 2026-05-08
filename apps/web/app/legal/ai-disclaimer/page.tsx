import { Section } from '../../../components/ui/section';

export const metadata = {
  title: 'AI Disclaimer - Aurox Intelligence',
};

export default function AiDisclaimerPage() {
  return (
    <Section className="dashboard-section">
      <h1>AI Disclaimer</h1>
      <p>AI-generated analysis is informational and may be incorrect, incomplete, delayed, or biased.</p>
      <p>AI output never bypasses deterministic risk checks, policy gates, or simulation/live readiness controls.</p>
      <p>Users must independently validate decisions before any live action outside this platform.</p>
    </Section>
  );
}
