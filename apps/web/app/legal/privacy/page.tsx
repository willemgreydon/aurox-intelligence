import Link from 'next/link';
import { Section } from '../../../components/ui/section';

export const metadata = {
  title: 'Privacy Policy — Aurox Intelligence',
  description: 'How Aurox Intelligence collects, processes, and protects user data.',
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <Section className="dashboard-section dashboard-section--hero">
        <div className="workstation-page-header">
          <div className="section__eyebrow">Legal · Privacy Policy</div>
          <h1 className="workstation-page-header__title">Privacy Policy</h1>
          <p className="workstation-page-header__description">
            Last updated: April 2026. This policy describes how Aurox Intelligence processes information about platform users.
          </p>
        </div>
      </Section>

      <Section className="dashboard-section">
        <div className="legal-prose">
          <section className="legal-prose__section">
            <h2>1. Scope</h2>
            <p>
              This Privacy Policy applies to the Aurox Intelligence platform and describes the personal data the Platform collects, the purposes for which it is processed, how it is stored, and your rights in relation to it. It applies to all registered users and, where applicable, to visitors of the Platform.
            </p>
          </section>

          <section className="legal-prose__section">
            <h2>2. Data we collect</h2>
            <p>When you register or use the Platform, we may collect and process the following categories of personal data:</p>
            <ul>
              <li><strong>Account data:</strong> name, email address, hashed password, and account creation timestamp</li>
              <li><strong>Session data:</strong> authentication tokens, session identifiers, and session activity timestamps</li>
              <li><strong>Usage data:</strong> pages visited, features used, and interaction timestamps for operational and security purposes</li>
              <li><strong>Simulation data:</strong> virtual portfolio configurations, simulated trades, and preferences stored against your account</li>
              <li><strong>Technical data:</strong> IP address, browser type, and device information collected automatically for security and performance purposes</li>
            </ul>
            <p>We do not collect real financial account details, payment card data, or brokerage credentials through this Platform.</p>
          </section>

          <section className="legal-prose__section">
            <h2>3. Purposes and legal basis</h2>
            <p>We process personal data for the following purposes:</p>
            <ul>
              <li>Providing and operating the Platform, including authentication and session management</li>
              <li>Maintaining the security and integrity of the Platform</li>
              <li>Improving the Platform based on aggregated usage analytics</li>
              <li>Fulfilling legal and compliance obligations where applicable</li>
            </ul>
            <p>
              Where required by applicable law, processing is based on your consent, the performance of a contract, or a legitimate interest pursued by the Platform operator that does not override your fundamental rights.
            </p>
          </section>

          <section className="legal-prose__section">
            <h2>4. Data storage and retention</h2>
            <p>
              Personal data is stored in a managed PostgreSQL database. Account and session data is retained for as long as your account remains active, plus a reasonable period thereafter to comply with legal obligations or resolve disputes. Simulation and preference data may be deleted upon account deletion.
            </p>
            <p>
              We implement appropriate technical and organisational security measures to protect personal data against unauthorised access, alteration, disclosure, or destruction.
            </p>
          </section>

          <section className="legal-prose__section">
            <h2>5. Third-party services</h2>
            <p>
              The Platform uses third-party market data providers (Polygon.io, Twelve Data, Tiingo, CoinGecko, Finnhub, EODHD) to source financial data. These providers are accessed on the server side; your personal data is not shared with them. Their data is used solely to populate market information displays on the Platform.
            </p>
            <p>
              We do not sell or rent personal data to third parties.
            </p>
          </section>

          <section className="legal-prose__section">
            <h2>6. Your rights</h2>
            <p>
              Depending on your location and applicable data protection law, you may have rights including: the right to access your personal data, the right to rectify inaccurate data, the right to request deletion of your data, and the right to object to certain processing activities. To exercise any of these rights, please contact the Platform operator using the contact details in the Legal Notice.
            </p>
          </section>

          <section className="legal-prose__section">
            <h2>7. Cookies and local storage</h2>
            <p>
              The Platform uses authentication tokens stored in secure HTTP-only cookies to maintain your session. Minimal local storage may be used to preserve UI preferences such as theme and language selection. No cross-site tracking cookies or advertising cookies are used.
            </p>
          </section>

          <section className="legal-prose__section">
            <h2>8. Changes to this policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Where changes are material, we will provide notice through the Platform. Continued use of the Platform after such notice constitutes acceptance of the revised policy.
            </p>
          </section>
        </div>

        <nav className="legal-prose__nav" aria-label="Legal navigation">
          <Link href="/legal/terms" className="module-panel__link">← Terms of Use</Link>
          <Link href="/legal/risk-disclosure" className="module-panel__link">Risk Disclosure →</Link>
        </nav>
      </Section>
    </>
  );
}
