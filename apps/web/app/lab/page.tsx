import type { Metadata } from 'next';
import { LabCockpit } from '../../components/lab/lab-cockpit';
import { getMessages } from '../../lib/i18n/messages';
import { getRequestLocale } from '../../server/i18n/locale';

export const metadata: Metadata = {
  title: 'Aurox Lab',
  description:
    'Deterministic, DB-free interactive finance tools: Monte Carlo path simulation and signal explainability.',
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

      <LabCockpit labels={lab} />
    </>
  );
}
