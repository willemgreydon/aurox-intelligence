import { PasswordForm } from '../../../components/account/password-form';
import { WorkspacePreferencesForm } from '../../../components/account/workspace-preferences-form';
import { SignOutButton } from '../../../components/auth/sign-out-button';
import { Card } from '../../../components/ui/card';
import { getMessages } from '../../../lib/i18n/messages';
import { requireCurrentSession } from '../../../server/auth/session';
import { getRequestLocale } from '../../../server/i18n/locale';
import { getAccountOverviewData } from '../../../server/services/account-service';
import { assertSerializableProps } from '../../../lib/assert-serializable-props';

export default async function AccountSettingsPage() {
  const auth = await requireCurrentSession('/account/settings');
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  const overview = await getAccountOverviewData(auth);

  assertSerializableProps('account.preferences', overview.preferences as Record<string, unknown>);

  const count = overview.activeSessionCount;
  const sessionDescription = count === 1
    ? messages.account.sessionControlsDescription.replace('{{count}}', String(count))
    : messages.account.sessionControlsDescriptionPlural.replace('{{count}}', String(count));

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
            trackedSymbolsFormatHint: messages.account.trackedSymbolsFormatHint,
            trackedSymbolsExamples: messages.account.trackedSymbolsExamples,
            trackedSymbolsNormalized: messages.account.trackedSymbolsNormalized,
            trackedSymbolsNone: messages.account.trackedSymbolsNone,
            trackedSymbolsInvalid: messages.account.trackedSymbolsInvalid,
            trackedSymbolsIgnored: messages.account.trackedSymbolsIgnored,
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
            brokerModeLabels: {
              manual_stock_lane: messages.account.brokerModeManualStock,
              manual_multi_asset_lane: messages.account.brokerModeManualMultiAsset,
              ai_copilot_lane: messages.account.brokerModeAiCopilot,
              signal_follow_lane: messages.account.brokerModeSignalFollow,
              agent_sandbox_lane: messages.account.brokerModeAgentSandbox,
            },
            assetScopeLabels: {
              stock: messages.account.assetScopeStock,
              etf: messages.account.assetScopeEtf,
              crypto: messages.account.assetScopeCrypto,
              'multi-asset': messages.account.assetScopeMultiAsset,
            },
            chartTypeLabels: {
              trend: messages.account.chartTypeTrend,
              stock: messages.account.chartTypeStock,
              comparison: messages.account.chartTypeComparison,
              bar: messages.account.chartTypeBar,
              donut: messages.account.chartTypeDonut,
            },
            timePeriodLabels: {
              '1s': messages.account.timePeriod1s,
              '3s': messages.account.timePeriod3s,
              '5s': messages.account.timePeriod5s,
              '10s': messages.account.timePeriod10s,
              '1m': messages.account.timePeriod1m,
              '1h': messages.account.timePeriod1h,
              '1d': messages.account.timePeriod1d,
              '1w': messages.account.timePeriod1w,
              '1mo': messages.account.timePeriod1mo,
              '1y': messages.account.timePeriod1y,
              '2y': messages.account.timePeriod2y,
              '5y': messages.account.timePeriod5y,
            },
            moduleLabels: {
              'market-overview': messages.account.moduleMarketOverview,
              watchlist: messages.account.moduleWatchlist,
              'forecast-analysis': messages.account.moduleForecastAnalysis,
              'broker-tools': messages.account.moduleBrokerTools,
              'system-observation': messages.account.moduleSystemObservation,
            },
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
              <div className="section__eyebrow">{messages.account.sessionControlsEyebrow}</div>
              <h2 className="account-panel__title">{messages.account.sessionControlsTitle}</h2>
              <p className="account-panel__description">{sessionDescription}</p>
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
