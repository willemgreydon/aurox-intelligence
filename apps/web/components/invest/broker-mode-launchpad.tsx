'use client';

import Link from 'next/link';
import { useFormStatus } from 'react-dom';
import { useEffect, useMemo, useState } from 'react';
import type { SimulationLaneId } from '@repo/api-contracts';
import { startSimulationSessionAction } from '../../server/actions/simulation-actions';
import { Disclosure } from '../ui/disclosure';
import {
  SIMULATION_LANE_DEFINITIONS,
  type SimulationLaneAssetScope,
} from '../../lib/simulation-lane-catalog';

// Single source of truth for lane metadata (shared with the server-side lane
// detail service — see apps/web/lib/simulation-lane-catalog.ts).
const brokerModes = SIMULATION_LANE_DEFINITIONS;

type BrokerModeLaunchpadProps = {
  baseCapitalUsd: number;
  isAuthenticated: boolean;
  simulationHref?: string;
  loginHref?: string;
  title?: string;
  description?: string;
  returnTo?: '/invest' | '/invest/simulation';
  defaultLaneId?: SimulationLaneId;
  activeSessionId?: string | null;
  activeLaneId?: SimulationLaneId | null;
};

function formatScopeLabel(scope: SimulationLaneAssetScope) {
  switch (scope) {
    case 'multi-asset':
      return 'Multi-asset';
    case 'stock':
      return 'Stock';
    case 'etf':
      return 'ETF';
    case 'crypto':
      return 'Crypto';
    default:
      return scope;
  }
}

function StartSimulationButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="button button--primary simulation-form__button"
      disabled={pending}
      aria-busy={pending}
    >
      <span>{pending ? 'Starting simulation...' : 'Start simulation'}</span>
      <span className="button__spinner" aria-hidden="true" />
    </button>
  );
}

