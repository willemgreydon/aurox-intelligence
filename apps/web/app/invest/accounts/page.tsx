import { Section } from '../../../components/ui/section';
import { WorkstationPageHeader } from '../../../components/asset/workstation-page-header';
import { BankConnectionCard } from '../../../components/invest/bank-connection-card';
import { getMessages } from '../../../lib/i18n/messages';
import { getRequestLocale } from '../../../server/i18n/locale';
import { getInvestOverviewData } from '../../../server/services/invest-service';

export const dynamic = 'force-dynamic';

export default async function InvestAccountsPage() {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  const invest = await getInvestOverviewData(locale, messages);

  return (
    <>
      <Section className="dashboard-section dashboard-section--hero">
        <WorkstationPageHeader
          eyebrow="Invest / Accounts"
          title="Connected account architecture"
          description="Consent-based bank connection surface for portfolio funding, balance context, and future execution-adjacent workflows."
          summary="Sparkasse George Business connectivity is modeled through an explicit open-banking boundary. It is only live when credentials and consent flow are actually configured."
          statusLabel={invest.statusLabel}
          statusTone={invest.statusTone}
          meta={[
            { label: 'Connections', value: String(invest.bankConnections.length) },
            { label: 'Linked accounts', value: String(invest.linkedAccounts.length) },
            { label: 'Last updated', value: invest.lastUpdatedLabel },
          ]}
          actions={[
            { href: '/invest', label: 'Back to invest' },
            { href: '/invest/stocks', label: 'Stocks lane' },
            { href: '/dashboard', label: 'Open dashboard' },
          ]}
        />
      </Section>

      <Section className="dashboard-section">
        <div className="analytics-two-grid">
          {invest.bankConnections.map((connection) => (
            <BankConnectionCard
              key={connection.providerKey}
              providerLabel={connection.providerLabel}
              connectionStatus={connection.connectionStatus}
              accessModel={connection.accessModel}
              disclosure={connection.disclosure}
              setupHint={connection.setupHint}
              supportedScopes={connection.supportedScopes}
            />
          ))}
        </div>
      </Section>
    </>
  );
}
