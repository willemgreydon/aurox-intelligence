'use client';

import { useState, useTransition } from 'react';
import {
  runAiSimulationAgentAction,
  confirmAiSimulationTradeAction,
} from '../../server/actions/ai-simulation-agent-actions';
import type { AiSimulationAgentResult } from '@repo/api-contracts';
import { getAgentCapRules } from '../../lib/simulation-number-rules';
import { normalizeAgentError } from '../../lib/simulation-form-helpers';

type Props = {
  isAvailable: boolean;
  unavailableReason?: string;
  providerWarning?: string;
  isReadOnly: boolean;
  readOnlyReason?: string;
  labels?: Partial<{
    providerUnavailableSafeHold: string;
    rawProviderError: string;
    maxNotionalPerTrade: string;
    maxDailyNotional: string;
    maxOpenExposure: string;
    commonAmount: string;
    runAgent: string;
    minimumForFieldTemplate: string;
  }>;
};

export function AiSimulationAgentPanel({
  isAvailable,
  unavailableReason,
  providerWarning,
  isReadOnly,
  readOnlyReason,
  labels,
}: Props) {
  function minValueError(field: string, fallback: string) {
    const template = labels?.minimumForFieldTemplate;
    if (!template) {
      return fallback;
    }
    return template.replace('{{field}}', field);
  }

  const capRules = getAgentCapRules();
  const [isPending, startTransition] = useTransition();
  const [isConfirming, startConfirming] = useTransition();
  const [lastResult, setLastResult] = useState<AiSimulationAgentResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [runErrorRaw, setRunErrorRaw] = useState<string | null>(null);
  const [confirmFeedback, setConfirmFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [agentFormError, setAgentFormError] = useState<string | null>(null);
  const [maxNotionalPerTrade, setMaxNotionalPerTrade] = useState(capRules.maxNotionalPerTrade);
  const [maxDailyNotional, setMaxDailyNotional] = useState(capRules.maxDailyNotional);
  const [maxOpenExposure, setMaxOpenExposure] = useState(capRules.maxOpenExposure);

  function handleRunAgent(formData: FormData) {
    setRunError(null);
    setRunErrorRaw(null);
    setAgentFormError(null);
    setConfirmFeedback(null);
    const maxNotionalPerTradeInput = Number(formData.get('maxNotionalPerTrade') ?? 0);
    const maxDailyNotionalInput = Number(formData.get('maxDailyNotional') ?? 0);
    const maxOpenExposureInput = Number(formData.get('maxOpenExposure') ?? 0);
    if (!Number.isFinite(maxNotionalPerTradeInput) || maxNotionalPerTradeInput < capRules.min) {
      setAgentFormError(
        minValueError(
          labels?.maxNotionalPerTrade ?? 'Max notional / trade',
          'Max notional per trade must be at least 1.',
        ),
      );
      return;
    }
    if (!Number.isFinite(maxDailyNotionalInput) || maxDailyNotionalInput < capRules.min) {
      setAgentFormError(
        minValueError(
          labels?.maxDailyNotional ?? 'Max daily notional',
          'Max daily notional must be at least 1.',
        ),
      );
      return;
    }
    if (!Number.isFinite(maxOpenExposureInput) || maxOpenExposureInput < capRules.min) {
      setAgentFormError(
        minValueError(
          labels?.maxOpenExposure ?? 'Max open exposure',
          'Max open exposure must be at least 1.',
        ),
      );
      return;
    }
    startTransition(async () => {
      const result = await runAiSimulationAgentAction(formData);
      if (result.ok) {
        setLastResult(result.result);
      } else {
        setRunErrorRaw(result.error);
        setRunError(normalizeAgentError(result.error, labels?.providerUnavailableSafeHold ?? 'AI provider unavailable. The agent defaulted to HOLD for safety.'));
      }
    });
  }

  function handleConfirmTrade(formData: FormData) {
    setConfirmFeedback(null);
    startConfirming(async () => {
      const result = await confirmAiSimulationTradeAction(formData);
      if (result.ok) {
        setConfirmFeedback({ ok: true, message: 'Simulated trade submitted successfully.' });
        setLastResult(null);
      } else {
        setConfirmFeedback({
          ok: false,
          message: 'error' in result ? result.error : 'Confirmation failed.',
        });
      }
    });
  }

  const decision = lastResult?.decision;
  const canConfirm =
    decision !== undefined &&
    decision !== null &&
    (decision.action === 'PROPOSE_BUY' || decision.action === 'PROPOSE_SELL') &&
    decision.requiresHumanConfirmation &&
    decision.proposedOrder !== null;

  const actionPillTone =
    decision?.action === 'HOLD'
      ? 'warning'
      : decision?.action === 'PROPOSE_BUY' || decision?.action === 'SIMULATED_BUY_REQUEST'
        ? 'success'
        : 'info';

  return (
    <div className="analytics-card">
      <div className="analytics-card__header">
        <div>
          <div className="section__eyebrow">Experimental — simulation only</div>
          <h3>AI Simulation Broker Agent</h3>
          <p>
            Analyzes your simulation portfolio and market signals, then proposes or executes
            a simulated trade within your configured fictive cash caps. No real broker orders.
            No money movement. All actions use fictive cash only.
          </p>
          <p className="ai-agent-panel__text-sm">
            Create an Anthropic API key in the Anthropic Console and add it to{' '}
            <code>.env.local</code> as <code>ANTHROPIC_API_KEY</code>.
          </p>
        </div>
        <span className="status-pill status-pill--info">Simulation only</span>
      </div>

      {!isAvailable && (
        <div className="analytics-card__body">
          <p className="ai-agent-panel__notice ai-agent-panel__notice--warning">
            {unavailableReason ??
              'AI provider unavailable. The agent defaulted to HOLD for safety.'}
          </p>
        </div>
      )}

      {isAvailable && (
        <div className="analytics-card__body ai-agent-panel">
          {isReadOnly && (
            <div className="ai-agent-panel__notice ai-agent-panel__notice--danger">
              AI simulation agent is disabled because this simulation session is read-only.
              {readOnlyReason ? ` ${readOnlyReason}` : ''}
            </div>
          )}

          <div className="ai-agent-panel__notice ai-agent-panel__notice--caution">
            This agent does not trade real money. All proposed and executed actions are
            simulated within your fictive cash account and subject to existing risk guards.
          </div>
          {providerWarning ? (
            <div className="ai-agent-panel__notice ai-agent-panel__notice--warning">
              {providerWarning}
            </div>
          ) : null}

          <form action={handleRunAgent} noValidate className="ai-agent-panel__form">
            <div className="ai-agent-panel__grid">
              <label className="ai-agent-panel__field">
                {labels?.maxNotionalPerTrade ?? 'Max notional / trade ($)'}
                <input
                  name="maxNotionalPerTrade"
                  type="number"
                  value={maxNotionalPerTrade}
                  min={capRules.min}
                  max={100000}
                  step={capRules.step}
                  inputMode="numeric"
                  onChange={(event) => setMaxNotionalPerTrade(Number(event.currentTarget.value))}
                  className="ai-agent-panel__input"
                />
              </label>

              <label className="ai-agent-panel__field">
                {labels?.maxDailyNotional ?? 'Max daily notional ($)'}
                <input
                  name="maxDailyNotional"
                  type="number"
                  value={maxDailyNotional}
                  min={capRules.min}
                  max={500000}
                  step={capRules.step}
                  inputMode="numeric"
                  onChange={(event) => setMaxDailyNotional(Number(event.currentTarget.value))}
                  className="ai-agent-panel__input"
                />
              </label>

              <label className="ai-agent-panel__field">
                {labels?.maxOpenExposure ?? 'Max open exposure ($)'}
                <input
                  name="maxOpenExposure"
                  type="number"
                  value={maxOpenExposure}
                  min={capRules.min}
                  max={1000000}
                  step={capRules.step}
                  inputMode="numeric"
                  onChange={(event) => setMaxOpenExposure(Number(event.currentTarget.value))}
                  className="ai-agent-panel__input"
                />
              </label>
            </div>
            <div className="ai-agent-panel__chips-wrap">
              <span className="ai-agent-panel__chips-label">{labels?.commonAmount ?? 'Common amount'}</span>
              <div className="ai-agent-panel__chips">
              {capRules.quickValues.map((value) => (
                <button
                  key={value}
                  type="button"
                  className="button button--secondary"
                  onClick={() => {
                    setMaxNotionalPerTrade(value);
                    setMaxDailyNotional(value);
                    setMaxOpenExposure(value);
                  }}
                >
                  {value}
                </button>
              ))}
            </div>
            </div>

            <label className="ai-agent-panel__field ai-agent-panel__field--compact">
              Autonomy mode
              <select
                name="autonomyMode"
                defaultValue="suggest_only"
                className="ai-agent-panel__input"
              >
                <option value="suggest_only">Suggest only — no execution</option>
                <option value="human_confirmed">Human-confirmed simulation</option>
                <option value="autonomous_simulation">Autonomous simulation (within cap)</option>
              </select>
            </label>

            <input type="hidden" name="modeId" value="assisted_confirmation" />

            <button
              type="submit"
              disabled={isPending || isReadOnly}
              className="ai-agent-panel__submit"
            >
              {isPending ? 'Analyzing…' : (labels?.runAgent ?? 'Run AI simulation agent')}
            </button>
          </form>

          {agentFormError !== null && (
            <p className="ai-agent-panel__error">
              {agentFormError}
            </p>
          )}

          {runError !== null && (
            <details className="ai-agent-panel__details">
              <summary>{runError}</summary>
              {runErrorRaw ? (
                <pre className="ai-agent-panel__raw">
                  <strong>{labels?.rawProviderError ?? 'Raw provider error'}:</strong>{'\n'}
                  {runErrorRaw}
                </pre>
              ) : null}
            </details>
          )}

          {decision !== undefined && decision !== null && (
            <div className="ai-agent-panel__decision">
              <div className="ai-agent-panel__decision-meta">
                <strong>Decision:</strong>
                <span className={`status-pill status-pill--${actionPillTone}`}>
                  {decision.action}
                </span>
                {decision.symbol !== null && (
                  <span className="ai-agent-panel__symbol">
                    {decision.symbol}
                  </span>
                )}
                {decision.notional !== null && (
                  <span className="ai-agent-panel__text-sm">
                    ${decision.notional.toLocaleString('en-US', { maximumFractionDigits: 2 })} notional
                  </span>
                )}
                <span className="ai-agent-panel__text-sm">
                  Confidence: {(decision.confidence * 100).toFixed(0)}%
                </span>
              </div>

              <div>
                <div className="ai-agent-panel__label">
                  Reasoning
                </div>
                <p className="ai-agent-panel__body">
                  {decision.reasoning}
                </p>
              </div>

              <div>
                <div className="ai-agent-panel__label">
                  Risk notes
                </div>
                <p className="ai-agent-panel__body">
                  {decision.riskNotes}
                </p>
              </div>

              {decision.rejectedReason !== null && (
                <p className="ai-agent-panel__warning">
                  Rejected reason: {decision.rejectedReason}
                </p>
              )}

              {lastResult?.tradeSubmitted && (
                <p className="ai-agent-panel__success">
                  Simulated trade submitted autonomously.
                </p>
              )}

              {lastResult?.tradeError !== null && lastResult?.tradeError !== undefined && (
                <p className="ai-agent-panel__error">
                  Autonomous trade error: {lastResult.tradeError}
                </p>
              )}

              <p className="ai-agent-panel__disclaimer">
                This is a simulation-only decision. No real money is involved.
              </p>

              {canConfirm && decision.proposedOrder !== null && (
                <form
                  action={handleConfirmTrade}
                  className="ai-agent-panel__confirm"
                >
                  <input
                    type="hidden"
                    name="proposedOrderJson"
                    value={JSON.stringify(decision.proposedOrder)}
                  />
                  <input type="hidden" name="reasoning" value={decision.reasoning} />
                  <input
                    type="hidden"
                    name="confidence"
                    value={decision.confidence.toString()}
                  />
                  <input
                    type="hidden"
                    name="decisionAuditId"
                    value={lastResult?.decisionAuditId ?? ''}
                  />
                  <input
                    type="hidden"
                    name="maxDailyNotional"
                    value={(lastResult?.capSettings.maxDailyNotional ?? 0).toString()}
                  />
                  <button
                    type="submit"
                    disabled={isConfirming || isReadOnly}
                    className="ai-agent-panel__submit"
                  >
                    {isConfirming
                      ? 'Submitting…'
                      : `Confirm: simulate ${decision.proposedOrder.side.toUpperCase()} ${decision.proposedOrder.symbol} ($${decision.proposedOrder.notional})`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLastResult(null)}
                    className="button button--secondary"
                  >
                    Dismiss
                  </button>
                </form>
              )}
            </div>
          )}

          {confirmFeedback !== null && (
            <p className={confirmFeedback.ok ? 'ai-agent-panel__success' : 'ai-agent-panel__error'}>
              {confirmFeedback.message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
