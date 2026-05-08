import { Section } from '../../../components/ui/section';

export const metadata = {
  title: 'Cookie and Tracking Notice - Aurox Intelligence',
};

export default function CookieNoticePage() {
  return (
    <Section className="dashboard-section">
      <h1>Cookie / Tracking Notice</h1>
      <p>Aurox may use essential cookies for authentication/session continuity and optional telemetry for operational reliability.</p>
      <p>If tracking or analytics features are enabled, related data processing is governed by the Privacy Policy.</p>
      <p>No secret tokens or API keys are exposed through client telemetry surfaces.</p>
    </Section>
  );
}
