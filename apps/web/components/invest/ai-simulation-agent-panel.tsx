'use client';

import { useState, useTransition } from 'react';
import {
  runAiSimulationAgentAction,
  confirmAiSimulationTradeAction,
} from '../../server/actions/ai-simulation-agent-actions';
import type { AiSimulationAgentResult } from '@repo/api-contracts';

type Props = {
  isAvailable: boolean;
  unavailableReason?: string;
  isReadOnly: boolean;
  readOnlyReason?: string;
};

export function AiSimulationAgentPanel({
  isAvailable,
  unavailableReason,
  isReadOnly,
  readOnlyReason,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [isConfirming, startConfirming] = useTransition();
  const [lastResult, setLastResult] = useState<AiSimulationAgentResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [confirmFeedback, setConfirmFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  function handleRunAgent(formData: FormData) {
    setRunError(null);
    setConfirmFeedback(null);
    startTransition(async () => {
      const result = await runAiSimulationAgentAction(formData);
      if (result.ok) {
        setLastResult(result.result);
      } else {
        setRunError(result.error);
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
        </div>
        <span className="status-pill status-pill--info">Simulation only</span>
      </div>

      {!isAvailable && (
        <div className="analytics-card__body">
          <p style={{ color: 'var(--color-text-warning, #b45309)', fontSize: '0.875rem' }}>
            {unavailableReason ??
              'AI simulation agent unavailable — missing server configuration (OPENAI_API_KEY).'}
          </p>
        </div>
      )}

      {isAvailable && (
        <div className="analytics-card__body" style={{ display: 'grid', gap: '1rem' }}>
          {isReadOnly && (
            <div
              style={{
                padding: '0.625rem 0.875rem',
                background: 'rgba(220,38,38,0.08)',
                border: '1px solid rgba(220,38,38,0.4)',
                borderRadius: '6px',
                fontSize: '0.8125rem',
              }}
            >
              AI simulation agent is disabled because this simulation session is read-only.
              {readOnlyReason ? ` ${readOnlyReason}` : ''}
            </div>
          )}

          <div
            style={{
              padding: '0.625rem 0.875rem',
              background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.4)',
              borderRadius: '6px',
              fontSize: '0.8125rem',
            }}
          >
            This agent does not trade real money. All proposed and executed actions are
            simulated within your fictive cash account and subject to existing risk guards.
          </div>

          <form action={handleRunAgent} style={{ display: 'grid', gap: '0.875rem' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: '0.75rem',
              }}
            >
              <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.8125rem' }}>
                Max notional / trade ($)
                <input
                  name="maxNotionalPerTrade"
                  type="number"
                  defaultValue={500}
                  min={10}
                  max={100000}
                  step={10}
                  required
                  style={{ padding: '0.375rem 0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'inherit', width: '100%' }}
                />
              </label>

              <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.8125rem' }}>
                Max daily notional ($)
                <input
                  name="maxDailyNotional"
                  type="number"
                  defaultValue={2000}
                  min={10}
                  max={500000}
                  step={50}
                  required
                  style={{ padding: '0.375rem 0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'inherit', width: '100%' }}
                />
              </label>

              <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.8125rem' }}>
                Max open exposure ($)
                <input
                  name="maxOpenExposure"
                  type="number"
                  defaultValue={5000}
                  min={10}
                  max={1000000}
                  step={100}
                  required
                  style={{ padding: '0.375rem 0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'inherit', width: '100%' }}
                />
              </label>
            </div>

            <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.8125rem', maxWidth: '320px' }}>
              Autonomy mode
              <select
                name="autonomyMode"
                defaultValue="suggest_only"
                style={{ padding: '0.375rem 0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'inherit' }}
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
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                background: 'var(--color-primary, #2563eb)',
                color: '#fff',
                border: 'none',
                cursor: isPending || isReadOnly ? 'not-allowed' : 'pointer',
                opacity: isPending || isReadOnly ? 0.7 : 1,
                fontSize: '0.875rem',
                fontWeight: 600,
                alignSelf: 'start',
              }}
            >
              {isPending ? 'Analyzing…' : 'Run AI simulation agent'}
            </button>
          </form>

          {runError !== null && (
            <p style={{ color: 'var(--color-danger, #dc2626)', fontSize: '0.8125rem', margin: 0 }}>
              {runError}
            </p>
          )}

          {decision !== undefined && decision !== null && (
            <div
              style={{
                display: 'grid',
                gap: '0.75rem',
                padding: '1rem',
                background: 'var(--color-surface-subtle, rgba(0,0,0,0.03))',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.625rem',
                  flexWrap: 'wrap',
                }}
              >
                <strong>Decision:</strong>
                <span className={`status-pill status-pill--${actionPillTone}`}>
                  {decision.action}
                </span>
                {decision.symbol !== null && (
                  <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                    {decision.symbol}
                  </span>
                )}
                {decision.notional !== null && (
                  <span style={{ fontSize: '0.875rem' }}>
                    ${decision.notional.toLocaleString('en-US', { maximumFractionDigits: 2 })} notional
                  </span>
                )}
                <span style={{ fontSize: '0.875rem' }}>
                  Confidence: {(decision.confidence * 100).toFixed(0)}%
                </span>
              </div>

              <div>
                <div style={{ fontWeight: 600, fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
                  Reasoning
                </div>
                <p style={{ fontSize: '0.8125rem', margin: 0, lineHeight: 1.5 }}>
                  {decision.reasoning}
                </p>
              </div>

              <div>
                <div style={{ fontWeight: 600, fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
                  Risk notes
                </div>
                <p style={{ fontSize: '0.8125rem', margin: 0, lineHeight: 1.5 }}>
                  {decision.riskNotes}
                </p>
              </div>

              {decision.rejectedReason !== null && (
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-warning, #b45309)', margin: 0 }}>
                  Rejected reason: {decision.rejectedReason}
                </p>
              )}

              {lastResult?.tradeSubmitted && (
                <p style={{ color: 'var(--color-success, #16a34a)', fontSize: '0.8125rem', margin: 0, fontWeight: 600 }}>
                  Simulated trade submitted autonomously.
                </p>
              )}

              {lastResult?.tradeError !== null && lastResult?.tradeError !== undefined && (
                <p style={{ color: 'var(--color-danger, #dc2626)', fontSize: '0.8125rem', margin: 0 }}>
                  Autonomous trade error: {lastResult.tradeError}
                </p>
              )}

              <p style={{ fontSize: '0.75rem', margin: 0, opacity: 0.55, fontStyle: 'italic' }}>
                This is a simulation-only decision. No real money is involved.
              </p>

              {canConfirm && decision.proposedOrder !== null && (
                <form
                  action={handleConfirmTrade}
                  style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap', alignItems: 'center' }}
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
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '6px',
                      background: 'var(--color-primary, #2563eb)',
                      color: '#fff',
                      border: 'none',
                      cursor: isConfirming || isReadOnly ? 'not-allowed' : 'pointer',
                      opacity: isConfirming || isReadOnly ? 0.7 : 1,
                      fontSize: '0.875rem',
                      fontWeight: 600,
                    }}
                  >
                    {isConfirming
                      ? 'Submitting…'
                      : `Confirm: simulate ${decision.proposedOrder.side.toUpperCase()} ${decision.proposedOrder.symbol} ($${decision.proposedOrder.notional})`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLastResult(null)}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '6px',
                      background: 'transparent',
                      border: '1px solid var(--color-border)',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      color: 'inherit',
                    }}
                  >
                    Dismiss
                  </button>
                </form>
              )}
            </div>
          )}

          {confirmFeedback !== null && (
            <p
              style={{
                color: confirmFeedback.ok
                  ? 'var(--color-success, #16a34a)'
                  : 'var(--color-danger, #dc2626)',
                fontSize: '0.8125rem',
                margin: 0,
                fontWeight: confirmFeedback.ok ? 600 : 400,
              }}
            >
              {confirmFeedback.message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
