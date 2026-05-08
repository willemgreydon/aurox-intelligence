import { Section } from '../../../components/ui/section';

export const metadata = {
  title: 'Simulation Disclaimer - Aurox Intelligence',
};

export default function SimulationDisclaimerPage() {
  return (
    <Section className="dashboard-section">
      <h1>Simulation Disclaimer</h1>
      <p>Aurox Intelligence operates in simulation-first mode. Simulated orders do not execute on live venues.</p>
      <p>Simulated results are not guarantees of live performance. Slippage, liquidity, latency, and fees can differ in real markets.</p>
      <p>Nothing on this platform is financial advice. Users remain responsible for all decisions.</p>
    </Section>
  );
}
