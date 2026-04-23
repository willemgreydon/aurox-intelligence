import Link from 'next/link';
import { Section } from '../../../components/ui/section';

export const metadata = {
  title: 'Terms of Use — Aurox Intelligence',
  description: 'Terms and conditions governing access to and use of the Aurox Intelligence platform.',
};

export default function TermsOfUsePage() {
  return (
    <>
      <Section className="dashboard-section dashboard-section--hero">
        <div className="workstation-page-header">
          <div className="section__eyebrow">Legal · Terms of Use</div>
          <h1 className="workstation-page-header__title">Terms of Use</h1>
          <p className="workstation-page-header__description">
            Last updated: April 2026. Please read these terms carefully before using the Aurox Intelligence platform.
          </p>
        </div>
      </Section>

      <Section className="dashboard-section">
        <div className="legal-prose">
          <section className="legal-prose__section">
            <h2>1. Acceptance of terms</h2>
            <p>
              By accessing or using the Aurox Intelligence platform ("Platform"), you agree to be bound by these Terms of Use ("Terms"). If you do not agree to these Terms, you may not access or use the Platform. These Terms apply to all users of the Platform, including registered members and visitors.
            </p>
          </section>

          <section className="legal-prose__section">
            <h2>2. Nature of the platform</h2>
            <p>
              Aurox Intelligence is an internal analytics, signal engineering, and portfolio simulation platform. The Platform provides:
            </p>
            <ul>
              <li>Market data visualisation and charting tools</li>
              <li>Algorithmic signal outputs and directional forecasts for informational purposes</li>
              <li>Portfolio simulation capabilities using virtual funds only</li>
              <li>Operational and administrative tooling for authorised operators</li>
            </ul>
            <p>
              The Platform does not constitute a regulated financial service, investment advisory service, or brokerage. No real money is invested, and no regulated orders are placed on any exchange or trading venue through this Platform.
            </p>
          </section>

          <section className="legal-prose__section">
            <h2>3. Not financial advice</h2>
            <p>
              Nothing on this Platform constitutes financial, investment, tax, or legal advice. Algorithmic signals, forecasts, and model outputs are generated for informational and analytical purposes only. They do not represent investment recommendations and must not be relied upon as the basis for actual investment decisions.
            </p>
            <p>
              Past signal performance or simulated returns do not guarantee future results. Market conditions change and models may be incorrect or outdated.
            </p>
          </section>

          <section className="legal-prose__section">
            <h2>4. Permitted use</h2>
            <p>You may access and use the Platform solely for lawful internal purposes. You agree not to:</p>
            <ul>
              <li>Use the Platform to conduct any unlawful activity</li>
              <li>Attempt to reverse-engineer, scrape, or extract proprietary data or system logic</li>
              <li>Share your credentials with unauthorised third parties</li>
              <li>Interfere with the Platform's operation or security mechanisms</li>
              <li>Represent Platform outputs as regulated financial advice to third parties</li>
            </ul>
          </section>

          <section className="legal-prose__section">
            <h2>5. Market data and third-party providers</h2>
            <p>
              Market data displayed on this Platform is sourced from third-party data providers including Polygon.io, Twelve Data, Tiingo, CoinGecko, Finnhub, and EODHD. This data is provided for informational purposes and may be subject to delays, errors, or interruptions. The Platform makes no warranties regarding the accuracy, completeness, or timeliness of market data.
            </p>
            <p>
              Your use of market data obtained through the Platform may be subject to the terms of the respective data providers.
            </p>
          </section>

          <section className="legal-prose__section">
            <h2>6. Accounts and authentication</h2>
            <p>
              You are responsible for maintaining the security of your account credentials. You must notify the Platform operator immediately if you become aware of any unauthorised use of your account. The operator reserves the right to terminate or suspend accounts that violate these Terms.
            </p>
          </section>

          <section className="legal-prose__section">
            <h2>7. Limitation of liability</h2>
            <p>
              To the fullest extent permitted by applicable law, the Platform operator shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Platform or reliance on any information presented therein. The Platform is provided "as is" without warranties of any kind, express or implied.
            </p>
          </section>

          <section className="legal-prose__section">
            <h2>8. Changes to these terms</h2>
            <p>
              The Platform operator reserves the right to update or modify these Terms at any time. Continued use of the Platform following any changes constitutes acceptance of the revised Terms. Material changes will be communicated through the Platform interface where practicable.
            </p>
          </section>

          <section className="legal-prose__section">
            <h2>9. Governing law</h2>
            <p>
              These Terms are governed by applicable law. Disputes arising from or relating to these Terms shall be subject to the jurisdiction of the courts applicable to the Platform operator's place of establishment.
            </p>
          </section>
        </div>

        <nav className="legal-prose__nav" aria-label="Legal navigation">
          <Link href="/legal" className="module-panel__link">← Back to Legal</Link>
          <Link href="/legal/privacy" className="module-panel__link">Privacy Policy →</Link>
        </nav>
      </Section>
    </>
  );
}
