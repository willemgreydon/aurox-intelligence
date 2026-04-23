import Link from 'next/link';
import { Section } from '../components/ui/section';
import { StatePanel } from '../components/ui/state-panel';
import { getMessages } from '../lib/i18n/messages';
import { getRequestLocale } from '../server/i18n/locale';

export default async function NotFound() {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);

  return (
    <Section className="section--hero">
      <StatePanel
        eyebrow="404"
        title={messages.common.unavailable}
        description={messages.common.simulationDisclosure}
        actions={
          <>
            <Link href="/" className="button button--primary">
              {messages.common.home}
            </Link>
            <Link href="/dashboard" className="button button--secondary">
              {messages.shell.nav.dashboard}
            </Link>
          </>
        }
      />
    </Section>
  );
}
