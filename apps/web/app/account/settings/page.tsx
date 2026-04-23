import { PasswordForm } from '../../../components/account/password-form';
import { WorkspacePreferencesForm } from '../../../components/account/workspace-preferences-form';
import { SignOutButton } from '../../../components/auth/sign-out-button';
import { Card } from '../../../components/ui/card';
import { getMessages } from '../../../lib/i18n/messages';
import { requireCurrentSession } from '../../../server/auth/session';
import { getRequestLocale } from '../../../server/i18n/locale';
import { getAccountOverviewData } from '../../../server/services/account-service';

export default async function AccountSettingsPage() {
  const auth = await requireCurrentSession('/account/settings');
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  const overview = await getAccountOverviewData(auth);

  return (
    <div className="account-stack">
      <Card>
        <WorkspacePreferencesForm
          preset={overview.preferences}
          labels={{
            title: messages.account.preferencesTitle,
            description: messages.account.preferencesDescription,
            locale: messages.account.locale,
            defaultChartType: messages.account.defaultChartType,
            defaultTimePeriod: messages.account.defaultTimePeriod,
            trackedSymbols: messages.account.trackedSymbols,
            trackedSymbolsHint: messages.account.trackedSymbolsHint,
            visibleModules: messages.account.visibleModules,
            simulationPreferencesTitle: messages.account.simulationPreferencesTitle,
            preferredBrokerMode: messages.account.preferredBrokerMode,
            brokerModeCapitalLimitUsd: messages.account.brokerModeCapitalLimitUsd,
            microTradeAllocationPercent: messages.account.microTradeAllocationPercent,
            defaultAssetScope: messages.account.defaultAssetScope,
            activityPreferencesTitle: messages.account.activityPreferencesTitle,
            orderActivityDigest: messages.account.orderActivityDigest,
            laneStatusAlerts: messages.account.laneStatusAlerts,
            save: messages.dashboard.savePreferences,
          }}
        />
      </Card>

      <Card>
        <PasswordForm />
      </Card>

      <Card>
        <div className="account-panel">
          <div className="account-panel__header">
            <div>
              <div className="section__eyebrow">Session controls</div>
              <h2 className="account-panel__title">Sign-out and session awareness</h2>
              <p className="account-panel__description">
                You currently have {overview.activeSessionCount} active session{overview.activeSessionCount === 1 ? '' : 's'}.
              </p>
            </div>
          </div>

          <div className="account-settings-actions">
            <SignOutButton className="button button--secondary" />
          </div>
        </div>
      </Card>
    </div>
  );
}
