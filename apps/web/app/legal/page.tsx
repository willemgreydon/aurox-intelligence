import Link from 'next/link';
import { Section } from '../../components/ui/section';

export const metadata = {
  title: 'Legal — Aurox Intelligence',
  description: 'Legal notices, terms of use, privacy policy, and risk disclosures for the Aurox Intelligence platform.',
};

const legalPages = [
  {
    href: '/legal/terms',
    title: 'Terms of Use',
    description: 'The conditions governing use of the Aurox Intelligence platform, including permitted use, restrictions, and disclaimer of warranties.',
  },
  {
    href: '/legal/privacy',
    title: 'Privacy Policy',
    description: 'How Aurox Intelligence collects, processes, stores, and protects information about platform users.',
  },
  {
    href: '/legal/risk-disclosure',
    title: 'Risk Disclosure',
    description: 'Important disclosures about the simulated nature of investment features and the limitations of algorithmic signal output.',
  },
  {
    href: '/legal/imprint',
    title: 'Legal Notice / Imprint',
    description: 'Platform operator identification, contact information, and regulatory disclosure as required by applicable law.',
  },
];

export default function LegalIndexPage() {
  return (
    <>
      <Section className="dashboard-section dashboard-section--hero">
        <div className="workstation-page-header">
          <div className="section__eyebrow">Legal</div>
          <h1 className="workstation-page-header__title">Legal notices and platform disclosures</h1>
          <p className="workstation-page-header__description">
            Aurox Intelligence is an internal analytics and simulation platform. The following documents govern platform use, data handling, and disclosure obligations.
            This platform does not constitute regulated financial advice and does not perform real brokerage execution.
          </p>
        </div>
      </Section>

      <Section className="dashboard-section">
        <div className="analytics-two-grid">
          {legalPages.map((page) => (
            <article key={page.href} className="surface detail-slot-card">
              <div className="surface__inner detail-slot-card__inner">
                <div className="detail-slot-card__eyebrow">Legal document</div>
                <h2 className="detail-slot-card__title">{page.title}</h2>
                <p className="detail-slot-card__description">{page.description}</p>
                <Link href={page.href} className="module-panel__link">
                  Read {page.title}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section className="dashboard-section dashboard-section--tinted">
        <div className="legal-notice-strip">
          <p className="site-footer__meta">
            <strong>Simulation disclosure:</strong> All invest and portfolio features on this platform operate in simulation mode only. No real money is invested, no brokerage orders are placed, and no regulated financial services are performed. Market data is sourced from third-party providers for informational purposes.
          </p>
        </div>
      </Section>
    </>
  );
}
