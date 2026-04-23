import { Section } from '../components/ui/section';
import { getMessages } from '../lib/i18n/messages';
import { getRequestLocale } from '../server/i18n/locale';

export default async function Loading() {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);

  return (
    <>
      <Section className="section--hero">
        <div className="page-loading surface surface--accent">
          <div className="surface__inner page-loading__inner">
            <div className="page-loading__copy">
              <div className="section__eyebrow">{messages.shell.brandTitle}</div>
              <h1 className="page-loading__title">{messages.marketGraph.title}</h1>
              <p className="page-loading__description">{messages.common.simulationDisclosure}</p>
            </div>
            <div className="page-loading__status">
              <span className="page-loading__pulse" aria-hidden="true" />
              <span>{messages.common.lastUpdated}</span>
            </div>
          </div>
        </div>
      </Section>

      <Section>
        <div className="loading-grid">
          <div className="loading-card shimmer-block" />
          <div className="loading-card shimmer-block" />
          <div className="loading-card shimmer-block" />
        </div>
      </Section>
    </>
  );
}
