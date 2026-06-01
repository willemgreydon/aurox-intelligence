'use client';

import { useActionState, useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';
import type { SimulatedBrokerActivity } from '@repo/api-contracts';
import {
  generateSimulatedBrokerActivityAction,
  saveSimulatedBrokerActivityToJournalAction,
} from '../../server/actions/finance-actions';
import { emptyFinanceActivityState } from '../../server/actions/finance-actions-state';

type LaneOption = {
  assetId: string;
  symbol: string;
  assetClass: 'stock' | 'etf' | 'crypto';
  canGenerateActivity: boolean;
};

type SimulatedActivityPanelProps = {
  lanes: LaneOption[];
  microTradingEnabled: boolean;
  disclaimer: string;
};

function SubmitButton({ label, disabled }: { label: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="button button--primary" disabled={pending || disabled} aria-busy={pending}>
      <span>{pending ? `${label}…` : label}</span>
    </button>
  );
}

const riskToneClass: Record<SimulatedBrokerActivity['riskLevel'], string> = {
  low: 'finance-activity__risk--low',
  medium: 'finance-activity__risk--medium',
  high: 'finance-activity__risk--high',
};

function ActivityResultCard({ activity, disclaimer }: { activity: SimulatedBrokerActivity; disclaimer: string }) {
  const [saveState, saveAction] = useActionState(
    saveSimulatedBrokerActivityToJournalAction,
    emptyFinanceActivityState,
  );
  const serialized = useMemo(() => JSON.stringify(activity), [activity]);

  return (
    <div className="finance-activity" aria-live="polite">
      <div className="finance-activity__head">
        <span className={`finance-activity__action finance-activity__action--${activity.action}`}>
          {activity.action.toUpperCase()}
        </span>
        <span className="finance-activity__symbol">{activity.symbol}</span>
        <span className={`finance-activity__risk ${riskToneClass[activity.riskLevel]}`}>
          {activity.riskLevel.toUpperCase()} RISK
        </span>
        <span className="finance-activity__badge">SIMULATED · PREVIEW</span>
      </div>

      <p className="finance-activity__summary">{activity.decisionSummary}</p>

      <dl className="finance-activity__metrics">
        <div>
          <dt>Simulated notional</dt>
          <dd>{activity.simulatedNotionalLabel}</dd>
        </div>
        <div>
          <dt>Est. fill</dt>
          <dd>{activity.estimatedFillLabel}</dd>
        </div>
        <div>
          <dt>Est. fees</dt>
          <dd>{activity.estimatedFeesLabel}</dd>
        </div>
        <div>
          <dt>Confidence</dt>
          <dd>{activity.confidenceLabel}</dd>
        </div>
        <div>
          <dt>Quote</dt>
          <dd>{activity.quoteSnapshot.freshnessLabel}</dd>
        </div>
        <div>
          <dt>Next best action</dt>
          <dd>{activity.nextBestAction}</dd>
        </div>
      </dl>

      {activity.blockingReasons.length > 0 ? (
        <div className="finance-activity__blocked" role="status">
          <p className="finance-activity__blocked-title">Activity blocked by risk controls</p>
          <ul>
            {activity.blockingReasons.map((reason, index) => (
              <li key={`block-${index}`}>{reason}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {activity.warnings.length > 0 ? (
        <ul className="finance-activity__warnings">
          {activity.warnings.map((warning, index) => (
            <li key={`warn-${index}`}>⚠ {warning}</li>
          ))}
        </ul>
      ) : null}

      <details className="finance-activity__explain">
        <summary>Why this decision</summary>
        <p>{activity.explanation}</p>
      </details>

      <form action={saveAction} className="finance-activity__save">
        <input type="hidden" name="activity" value={serialized} />
        <SubmitButton label="Save to journal" />
        {saveState.message ? (
          <p className={`finance-activity__save-msg finance-activity__save-msg--${saveState.status}`} aria-live="polite">
            {saveState.message}
          </p>
        ) : null}
      </form>

      <p className="finance-activity__disclaimer">{disclaimer}</p>
    </div>
  );
}

/**
 * Central interaction: generate a simulation-only broker activity preview from a
 * starred lane, then optionally save it to the decision journal. No order is
 * ever executed from this surface.
 */
export function SimulatedActivityPanel({ lanes, microTradingEnabled, disclaimer }: SimulatedActivityPanelProps) {
  const tradableLanes = lanes.filter((lane) => lane.canGenerateActivity);
  const [state, formAction] = useActionState(generateSimulatedBrokerActivityAction, emptyFinanceActivityState);
  const [selectedAssetId, setSelectedAssetId] = useState(tradableLanes[0]?.assetId ?? '');

  const selectedLane = tradableLanes.find((lane) => lane.assetId === selectedAssetId) ?? tradableLanes[0] ?? null;

  if (tradableLanes.length === 0) {
    return (
      <p className="finance-empty" role="status" id="finance-generate">
        Star a tradable asset to generate a simulated broker activity preview.
      </p>
    );
  }

  return (
    <div className="finance-generate" id="finance-generate">
      <form action={formAction} className="finance-generate__form">
        <input type="hidden" name="assetId" value={selectedLane?.assetId ?? ''} />
        <input type="hidden" name="symbol" value={selectedLane?.symbol ?? ''} />
        <input type="hidden" name="assetClass" value={selectedLane?.assetClass ?? 'stock'} />
        <input type="hidden" name="mode" value={microTradingEnabled ? 'micro-trading' : 'watchlist-analysis'} />

        <div className="finance-generate__row">
          <label className="form-field finance-generate__field">
            <span>Lane</span>
            <select
              name="laneSelector"
              value={selectedLane?.assetId ?? ''}
              onChange={(event) => setSelectedAssetId(event.target.value)}
            >
              {tradableLanes.map((lane) => (
                <option key={lane.assetId} value={lane.assetId}>
                  {lane.symbol} · {lane.assetClass.toUpperCase()}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field finance-generate__field">
            <span>Side</span>
            <select name="side" defaultValue="buy">
              <option value="buy">Simulated buy</option>
              <option value="sell">Simulated sell</option>
            </select>
            {state.fieldErrors?.side ? <span className="form-field__error">{state.fieldErrors.side}</span> : null}
          </label>

          <label className="form-field finance-generate__field">
            <span>Quantity</span>
            <input name="quantity" type="number" min="0" step="0.0001" defaultValue="1" inputMode="decimal" />
            {state.fieldErrors?.quantity ? (
              <span className="form-field__error">{state.fieldErrors.quantity}</span>
            ) : null}
          </label>
        </div>

        {microTradingEnabled ? (
          <p className="finance-generate__micro-hint">
            Micro-trading mode is enabled — previews favor small, controlled simulated sizes.
          </p>
        ) : null}

        <SubmitButton label="Generate simulated activity" />
        {state.message && state.status === 'error' ? (
          <p className="finance-generate__msg finance-generate__msg--error" aria-live="polite">
            {state.message}
          </p>
        ) : null}
      </form>

      {state.activity ? <ActivityResultCard activity={state.activity} disclaimer={disclaimer} /> : null}
    </div>
  );
}
