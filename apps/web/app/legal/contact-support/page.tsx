import { Section } from '../../../components/ui/section';

export const metadata = {
  title: 'Contact and Support - Aurox Intelligence',
};

export default function ContactSupportPage() {
  return (
    <Section className="dashboard-section">
      <h1>Contact / Support</h1>
      <p>Support email: support@example.com (placeholder)</p>
      <p>Legal contact: legal@example.com (placeholder)</p>
      <p>Company/entity details can be configured in legal imprint settings when available.</p>
    </Section>
  );
}
