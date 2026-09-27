import type { Metadata } from 'next';
import { PathExplorer } from '../../components/lab/path-explorer';
import { Section } from '../../components/ui/section';
import { getMessages } from '../../lib/i18n/messages';
import { getRequestLocale } from '../../server/i18n/locale';

export const metadata: Metadata = {
  title: 'Aurox Lab — Path Explorer',
  description: 'Deterministic, DB-free interactive finance tools. Monte Carlo portfolio path simulation.',
};

export default async function LabPage() {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  const lab = messages.lab;

  return (
    <>
      <header className="observe-command-header">
        <div className="observe-command-header__inner">
          <div className="observe-command-header__top">
            <div className="observe-command-header__identity">
              <span className="observe-command-header__eyebrow">{lab.eyebrow}</span>
              <h1 className="observe-command-header__title">{lab.title}</h1>
              <p className="observe-command-header__sub">{lab.description}</p>
            </div>
            <div className="observe-command-header__chips">
              <span className="observe-chip observe-chip--neutral">{lab.offlineBadge}</span>
            </div>
          </div>
        </div>
      </header>

      <Section className="dashboard-section">
        <header className="dashboard-section-heading">
          <div>
            <div className="section__eyebrow">{lab.pathExplorer.eyebrow}</div>
            <h2 className="dashboard-section-heading__title">{lab.pathExplorer.title}</h2>
            <p className="dashboard-section-heading__sub">{lab.pathExplorer.description}</p>
          </div>
        </header>
        <PathExplorer />
      </Section>
    </>
  );
}
