import { Section } from '../../../components/ui/section';

export const metadata = {
  title: 'Market Data Disclaimer - Aurox Intelligence',
};

export default function MarketDataDisclaimerPage() {
  return (
    <Section className="dashboard-section">
      <h1>Market Data Disclaimer</h1>
      <p>Market data is sourced from third-party providers and may be delayed, incomplete, or temporarily unavailable.</p>
      <p>Provider outages can degrade analytics and confidence calculations. Aurox applies graceful fallback where possible.</p>
      <p>Data availability does not imply execution permission, investment suitability, or expected return.</p>
    </Section>
  );
}