export function BrokerModeLaunchpad({
  baseCapitalUsd,
  isAuthenticated,
  simulationHref = '/invest/simulation',
  loginHref = '/login',
  title = 'Start simulation and choose a broker mode',
  description = 'Select a mode, set a capital limit, define asset scope, and tune micro-allocation before starting simulation activity.',
  returnTo = '/invest/simulation',
  defaultLaneId = 'manual_stock_lane',
  activeSessionId = null,
  activeLaneId = null,
}: BrokerModeLaunchpadProps) {
  const initialMode = brokerModes.find((mode) => mode.id === defaultLaneId) ?? brokerModes[0]!;
  const [selectedModeId, setSelectedModeId] = useState<SimulationLaneId>(initialMode.id);
  const selectedMode = brokerModes.find((mode) => mode.id === selectedModeId) ?? brokerModes[0]!;

  const [maxCapital, setMaxCapital] = useState<number>(
    Math.max(0, Math.round(baseCapitalUsd * initialMode.defaultCapitalShare)),
  );
  const [microRatio, setMicroRatio] = useState<number>(initialMode.defaultMicroRatio * 100);
  const [assetScope, setAssetScope] = useState<SimulationLaneAssetScope>(
    initialMode.assetScopeOptions[0] ?? 'stock',
  );

  useEffect(() => {
    const nextMode = brokerModes.find((mode) => mode.id === defaultLaneId) ?? brokerModes[0]!;
    setSelectedModeId(nextMode.id);
    setMaxCapital(Math.max(0, Math.round(baseCapitalUsd * nextMode.defaultCapitalShare)));
    setMicroRatio(nextMode.defaultMicroRatio * 100);
    setAssetScope(nextMode.assetScopeOptions[0] ?? 'stock');
  }, [baseCapitalUsd, defaultLaneId]);

  const statusLabel =
    selectedMode.status === 'active'
      ? 'Active in simulation'
      : selectedMode.status === 'limited'
        ? 'Limited support'
        : 'Planned';

  const allocationPerTrade = useMemo(
    () => Math.round((Math.max(0, maxCapital) * Math.max(0, microRatio)) / 100),
    [maxCapital, microRatio],
  );

  const isCurrentLane = activeLaneId === selectedMode.id && Boolean(activeSessionId);

  const maxCapitalInputId = `lane-max-capital-${selectedMode.id}`;
  const assetScopeInputId = `lane-asset-scope-${selectedMode.id}`;
  const microRatioInputId = `lane-micro-ratio-${selectedMode.id}`;

  return (
    <div className="broker-mode-launchpad">
      <div className="broker-mode-launchpad__header">
        <div className="section__eyebrow">Simulation entry</div>
        <h3>{title}</h3>
        <p>{description}</p>
        <Disclosure summary="What is a simulation lane?">
          <p>
            A simulation lane is an isolated paper-trading workspace with its own capital limit,
            asset scope, and risk guardrails. Orders placed here never touch real money or real
            markets — they run through the same deterministic engine used for analysis, so you can
            practice and compare approaches safely. Past simulated results do not predict future
            outcomes.
          </p>
        </Disclosure>
      </div>

      <div className="broker-mode-launchpad__grid">
        {brokerModes.map((mode) => {
          const isSelected = mode.id === selectedModeId;

          return (
            <label
              key={mode.id}
              className={`broker-mode-card gt-hover-lift${isSelected ? ' broker-mode-card--active' : ''}`}
            >
              <input
                id={`broker-mode-${mode.id}`}
                type="radio"
                name="broker-mode"
                value={mode.id}
                checked={isSelected}
                onChange={() => {
                  setSelectedModeId(mode.id);
                  setMaxCapital(Math.max(0, Math.round(baseCapitalUsd * mode.defaultCapitalShare)));
                  setMicroRatio(mode.defaultMicroRatio * 100);
                  setAssetScope(mode.assetScopeOptions[0] ?? 'stock');
                }}
              />
              <div className="broker-mode-card__content">
                <div className="broker-mode-card__title-row">
                  <strong>{mode.label}</strong>
                  <span
                    className={`status-pill status-pill--${
                      mode.status === 'active' ? 'success' : mode.status === 'limited' ? 'warning' : 'info'
                    }`}
                  >
                    {mode.status}
                  </span>
                </div>
                <p>{mode.description}</p>
                <p>{mode.supportNote}</p>
              </div>
            </label>
          );
        })}
      </div>

      <div className="broker-mode-config">
        <div className="broker-mode-config__status">
          <strong>{selectedMode.label}</strong>
          <span>{statusLabel}</span>
        </div>

        <div className="form-grid form-grid--three">
          <label className="form-field" htmlFor={maxCapitalInputId}>
            <span>Max capital limit (USD)</span>
            <input
              id={maxCapitalInputId}
              name="maxCapitalUsdPreview"
              type="number"
              min={0}
              step={100}
              value={maxCapital}
              onChange={(event) => setMaxCapital(Number(event.target.value || 0))}
              disabled={selectedMode.status === 'planned'}
              autoComplete="off"
            />
          </label>

          <label className="form-field" htmlFor={assetScopeInputId}>
            <span>Asset scope</span>
            <select
              id={assetScopeInputId}
              name="assetScopePreview"
              value={assetScope}
              onChange={(event) =>
                setAssetScope(event.target.value as SimulationLaneAssetScope)
              }
              disabled={selectedMode.status === 'planned'}
            >
              {selectedMode.assetScopeOptions.map((scope) => (
                <option key={scope} value={scope}>
                  {formatScopeLabel(scope)}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field" htmlFor={microRatioInputId}>
            <span>Micro-trading ratio (%)</span>
            <input
              id={microRatioInputId}
              name="microAllocationPercentPreview"
              type="number"
              min={0}
              max={100}
              step={1}
              value={microRatio}
              onChange={(event) => setMicroRatio(Number(event.target.value || 0))}
              disabled={selectedMode.status === 'planned'}
              autoComplete="off"
            />
          </label>
        </div>

        <div className="broker-mode-config__summary">
          <p>Configured lane limit: {Math.max(0, maxCapital).toFixed(0)} USD</p>
          <p>Estimated per-micro-order allocation: {allocationPerTrade.toFixed(0)} USD</p>
          <p>Scope: {formatScopeLabel(assetScope)} | Mode: {statusLabel}</p>
          {isCurrentLane ? (
            <p>Current active lane: this mode is already attached to the open simulation session.</p>
          ) : (
            <p>Starting the session here will create or resume this lane and open it immediately.</p>
          )}
        </div>

        {!isAuthenticated ? (
          <div className="simulation-form">
            <Link href={loginHref} className="button button--primary simulation-form__button">
              Sign in to start simulation
            </Link>
          </div>
        ) : selectedMode.status === 'planned' ? (
          <div className="simulation-form">
            <button type="button" className="button button--secondary simulation-form__button" disabled>
              Coming soon
            </button>
          </div>
        ) : (
          <form action={startSimulationSessionAction} className="simulation-form">
            <input type="hidden" name="laneId" value={selectedMode.id} />
            <input type="hidden" name="assetScope" value={assetScope} />
            <input type="hidden" name="maxCapitalUsd" value={String(Math.max(0, maxCapital))} />
            <input type="hidden" name="microAllocationPercent" value={String(Math.max(0, microRatio))} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <StartSimulationButton />
          </form>
        )}
      </div>
    </div>
  );
}