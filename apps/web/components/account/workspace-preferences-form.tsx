'use client';

import {
  type BrokerAssetScope,
  type BrokerMode,
  type ChartType,
  type DashboardModuleId,
  type DashboardPreset,
  type TimePeriod,
} from '@repo/api-contracts';
import { useActionState, useMemo, useState } from 'react';
import { availableChartTypes, availableDashboardModules, availableTimePeriods } from '../../lib/workspace';
import { localeLabels, supportedLocales } from '../../lib/i18n/locale-options';
import { emptyFormState } from '../../server/auth/forms';
import { updateWorkspacePreferencesAction } from '../../server/actions/account-actions';
import { FormSubmitButton } from '../auth/form-submit-button';
import { normalizeTrackedSymbols, validateTrackedSymbols } from '../../lib/workspace-preferences';

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
    trackedSymbolsFormatHint: string;
    trackedSymbolsExamples: string;
    trackedSymbolsNormalized: string;
    trackedSymbolsNone: string;
    trackedSymbolsInvalid: string;
    trackedSymbolsIgnored: string;
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
    brokerModeLabels: Record<BrokerMode, string>;
    assetScopeLabels: Record<BrokerAssetScope, string>;
    chartTypeLabels: Record<ChartType, string>;
    timePeriodLabels: Record<TimePeriod, string>;
    moduleLabels: Record<DashboardModuleId, string>;
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

export function WorkspacePreferencesForm({ preset, labels }: WorkspacePreferencesFormProps) {
  const [state, formAction] = useActionState(updateWorkspacePreferencesAction, emptyFormState);
  const trackedSymbolsFieldId = 'trackedSymbols';
  const trackedSymbolsHintId = `${trackedSymbolsFieldId}-hint`;
  const normalizedTrackedSymbols = normalizeTrackedSymbols(preset.trackedSymbols.join(', ')).join(', ');
  const [trackedSymbolsInput, setTrackedSymbolsInput] = useState(normalizedTrackedSymbols);
  const trackedSymbolsValidation = useMemo(
    () => validateTrackedSymbols(normalizeTrackedSymbols(trackedSymbolsInput)),
    [trackedSymbolsInput],
  );

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
                {labels.chartTypeLabels[chartType] ?? chartType}
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
                {labels.timePeriodLabels[timePeriod] ?? timePeriod}
              </option>
            ))}
          </select>
        </label>

        <label className="form-field">
          <span>{labels.trackedSymbols}</span>
          <input
            id={trackedSymbolsFieldId}
            name={trackedSymbolsFieldId}
            value={trackedSymbolsInput}
            onChange={(event) => setTrackedSymbolsInput(event.target.value)}
            placeholder="AAPL, MSFT, NVDA, SPY (max 12)"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            aria-describedby={trackedSymbolsHintId}
          />
          {state.fieldErrors.trackedSymbols ? <span className="form-field__error">{state.fieldErrors.trackedSymbols}</span> : null}
          <span className="form-field__hint" id={trackedSymbolsHintId}>
            {labels.trackedSymbolsHint} {labels.trackedSymbolsFormatHint}
          </span>
          <span className="form-field__hint">
            {labels.trackedSymbolsNormalized}: {trackedSymbolsValidation.normalized.join(', ') || labels.trackedSymbolsNone} ({trackedSymbolsValidation.message})
          </span>
          {!trackedSymbolsValidation.isValid ? (
            <span className="form-field__error">{labels.trackedSymbolsInvalid}</span>
          ) : null}
          {trackedSymbolsValidation.invalid.length > 0 ? (
            <span className="form-field__error">
              {labels.trackedSymbolsIgnored}: {trackedSymbolsValidation.invalid.join(', ')}
            </span>
          ) : null}
          <span className="form-field__hint">{labels.trackedSymbolsExamples}</span>
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
              <span>{labels.moduleLabels[moduleId] ?? moduleId}</span>
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
                  {labels.brokerModeLabels[mode]}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>{labels.defaultAssetScope}</span>
            <select name="defaultAssetScope" defaultValue={preset.simulationPreferences.defaultAssetScope}>
              {brokerAssetScopes.map((scope) => (
                <option key={scope} value={scope}>
                  {labels.assetScopeLabels[scope]}
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
            {state.fieldErrors.brokerModeCapitalLimitUsd ? (
              <span className="form-field__error">{state.fieldErrors.brokerModeCapitalLimitUsd}</span>
            ) : null}
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
            {state.fieldErrors.microTradeAllocationPercent ? (
              <span className="form-field__error">{state.fieldErrors.microTradeAllocationPercent}</span>
            ) : null}
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

      <FormSubmitButton
        label={labels.save}
        pendingLabel={`${labels.save}...`}
        className="account-form__submit"
        disabled={!trackedSymbolsValidation.isValid}
      />
    </form>
  );
}
