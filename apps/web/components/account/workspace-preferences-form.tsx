'use client';

import {
  normalizeTrackedSymbolsInput,
  type BrokerAssetScope,
  type BrokerMode,
  type ChartType,
  type DashboardModuleId,
  type DashboardPreset,
  type TimePeriod,
} from '@repo/api-contracts';
import { useActionState } from 'react';
import { availableChartTypes, availableDashboardModules, availableTimePeriods } from '../../lib/workspace';
import { localeLabels, supportedLocales } from '../../lib/i18n/locale-options';
import { emptyFormState } from '../../server/auth/forms';
import { updateWorkspacePreferencesAction } from '../../server/actions/account-actions';
import { FormSubmitButton } from '../auth/form-submit-button';

type WorkspacePreferencesFormProps = {
  preset: DashboardPreset;
  labels: {
    title: string;
    description: string;
    locale: string;
    defaultChartType: string;
    defaultTimePeriod: string;
    trackedSymbols: string;
    trackedSymbolsHint: string;
    visibleModules: string;
    simulationPreferencesTitle: string;
    preferredBrokerMode: string;
    brokerModeCapitalLimitUsd: string;
    microTradeAllocationPercent: string;
    defaultAssetScope: string;
    activityPreferencesTitle: string;
    orderActivityDigest: string;
    laneStatusAlerts: string;
    save: string;
  };
};

const brokerModes: BrokerMode[] = [
  'manual_stock_lane',
  'manual_multi_asset_lane',
  'ai_copilot_lane',
  'signal_follow_lane',
  'agent_sandbox_lane',
];
const brokerAssetScopes: BrokerAssetScope[] = ['stock', 'etf', 'crypto', 'multi-asset'];
const brokerModeLabels: Record<BrokerMode, string> = {
  manual_stock_lane: 'Manual stock lane',
  manual_multi_asset_lane: 'Manual multi-asset lane',
  ai_copilot_lane: 'AI copilot lane',
  signal_follow_lane: 'Signal-follow lane',
  agent_sandbox_lane: 'Broker-agent sandbox lane',
};
const brokerAssetScopeLabels: Record<BrokerAssetScope, string> = {
  stock: 'Stock',
  etf: 'ETF',
  crypto: 'Crypto',
  'multi-asset': 'Multi-asset',
};

export function WorkspacePreferencesForm({ preset, labels }: WorkspacePreferencesFormProps) {
  const [state, formAction] = useActionState(updateWorkspacePreferencesAction, emptyFormState);
  const trackedSymbolsFieldId = 'trackedSymbols';
  const trackedSymbolsHintId = `${trackedSymbolsFieldId}-hint`;
  const normalizedTrackedSymbols = normalizeTrackedSymbolsInput(preset.trackedSymbols.join(', ')).join(', ');

  return (
    <form action={formAction} className="account-form">
      <div className="account-form__header">
        <h2>{labels.title}</h2>
        <p>{labels.description}</p>
      </div>

      {state.message ? (
        <div className={`form-banner form-banner--${state.status === 'error' ? 'error' : 'success'}`}>{state.message}</div>
      ) : null}

      <div className="form-grid form-grid--two">
        <label className="form-field">
          <span>{labels.locale}</span>
          <select name="locale" defaultValue={preset.locale}>
            {supportedLocales.map((locale) => (
              <option key={locale} value={locale}>
                {localeLabels[locale]}
              </option>
            ))}
          </select>
        </label>

        <label className="form-field">
          <span>{labels.defaultChartType}</span>
          <select name="defaultChartType" defaultValue={preset.defaultChartType}>
            {availableChartTypes.map((chartType: ChartType) => (
              <option key={chartType} value={chartType}>
                {chartType}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="form-grid form-grid--two">
        <label className="form-field">
          <span>{labels.defaultTimePeriod}</span>
          <select name="defaultTimePeriod" defaultValue={preset.defaultTimePeriod}>
            {availableTimePeriods.map((timePeriod: TimePeriod) => (
              <option key={timePeriod} value={timePeriod}>
                {timePeriod}
              </option>
            ))}
          </select>
        </label>

        <label className="form-field">
          <span>{labels.trackedSymbols}</span>
          <input
            id={trackedSymbolsFieldId}
            name={trackedSymbolsFieldId}
            defaultValue={normalizedTrackedSymbols}
            placeholder="AAPL, MSFT, NVDA, SPY (max 12)"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            aria-describedby={trackedSymbolsHintId}
          />
          {state.fieldErrors.trackedSymbols ? <span className="form-field__error">{state.fieldErrors.trackedSymbols}</span> : null}
          <span className="form-field__hint" id={trackedSymbolsHintId}>
            {labels.trackedSymbolsHint} Use comma-separated symbols. We trim spaces, uppercase entries, and remove duplicates.
          </span>
        </label>
      </div>

      <fieldset className="form-fieldset">
        <legend>{labels.visibleModules}</legend>
        <div className="form-checkbox-grid">
          {availableDashboardModules.map((moduleId: DashboardModuleId) => (
            <label key={moduleId} className="form-checkbox">
              <input
                type="checkbox"
                name="visibleModules"
                value={moduleId}
                defaultChecked={preset.visibleModules.includes(moduleId)}
              />
              <span>{moduleId}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="form-fieldset">
        <legend>{labels.simulationPreferencesTitle}</legend>
        <div className="form-grid form-grid--two">
          <label className="form-field">
            <span>{labels.preferredBrokerMode}</span>
            <select name="preferredBrokerMode" defaultValue={preset.simulationPreferences.preferredBrokerMode}>
              {brokerModes.map((mode) => (
                <option key={mode} value={mode}>
                  {brokerModeLabels[mode]}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>{labels.defaultAssetScope}</span>
            <select name="defaultAssetScope" defaultValue={preset.simulationPreferences.defaultAssetScope}>
              {brokerAssetScopes.map((scope) => (
                <option key={scope} value={scope}>
                  {brokerAssetScopeLabels[scope]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-grid form-grid--two">
          <label className="form-field">
            <span>{labels.brokerModeCapitalLimitUsd}</span>
            <input
              name="brokerModeCapitalLimitUsd"
              type="number"
              min={0}
              step={100}
              defaultValue={preset.simulationPreferences.brokerModeCapitalLimitUsd}
            />
          </label>

          <label className="form-field">
            <span>{labels.microTradeAllocationPercent}</span>
            <input
              name="microTradeAllocationPercent"
              type="number"
              min={0}
              max={100}
              step={1}
              defaultValue={preset.simulationPreferences.microTradeAllocationPercent}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="form-fieldset">
        <legend>{labels.activityPreferencesTitle}</legend>
        <div className="form-checkbox-grid">
          <label className="form-checkbox">
            <input
              type="checkbox"
              name="orderActivityDigest"
              defaultChecked={preset.activityPreferences.orderActivityDigest}
            />
            <span>{labels.orderActivityDigest}</span>
          </label>
          <label className="form-checkbox">
            <input
              type="checkbox"
              name="laneStatusAlerts"
              defaultChecked={preset.activityPreferences.laneStatusAlerts}
            />
            <span>{labels.laneStatusAlerts}</span>
          </label>
        </div>
      </fieldset>

      <FormSubmitButton label={labels.save} pendingLabel={`${labels.save}...`} className="account-form__submit" />
    </form>
  );
}
