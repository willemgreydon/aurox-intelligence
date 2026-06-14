'use client';

import { useActionState, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useFormStatus } from 'react-dom';
import { emptyFormState, type FormState, type OrderResult } from '../../server/auth/forms';
import { getQuantityRules, notionalToQuantity, type QuantityMode } from '../../lib/simulation-order-ticket';
import { getSimulationQuantityRules, isStepAligned } from '../../lib/simulation-number-rules';
import { buildNoOpenPositionReason, snapToStep } from '../../lib/simulation-form-helpers';
import type { PreTradeRiskGateViewModel } from '../../lib/pre-trade-risk-view';
import { SimulationRiskGateSummary } from './simulation-risk-gate-summary';
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
        className={`button ${active ? 'button--primary' : 'button--secondary'} simulation-form__button simulation-form__button--inline`}
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
  sourceContext?: string;
  /** Server-computed pre-trade risk gate; when a check fails, Submit is disabled. */
  riskGate?: PreTradeRiskGateViewModel;
  uiText?: Partial<{
    quantityMode: string;
    notionalMode: string;
    notionalAmount: string;
    quantityRequired: string;
    minimumShare: string;
    minimumUnit: string;
    minimumQuantityTemplate: string;
    wholeSharesOnly: string;
    quantityStepMismatchTemplate: string;
    minimumNotional: string;
    noOpenPositionToSellTemplate: string;
    closePosition: string;
    quoteReady: string;
    fetchingSimulationQuote: string;
    quoteNotReady: string;
    retryQuote: string;
    retryingInSeconds: string;
    marketClosedUsingLatestQuote: string;
    cachedQuoteSimulationWarning: string;
    delayedQuoteSimulationWarning: string;
    quoteFreshnessLimited: string;
    simulationQuoteUnavailable: string;
  }>;
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
  minQuantity = 1,
  maxQuantity = null,
  currentHeldQuantity = null,
  currentPrice = null,
  showQuantityInput = false,
  quantityLabel = 'Quantity',
  disabled = false,
  disabledReason,
  sourceContext,
  riskGate,
  uiText,
}: SimulatedOrderFormProps) {
  const [state, formAction] = useActionState(createSimulatedOrderAction, emptyFormState);
  const formRef = useRef<HTMLFormElement | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const rules = useMemo(() => getQuantityRules({ assetClass, symbol, price: currentPrice }), [assetClass, currentPrice, symbol]);
  const numberRules = useMemo(
    () => getSimulationQuantityRules({ assetClass, symbol, price: currentPrice }),
    [assetClass, currentPrice, symbol],
  );
  const effectiveMinQuantity = Math.max(minQuantity, numberRules.minQuantity);
  const [quantityValue, setQuantityValue] = useState(() => formatQuantityInput(quantity, numberRules.defaultQuantity, effectiveMinQuantity));
  const [mode, setMode] = useState<QuantityMode>('quantity');
  const [notionalValue, setNotionalValue] = useState('');
  const [clientError, setClientError] = useState<string | null>(null);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);
  const quantityId = `${assetId}-${side}-quantity`;
  const quantityError = state.fieldErrors.quantity;
  const messageId = `${assetId}-${side}-message`;

  useEffect(() => {
    if (state.status === 'success') {
      setIdempotencyKey(crypto.randomUUID());
      if (showQuantityInput) {
        setQuantityValue(formatQuantityInput(quantity, numberRules.defaultQuantity, effectiveMinQuantity));
        setNotionalValue('');
        setClientError(null);
      }
    }
  }, [effectiveMinQuantity, numberRules.defaultQuantity, quantity, showQuantityInput, state.status]);

  useEffect(() => {
    if (state.errorCode !== 'QUOTE_NOT_READY') {
      setRetryCountdown(null);
      return;
    }
    setRetryCountdown(5);
  }, [state.errorCode]);

  useEffect(() => {
    if (retryCountdown === null) return;
    if (retryCountdown <= 0) {
      formRef.current?.requestSubmit();
      return;
    }
    const timer = setTimeout(() => setRetryCountdown((value) => (value === null ? null : value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [retryCountdown]);

  const sanitizedQuantity = useMemo(() => {
    const parsed = Number(quantityValue);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return null;
    }
    return parsed;
  }, [quantityValue]);
  const sanitizedNotional = useMemo(() => {
    const parsed = Number(notionalValue);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [notionalValue]);

  useEffect(() => {
    if (mode === 'notional' && sanitizedNotional !== null && typeof currentPrice === 'number' && currentPrice > 0) {
      const calculated = notionalToQuantity(sanitizedNotional, currentPrice, numberRules.stepQuantity);
      if (calculated !== null && calculated > 0) {
        setQuantityValue(formatQuantityInput(calculated, numberRules.defaultQuantity, effectiveMinQuantity));
      }
    }
  }, [currentPrice, effectiveMinQuantity, mode, numberRules.defaultQuantity, numberRules.stepQuantity, sanitizedNotional]);

  const hasNoPositionToSell = side === 'sell' && (currentHeldQuantity ?? 0) <= 0;

  const effectiveDisabledReason = disabled
    ? disabledReason
    : hasNoPositionToSell
      ? formatTemplate(uiText?.noOpenPositionToSellTemplate, { symbol }) ?? buildNoOpenPositionReason(symbol)
      : undefined;

  const estimatedGross =
    sanitizedQuantity !== null && typeof currentPrice === 'number' && Number.isFinite(currentPrice) && currentPrice > 0
      ? sanitizedQuantity * currentPrice
      : null;

  const fillDetail = state.status === 'success' && state.orderResult ? buildFillDetail(state.orderResult) : null;
  const describedByIds = [quantityError || clientError ? `${quantityId}-error` : null, `${quantityId}-hint`].filter(Boolean).join(' ') || undefined;
  const step = numberRules.stepQuantity;

  function validateClientQuantity() {
    const parsed = Number(quantityValue);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return uiText?.quantityRequired ?? 'Quantity is required.';
    }
    if (parsed < effectiveMinQuantity) {
      if (assetClass === 'stock') return uiText?.minimumShare ?? 'Minimum 1 share.';
      if (assetClass === 'etf') return uiText?.minimumUnit ?? 'Minimum 1 unit.';
      return formatTemplate(uiText?.minimumQuantityTemplate, { value: String(effectiveMinQuantity) }) ?? `Minimum quantity: ${effectiveMinQuantity}`;
    }
    if (!isStepAligned(parsed, effectiveMinQuantity, numberRules.stepQuantity)) {
      if ((assetClass === 'stock' || assetClass === 'etf') && numberRules.stepQuantity === 1) {
        return uiText?.wholeSharesOnly ?? 'Enter a whole number of shares.';
      }
      return formatTemplate(uiText?.quantityStepMismatchTemplate, { step: String(numberRules.stepQuantity) }) ?? `Use increments of ${numberRules.stepQuantity}.`;
    }
    if (mode === 'notional' && sanitizedNotional !== null && sanitizedNotional < numberRules.minNotional) {
      return uiText?.minimumNotional ?? 'Minimum notional requirement not met.';
    }
    return null;
  }

  function onFormSubmit(event: FormEvent<HTMLFormElement>) {
    const error = validateClientQuantity();
    setClientError(error);
    if (error) {
      event.preventDefault();
      return;
    }
  }

  return (
    <form ref={formRef} action={formAction} className="simulation-form simulation-form--ticket" noValidate onSubmit={onFormSubmit}>
      <input type="hidden" name="assetId" value={assetId} />
      <input type="hidden" name="symbol" value={symbol} />
      <input type="hidden" name="assetClass" value={assetClass} />
      <input type="hidden" name="side" value={side} />
      <input type="hidden" name="strategyLaneId" value={strategyLaneId} />
      <input type="hidden" name="decisionSource" value="manual_ui" />
      {sourceContext ? <input type="hidden" name="sourceContext" value={sourceContext} /> : null}
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      {simulationSessionId ? <input type="hidden" name="simulationSessionId" value={simulationSessionId} /> : null}

      {showQuantityInput ? (
        <label className="form-field" htmlFor={quantityId}>
          <span>{quantityLabel}</span>
          <input
            id={quantityId}
            name="quantity"
            type="number"
            min={String(effectiveMinQuantity)}
            required
            step={String(numberRules.stepQuantity)}
            max={typeof maxQuantity === 'number' && Number.isFinite(maxQuantity) ? String(maxQuantity) : undefined}
            value={quantityValue}
            inputMode={numberRules.stepQuantity >= 1 ? 'numeric' : 'decimal'}
            onChange={(event) => {
              setQuantityValue(event.currentTarget.value);
              if (clientError) {
                setClientError(null);
              }
            }}
            aria-invalid={quantityError || clientError ? 'true' : 'false'}
            aria-describedby={describedByIds}
          />
          <div className="simulation-form__mode-toggle">
            <button type="button" className={`button button--secondary ${mode === 'quantity' ? 'button--active' : ''}`} onClick={() => setMode('quantity')}>{uiText?.quantityMode ?? 'Quantity'}</button>
            <button type="button" className={`button button--secondary ${mode === 'notional' ? 'button--active' : ''}`} onClick={() => setMode('notional')}>{uiText?.notionalMode ?? 'Notional'}</button>
          </div>
          {mode === 'quantity' ? (
            <div className="simulation-form__chips">
              {(assetClass === 'stock' || assetClass === 'etf' ? [1, 5, 10, 25] : [0.0001, 0.001, 0.01, 0.1]).map((chip) => (
                <button key={String(chip)} type="button" className="button button--secondary" onClick={() => setQuantityValue(String(chip))}>
                  {chip}
                </button>
              ))}
              {side === 'sell' && typeof currentHeldQuantity === 'number' && currentHeldQuantity > 0 ? (
                <>
                  <button type="button" className="button button--secondary" onClick={() => setQuantityValue(String(snapToStep(currentHeldQuantity * 0.25, effectiveMinQuantity, step)))}>25%</button>
                  <button type="button" className="button button--secondary" onClick={() => setQuantityValue(String(snapToStep(currentHeldQuantity * 0.5, effectiveMinQuantity, step)))}>50%</button>
                  <button type="button" className="button button--secondary" onClick={() => setQuantityValue(String(snapToStep(currentHeldQuantity, effectiveMinQuantity, step)))}>100%</button>
                  <button type="button" className="button button--secondary" onClick={() => setQuantityValue(String(snapToStep(currentHeldQuantity, effectiveMinQuantity, step)))}>{uiText?.closePosition ?? 'Close position'}</button>
                </>
              ) : null}
            </div>
          ) : null}
          {mode === 'notional' ? (
            <label className="form-field" htmlFor={`${quantityId}-notional`}>
              <span>{uiText?.notionalAmount ?? 'Notional amount'}</span>
              <input
                id={`${quantityId}-notional`}
                type="number"
                min={String(numberRules.minNotional)}
                step={String(numberRules.stepNotional)}
                value={notionalValue}
                onChange={(event) => setNotionalValue(event.currentTarget.value)}
              />
              <div className="simulation-form__chips">
                {[25, 50, 100, 250, 500].map((chip) => (
                  <button key={chip} type="button" className="button button--secondary" onClick={() => setNotionalValue(String(chip))}>
                    ${chip}
                  </button>
                ))}
              </div>
            </label>
          ) : null}
          <span id={`${quantityId}-hint`} className="simulation-form__meta">
            {buildQuantityHint({
              side,
              symbol,
              currentHeldQuantity,
              currentPrice,
              sanitizedQuantity,
              estimatedGross,
              maxQuantity,
              rulesHint: rules.hint,
            })}
          </span>
          {quantityError || clientError ? (
            <span id={`${quantityId}-error`} className="simulation-form__meta simulation-form__meta--error">
              {clientError ?? quantityError}
            </span>
          ) : null}
        </label>
      ) : (
        <input type="hidden" name="quantity" value={String(quantity)} />
      )}

      {riskGate ? <SimulationRiskGateSummary gate={riskGate} /> : null}

      <ActionButton
        className="button button--secondary simulation-form__button"
        label={label}
        disabled={disabled || hasNoPositionToSell || (riskGate ? !riskGate.canSubmit : false)}
      />

      <SimulationFormFeedback
        messageId={messageId}
        effectiveDisabledReason={effectiveDisabledReason}
        fillDetail={fillDetail}
        state={state}
        retryCountdown={retryCountdown}
        retryLabel={uiText?.retryQuote ?? 'Retry quote'}
        retryingLabel={uiText?.retryingInSeconds ?? 'Retrying in {{seconds}}s'}
        notReadyLabel={uiText?.quoteNotReady ?? 'Simulation quote is not ready yet.'}
        onRetry={() => {
          setRetryCountdown(null);
          formRef.current?.requestSubmit();
        }}
      />
    </form>
  );
}

function SimulationFormFeedback({
  messageId,
  effectiveDisabledReason,
  fillDetail,
  state,
  retryCountdown,
  retryLabel,
  retryingLabel,
  notReadyLabel,
  onRetry,
}: {
  messageId: string;
  effectiveDisabledReason: string | undefined;
  fillDetail: string | null;
  state: FormState;
  retryCountdown: number | null;
  retryLabel: string;
  retryingLabel: string;
  notReadyLabel: string;
  onRetry: () => void;
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
      {state.errorCode === 'QUOTE_NOT_READY' ? (
        <div className="simulation-form__meta simulation-form__meta--warning" role="status" aria-live="polite">
          <p>{notReadyLabel}</p>
          {retryCountdown !== null && retryCountdown > 0 ? (
            <p>{retryingLabel.replace('{{seconds}}', String(retryCountdown))}</p>
          ) : null}
          <button type="button" className="button button--secondary simulation-form__button simulation-form__button--inline" onClick={onRetry}>
            {retryLabel}
          </button>
        </div>
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

function formatQuantityInput(value: number, defaultQuantity: number, minQuantity: number) {
  if (!Number.isFinite(value)) {
    return String(Math.max(defaultQuantity, minQuantity));
  }
  return String(Math.max(value, minQuantity));
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
  rulesHint: string;
}) {
  const fragments: string[] = [];
  fragments.push(input.rulesHint);

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

function formatTemplate(template: string | undefined, values: Record<string, string>): string | null {
  if (!template) {
    return null;
  }

  let output = template;
  for (const [key, value] of Object.entries(values)) {
    output = output.replaceAll(`{{${key}}}`, value);
  }
  return output;
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
