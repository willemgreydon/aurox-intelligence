import Link from 'next/link';
import { Section } from '../../../components/ui/section';

export const metadata = {
  title: 'Legal Notice — Aurox Intelligence',
  description: 'Platform operator identification, contact details, and regulatory disclosure for Aurox Intelligence.',
};

export default function ImprintPage() {
  return (
    <>
      <Section className="dashboard-section dashboard-section--hero">
        <div className="workstation-page-header">
          <div className="section__eyebrow">Legal · Imprint</div>
          <h1 className="workstation-page-header__title">Legal Notice / Imprint</h1>
          <p className="workstation-page-header__description">
            Operator identification and contact information for the Aurox Intelligence platform.
          </p>
        </div>
      </Section>

      <Section className="dashboard-section">
        <div className="legal-prose">
          <section className="legal-prose__section">
            <h2>Platform operator</h2>
            <p>
              Aurox Intelligence is an internal analytics and financial simulation platform operated for institutional analytics teams and authorised internal operators.
            </p>
            <dl className="legal-prose__dl">
              <dt>Platform name</dt>
              <dd>Aurox Intelligence</dd>
              <dt>Platform type</dt>
              <dd>Internal financial analytics and simulation platform</dd>
              <dt>Contact</dt>
              <dd>
                For platform-related inquiries, legal notices, or data protection requests, please use the contact channel provided by your organisation's platform administrator.
              </dd>
            </dl>
          </section>

          <section className="legal-prose__section">
            <h2>Platform purpose and status</h2>
            <p>
              Aurox Intelligence is an internal operator-facing platform designed for financial signal engineering, explainable forecasting, and portfolio simulation. The Platform does not constitute a publicly offered service, a regulated financial service, or a marketplace.
            </p>
            <p>
              All investment and portfolio features are simulation-only. No real financial transactions are executed through this Platform. Market data is sourced from third-party providers for informational display purposes only.
            </p>
          </section>

          <section className="legal-prose__section">
            <h2>Intellectual property</h2>
            <p>
              The software, algorithms, signal models, interface design, and documentation comprising this Platform are the intellectual property of the Platform operator or its licensors. Unauthorised reproduction, distribution, or reverse-engineering is prohibited.
            </p>
          </section>

          <section className="legal-prose__section">
            <h2>Third-party data provider attribution</h2>
            <p>Market data and financial information displayed on this Platform is sourced from the following third-party providers, subject to their respective terms:</p>
            <ul>
              <li>Polygon.io — equity, ETF, forex, and crypto market data</li>
              <li>Twelve Data — multi-asset market data and technical indicators</li>
              <li>Tiingo — equity and ETF end-of-day data and metadata</li>
              <li>CoinGecko — cryptocurrency market data and global crypto metrics</li>
              <li>Finnhub — equity and forex real-time data</li>
              <li>EODHD — global end-of-day historical data</li>
            </ul>
            <p>
              Use of market data obtained through this Platform is subject to each provider's applicable terms of service. The Platform operator makes no representations regarding data accuracy or completeness.
            </p>
          </section>

          <section className="legal-prose__section">
            <h2>Disclaimer</h2>
            <p>
              Despite careful preparation and maintenance, the Platform operator accepts no liability for the accuracy, completeness, or timeliness of information shown on the Platform. Signal outputs and analytical content are for informational purposes only and do not constitute financial advice or investment recommendations.
            </p>
          </section>
        </div>

        <nav className="legal-prose__nav" aria-label="Legal navigation">
          <Link href="/legal/risk-disclosure" className="module-panel__link">← Risk Disclosure</Link>
          <Link href="/legal" className="module-panel__link">Back to Legal overview →</Link>
        </nav>
      </Section>
    </>
  );
}
