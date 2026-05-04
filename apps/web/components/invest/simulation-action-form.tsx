'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { emptyFormState, type FormState, type OrderResult } from '../../server/auth/forms';
import {
  createSimulatedOrderAction,
  resetSimulationAccountAction,
  toggleWatchlistAction,
} from '../../server/actions/simulation-actions';

type ActionButtonProps = {
  label: string;
  className: string;
  disabled?: boolean;
};

function ActionButton({ label, className, disabled = false }: ActionButtonProps) {
  const { pending } = useFormStatus();
  const isDisabled = pending || disabled;

  return (
    <button type="submit" className={className} disabled={isDisabled} aria-busy={pending}>
      <span>{pending ? `${label}...` : label}</span>
      <span className="button__spinner" aria-hidden="true" />
    </button>
  );
}

type WatchlistToggleFormProps = {
  assetId: string;
  symbol: string;
  assetClass: 'stock' | 'etf' | 'crypto' | 'fx';
  active: boolean;
  label: string;
};

export function WatchlistToggleForm({ assetId, symbol, assetClass, active, label }: WatchlistToggleFormProps) {
  const [state, formAction] = useActionState(toggleWatchlistAction, emptyFormState);
  const messageId = `watchlist-message-${assetId}`;

  return (
    <form action={formAction} className="simulation-form">
      <input type="hidden" name="assetId" value={assetId} />
      <input type="hidden" name="symbol" value={symbol} />
      <input type="hidden" name="assetClass" value={assetClass} />
      <ActionButton
        className={`button ${active ? 'button--primary' : 'button--secondary'} simulation-form__button`}
        label={label}
      />
      {state.message ? (
        <p id={messageId} className={`simulation-form__meta simulation-form__meta--${state.status}`} aria-live="polite">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

type SimulatedOrderFormProps = {
  assetId: string;
  symbol: string;
  assetClass: 'stock' | 'etf' | 'crypto';
  side: 'buy' | 'sell';
  strategyLaneId?:
    | 'manual_stock_lane'
    | 'manual_multi_asset_lane'
    | 'ai_copilot_lane'
    | 'signal_follow_lane'
    | 'agent_sandbox_lane';
  simulationSessionId?: string | undefined;
  label: string;
  quantity?: number;
  minQuantity?: number;
  maxQuantity?: number | null;
  currentHeldQuantity?: number | null;
  currentPrice?: number | null;
  showQuantityInput?: boolean;
  quantityLabel?: string;
  disabled?: boolean;
  disabledReason?: string | undefined;
};

export function SimulatedOrderForm({
  assetId,
  symbol,
  assetClass,
  side,
  strategyLaneId = 'manual_stock_lane',
  simulationSessionId,
  label,
  quantity = 1,
  minQuantity = 0.0001,
  maxQuantity = null,
  currentHeldQuantity = null,
  currentPrice = null,
  showQuantityInput = false,
  quantityLabel = 'Quantity',
  disabled = false,
  disabledReason,
}: SimulatedOrderFormProps) {
  const [state, formAction] = useActionState(createSimulatedOrderAction, emptyFormState);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [quantityValue, setQuantityValue] = useState(() => formatQuantityInput(quantity));
  const quantityId = `${assetId}-${side}-quantity`;
  const quantityError = state.fieldErrors.quantity;
  const messageId = `${assetId}-${side}-message`;

  useEffect(() => {
    if (state.status === 'success') {
      setIdempotencyKey(crypto.randomUUID());
      if (showQuantityInput) {
        setQuantityValue(formatQuantityInput(quantity));
      }
    }
  }, [quantity, showQuantityInput, state.status]);

  const sanitizedQuantity = useMemo(() => {
    const parsed = Number(quantityValue);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return null;
    }
    return parsed;
  }, [quantityValue]);

  const hasNoPositionToSell = side === 'sell' && (currentHeldQuantity ?? 0) <= 0;

  const effectiveDisabledReason = disabled
    ? disabledReason
    : hasNoPositionToSell
      ? `No open ${symbol} position is available to sell.`
      : undefined;

  const estimatedGross =
    sanitizedQuantity !== null && typeof currentPrice === 'number' && Number.isFinite(currentPrice) && currentPrice > 0
      ? sanitizedQuantity * currentPrice
      : null;

  const fillDetail = state.status === 'success' && state.orderResult ? buildFillDetail(state.orderResult) : null;
  const describedByIds = [quantityError ? `${quantityId}-error` : null, `${quantityId}-hint`].filter(Boolean).join(' ') || undefined;

  return (
    <form action={formAction} className="simulation-form">
      <input type="hidden" name="assetId" value={assetId} />
      <input type="hidden" name="symbol" value={symbol} />
      <input type="hidden" name="assetClass" value={assetClass} />
      <input type="hidden" name="side" value={side} />
      <input type="hidden" name="strategyLaneId" value={strategyLaneId} />
      <input type="hidden" name="decisionSource" value="manual_ui" />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      {simulationSessionId ? <input type="hidden" name="simulationSessionId" value={simulationSessionId} /> : null}

      {showQuantityInput ? (
        <label className="form-field" htmlFor={quantityId}>
          <span>{quantityLabel}</span>
          <input
            id={quantityId}
            name="quantity"
            type="number"
            min={String(minQuantity)}
            step="0.0001"
            max={typeof maxQuantity === 'number' && Number.isFinite(maxQuantity) ? String(maxQuantity) : undefined}
            value={quantityValue}
            inputMode="decimal"
            onChange={(event) => setQuantityValue(event.currentTarget.value)}
            aria-invalid={quantityError ? 'true' : 'false'}
            aria-describedby={describedByIds}
          />
          <span id={`${quantityId}-hint`} className="simulation-form__meta">
            {buildQuantityHint({
              side,
              symbol,
              currentHeldQuantity,
              currentPrice,
              sanitizedQuantity,
              estimatedGross,
              maxQuantity,
            })}
          </span>
          {quantityError ? (
            <span id={`${quantityId}-error`} className="simulation-form__meta simulation-form__meta--error">
              {quantityError}
            </span>
          ) : null}
        </label>
      ) : (
        <input type="hidden" name="quantity" value={String(quantity)} />
      )}

      <ActionButton className="button button--secondary simulation-form__button" label={label} disabled={disabled || hasNoPositionToSell} />

      <SimulationFormFeedback
        messageId={messageId}
        effectiveDisabledReason={effectiveDisabledReason}
        fillDetail={fillDetail}
        state={state}
      />
    </form>
  );
}

function SimulationFormFeedback({
  messageId,
  effectiveDisabledReason,
  fillDetail,
  state,
}: {
  messageId: string;
  effectiveDisabledReason: string | undefined;
  fillDetail: string | null;
  state: FormState;
}) {
  return (
    <>
      {effectiveDisabledReason ? (
        <p className="simulation-form__meta simulation-form__meta--warning" aria-live="polite">
          {effectiveDisabledReason}
        </p>
      ) : null}

      {fillDetail ? (
        <p id={messageId} className="simulation-form__meta simulation-form__meta--success" role="status" aria-live="polite">
          {fillDetail}
        </p>
      ) : state.status === 'error' && state.message ? (
        <p id={messageId} className="simulation-form__meta simulation-form__meta--error" role="alert" aria-live="assertive">
          {state.message}
        </p>
      ) : state.status === 'success' && state.message && !fillDetail ? (
        <p id={messageId} className="simulation-form__meta simulation-form__meta--success" role="status" aria-live="polite">
          {state.message}
        </p>
      ) : null}
    </>
  );
}

function formatUsd(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '—';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatQuantityInput(value: number) {
  return Number.isFinite(value) ? String(Math.max(value, 0.0001)) : '1';
}

function formatQuantity(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '0.0000';
  }

  return value.toFixed(4);
}

function buildQuantityHint(input: {
  side: 'buy' | 'sell';
  symbol: string;
  currentHeldQuantity: number | null;
  currentPrice: number | null;
  sanitizedQuantity: number | null;
  estimatedGross: number | null;
  maxQuantity: number | null;
}) {
  const fragments: string[] = [];

  if (input.side === 'sell') {
    fragments.push(`Held: ${formatQuantity(input.currentHeldQuantity)} ${input.symbol}`);
  }

  if (typeof input.maxQuantity === 'number' && Number.isFinite(input.maxQuantity) && input.maxQuantity > 0) {
    fragments.push(`Max: ${formatQuantity(input.maxQuantity)} ${input.symbol}`);
  }

  if (typeof input.currentPrice === 'number' && Number.isFinite(input.currentPrice) && input.currentPrice > 0) {
    fragments.push(`Last price: ${formatUsd(input.currentPrice)}`);
  }

  if (input.sanitizedQuantity !== null && input.estimatedGross !== null) {
    fragments.push(`Estimated notional: ${formatUsd(input.estimatedGross)}`);
  }

  if (fragments.length === 0) {
    return 'Orders use the latest available cached price in simulation mode.';
  }

  return fragments.join(' · ');
}

function buildFillDetail(result: OrderResult): string {
  const verb = result.side === 'buy' ? 'Bought' : 'Sold';
  const gross = `$${result.grossAmount.toFixed(2)}`;
  const pnl =
    result.side === 'sell' && result.realizedPnl !== 0
      ? ` · P&L: ${result.realizedPnl >= 0 ? '+' : ''}$${result.realizedPnl.toFixed(2)}`
      : '';
  return `${verb} ${result.quantity.toFixed(4)} ${result.symbol} @ $${result.executionPrice.toFixed(2)} · ${gross}${pnl}`;
}

type ResetSimulationAccountFormProps = {
  label: string;
};

export function ResetSimulationAccountForm({ label }: ResetSimulationAccountFormProps) {
  const [state, formAction] = useActionState(resetSimulationAccountAction, emptyFormState);
  const [confirmPending, setConfirmPending] = useState(false);
  const messageId = 'reset-simulation-message';

  if (!confirmPending) {
    return (
      <div className="simulation-form">
        <button
          type="button"
          className="button button--secondary simulation-form__button"
          onClick={() => setConfirmPending(true)}
        >
          {label}
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="simulation-form simulation-form--confirm">
      <p className="simulation-form__meta simulation-form__meta--warning" role="alert">
        This will wipe all positions, orders, and transactions. This cannot be undone.
      </p>
      <div className="simulation-form__confirm-actions">
        <ActionButton className="button button--danger simulation-form__button" label="Confirm reset" />
        <button
          type="button"
          className="button button--secondary simulation-form__button"
          onClick={() => setConfirmPending(false)}
        >
          Cancel
        </button>
      </div>
      {state.message ? (
        <p id={messageId} className={`simulation-form__meta simulation-form__meta--${state.status}`} aria-live="polite">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}