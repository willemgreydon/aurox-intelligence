'use server';

import {
  clearSimulationDecisionHistory,
  closeAllSimulationPositions,
  getUserWatchlist,
  resetSimulationAccount,
  resetSimulationCashBalance,
  toggleWatchlistItem,
} from '@repo/db';
import type { SimulationAssetClass, SimulationLaneId, SimulationOrderErrorCode } from '@repo/api-contracts';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getMessages } from '../../lib/i18n/messages';
import { normalizeSimulationError } from '../../lib/simulation-error-normalizer';
import { requireCurrentSession } from '../auth/session';
import { getRequestLocale } from '../i18n/locale';
import { errorFormState, formStateFromZodError, successFormState, type FormState } from '../auth/forms';
import { executeSimulationOrderForCurrentUser } from '../services/simulation-service';
import {
  revalidateForSimulationOrder,
  revalidateForSimulationReset,
  revalidateForWatchlistChange,
} from '../lib/revalidation-targets';
import {
  assertSimulationSessionAllowsTradingForCurrentUser,
  resolveLaneMode,
  startSimulationSessionForCurrentUser,
} from '../services/simulation-workstation-service';
import { getMacroIntelligenceViewModel } from '../services/macro-intelligence-service';

const watchlistInputSchema = z.object({
  assetId: z.string().min(1),
  symbol: z.string().min(1),
  assetClass: z.enum(['stock', 'etf', 'crypto', 'fx']),
});

const simulationOrderInputSchema = z.object({
  assetId: z.string().min(1),
  symbol: z.string().min(1),
  assetClass: z.enum(['stock', 'etf', 'crypto']),
  side: z.enum(['buy', 'sell']),
  quantity: z.coerce.number().positive().max(1_000_000),
  strategyLaneId: z
    .enum([
      'manual_stock_lane',
      'manual_multi_asset_lane',
      'ai_copilot_lane',
      'signal_follow_lane',
      'agent_sandbox_lane',
    ])
    .default('manual_stock_lane'),
  decisionSource: z.enum(['manual_ui', 'ai_assisted', 'automation']).default('manual_ui'),
  sourceContext: z.string().max(64).optional(),
  simulationSessionId: z.string().uuid().optional(),
  idempotencyKey: z.string().max(64).optional(),
});

const startSimulationSessionInputSchema = z.object({
  laneId: z.enum([
    'manual_stock_lane',
    'manual_multi_asset_lane',
    'ai_copilot_lane',
    'signal_follow_lane',
    'agent_sandbox_lane',
  ]),
  assetScope: z.enum(['stock', 'etf', 'crypto', 'multi-asset']),
  maxCapitalUsd: z.coerce.number().nonnegative().max(1_000_000_000),
  microAllocationPercent: z.coerce.number().min(0).max(100),
  returnTo: z.enum(['/invest', '/invest/simulation']).default('/invest/simulation'),
});

type MappedOrderError = { message: string; code: SimulationOrderErrorCode };

function mapSimulationOrderError(raw: string, symbol: string): MappedOrderError {
  if (raw.includes('Insufficient fictive cash') || raw.includes('Insufficient available simulation cash')) {
    return { code: 'INSUFFICIENT_CASH', message: 'Insufficient simulation cash balance for this order.' };
  }
  if (raw.includes('Insufficient position quantity') || raw.includes('Sell quantity exceeds')) {
    return { code: 'INSUFFICIENT_POSITION', message: `No open ${symbol} position is available to sell, or position size is too small.` };
  }
  if (raw.includes(`No open ${symbol} position`) || raw.includes('No open') && raw.includes('position is available to sell')) {
    return { code: 'INSUFFICIENT_POSITION', message: `No open ${symbol} position is available to sell.` };
  }
  if (raw.includes('Order quantity must be greater than zero')) {
    return { code: 'ZERO_QUANTITY', message: 'Order quantity must be greater than zero.' };
  }
  if (raw.includes('Position metadata mismatch') || raw.includes('Asset metadata mismatch') || raw.includes('Asset class mismatch')) {
    return { code: 'POSITION_STATE_CHANGED', message: 'Position state has changed. Please refresh the page and try again.' };
  }
  if (raw.includes('No active simulation session')) {
    return { code: 'NO_ACTIVE_SESSION', message: 'No active simulation session. Start or resume a session before trading.' };
  }
  if (raw.includes('Simulation database is currently unavailable')) {
    return { code: 'INTERNAL_ERROR', message: 'Simulation database is currently unavailable.' };
  }
  if (raw.includes('Simulation quote is not ready yet')) {
    return { code: 'QUOTE_NOT_READY', message: 'Simulation quote is not ready yet.' };
  }
  if (raw.includes('cap exceeded')) {
    return { code: 'VALIDATION_ERROR', message: raw };
  }
  if (raw.includes('price') || raw.includes('quote') || raw.includes('market data')) {
    return { code: 'MARKET_DATA_UNAVAILABLE', message: 'Market price data is temporarily unavailable. Please try again shortly.' };
  }
  if (
    raw.includes('inconsistent types') ||
    raw.includes('postgres') ||
    raw.includes('syntax error') ||
    raw.includes('violates') ||
    raw.includes('duplicate key') ||
    raw.includes('ERROR:') ||
    raw.includes('SQLSTATE')
  ) {
    return { code: 'INTERNAL_ERROR', message: 'An internal error occurred while processing the simulation order. Please try again.' };
  }

  // Final safety gate: use the normalizer to avoid leaking raw provider errors (e.g. OpenAI 429)
  const normalized = normalizeSimulationError(new Error(raw));
  return {
    code: 'INTERNAL_ERROR',
    message: normalized.userMessage,
  };
}

function laneSupportsAssetClass(laneId: SimulationLaneId, assetClass: SimulationAssetClass) {
  if (laneId === 'manual_stock_lane') {
    return assetClass === 'stock';
  }

  return assetClass === 'stock' || assetClass === 'etf' || assetClass === 'crypto';
}

function buildUnsupportedLaneMessage(laneId: SimulationLaneId, assetClass: SimulationAssetClass) {
  if (laneId === 'manual_stock_lane') {
    return `The manual stock lane only supports stock orders. Switch to the manual multi-asset lane to simulate ${assetClass.toUpperCase()} orders.`;
  }

  return `${assetClass.toUpperCase()} is not enabled for the selected simulation lane.`;
}

function resolveEffectiveStrategyLaneId(input: {
  requestedLaneId: SimulationLaneId;
  activeLaneId: SimulationLaneId;
  assetClass: SimulationAssetClass;
}) {
  if (input.requestedLaneId === input.activeLaneId) {
    return input.activeLaneId;
  }

  if (laneSupportsAssetClass(input.activeLaneId, input.assetClass)) {
    return input.activeLaneId;
  }

  return input.requestedLaneId;
}

export async function startSimulationSessionAction(formData: FormData): Promise<void> {
  await requireCurrentSession('/invest');

  const parsed = startSimulationSessionInputSchema.safeParse({
    laneId: String(formData.get('laneId') ?? ''),
    assetScope: String(formData.get('assetScope') ?? 'stock'),
    maxCapitalUsd: formData.get('maxCapitalUsd') ?? 0,
    microAllocationPercent: formData.get('microAllocationPercent') ?? 0,
    returnTo: String(formData.get('returnTo') ?? '/invest/simulation'),
  });

  if (!parsed.success) {
    redirect('/invest/simulation');
  }

  const laneMode = await resolveLaneMode(parsed.data.laneId);
  const session = await startSimulationSessionForCurrentUser({
    laneId: parsed.data.laneId,
    laneMode,
    assetScope: parsed.data.assetScope,
    maxCapitalUsd: parsed.data.maxCapitalUsd,
    microAllocationPercent: parsed.data.microAllocationPercent,
  });

  revalidatePath('/invest');
  revalidatePath('/invest/simulation');
  revalidatePath('/invest/portfolio');
  revalidatePath('/invest/orders');
  revalidatePath('/account/activity');

  const basePath = parsed.data.returnTo;
  redirect(`${basePath}?session=${session.id}&lane=${session.laneId}`);
}

export async function toggleWatchlistAction(_: FormState, formData: FormData): Promise<FormState> {
  const auth = await requireCurrentSession('/dashboard');
  const locale = await getRequestLocale();
  const messages = getMessages(locale);

  const parsed = watchlistInputSchema.safeParse({
    assetId: String(formData.get('assetId') ?? ''),
    symbol: String(formData.get('symbol') ?? ''),
    assetClass: String(formData.get('assetClass') ?? 'stock'),
  });

  if (!parsed.success) {
    return formStateFromZodError(parsed.error);
  }

  const watchlist = await toggleWatchlistItem(auth.user.id, {
    assetId: parsed.data.assetId,
    symbol: parsed.data.symbol,
    assetClass: parsed.data.assetClass,
    addedAt: new Date().toISOString(),
  });

  revalidateForWatchlistChange({ symbol: parsed.data.symbol, assetClass: parsed.data.assetClass });

  const exists = watchlist.some((item) => item.assetId === parsed.data.assetId);
  return successFormState(exists ? messages.dashboard.addToWatchlist : messages.dashboard.removeFromWatchlist);
}

export async function createSimulatedOrderAction(_: FormState, formData: FormData): Promise<FormState> {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);

  const parsed = simulationOrderInputSchema.safeParse({
    assetId: String(formData.get('assetId') ?? ''),
    symbol: String(formData.get('symbol') ?? ''),
    assetClass: String(formData.get('assetClass') ?? 'stock'),
    side: String(formData.get('side') ?? 'buy'),
    quantity: formData.get('quantity') ?? 1,
    strategyLaneId: String(formData.get('strategyLaneId') ?? 'manual_stock_lane'),
    decisionSource: String(formData.get('decisionSource') ?? 'manual_ui'),
    sourceContext: formData.get('sourceContext') ? String(formData.get('sourceContext')) : undefined,
    simulationSessionId: formData.get('simulationSessionId') ? String(formData.get('simulationSessionId')) : undefined,
    idempotencyKey: formData.get('idempotencyKey') ? String(formData.get('idempotencyKey')) : undefined,
  });

  if (!parsed.success) {
    return formStateFromZodError(parsed.error);
  }

  if (parsed.data.side === 'sell' && parsed.data.quantity <= 0) {
    return errorFormState(
      `No open ${parsed.data.symbol} position is available to sell.`,
      {},
      'NO_POSITION_TO_SELL',
    );
  }

  let order;
  try {
    const simulationSession = await assertSimulationSessionAllowsTradingForCurrentUser(parsed.data.simulationSessionId);
    const macroContext = await getMacroIntelligenceViewModel().catch(() => null);

    const effectiveStrategyLaneId = resolveEffectiveStrategyLaneId({
      requestedLaneId: parsed.data.strategyLaneId,
      activeLaneId: simulationSession.laneId,
      assetClass: parsed.data.assetClass,
    });

    if (!laneSupportsAssetClass(effectiveStrategyLaneId, parsed.data.assetClass)) {
      return errorFormState(buildUnsupportedLaneMessage(simulationSession.laneId, parsed.data.assetClass), {}, 'UNSUPPORTED_ASSET_CLASS');
    }

    if (simulationSession.assetScope !== 'multi-asset' && simulationSession.assetScope !== parsed.data.assetClass) {
      return errorFormState(
        `The active session is scoped to ${simulationSession.assetScope.toUpperCase()} assets. Switch to a matching or multi-asset session before placing this order.`,
        {},
        'SCOPE_MISMATCH',
      );
    }

    order = await executeSimulationOrderForCurrentUser({
      assetId: parsed.data.assetId,
      symbol: parsed.data.symbol,
      assetClass: parsed.data.assetClass as SimulationAssetClass,
      side: parsed.data.side,
      quantity: parsed.data.quantity,
      strategyLaneId: effectiveStrategyLaneId,
      sessionAssetScope: simulationSession.assetScope,
      notes: `session=${simulationSession.id};lane=${effectiveStrategyLaneId};source=${parsed.data.sourceContext ?? parsed.data.decisionSource};simulation_only=true`,
      macroRegimeSnapshot: macroContext
        ? `${macroContext.regime.overallMacroScore.toFixed(2)}|${macroContext.regime.confidence.toFixed(2)}|${macroContext.regime.riskRegime.score.toFixed(2)}`
        : null,
      providerSnapshot: macroContext
        ? macroContext.providerStatus
          .map((provider) => `${provider.provider}:${provider.freshness}`)
          .join(',')
        : null,
      freshnessState: preparedFreshnessFromSource(parsed.data.sourceContext),
      idempotencyKey: parsed.data.idempotencyKey,
    });
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error);
    const { message, code } = mapSimulationOrderError(raw, parsed.data.symbol);
    if (code === 'QUOTE_NOT_READY') {
      return errorFormState('Simulation quote is not ready yet. Retry in a few seconds.', {}, 'QUOTE_NOT_READY');
    }
    return errorFormState(message, {}, code);
  }

  revalidateForSimulationOrder({ symbol: parsed.data.symbol, assetClass: parsed.data.assetClass });

  return successFormState(messages.simulation.orderRecorded, {
    orderId: order.id,
    symbol: order.symbol,
    side: order.side,
    quantity: order.quantity,
    executionPrice: order.executedPrice,
    grossAmount: order.grossAmount,
    realizedPnl: order.realizedPnl,
  });
}

function preparedFreshnessFromSource(sourceContext: string | undefined): string {
  if (!sourceContext) return 'unknown';
  if (sourceContext.includes('crypto')) return 'live_or_partial';
  if (sourceContext.includes('etf') || sourceContext.includes('stock')) return 'partial_or_delayed';
  return 'unknown';
}

export async function resetSimulationAccountAction(): Promise<FormState> {
  const auth = await requireCurrentSession('/invest/simulation');
  const locale = await getRequestLocale();
  const messages = getMessages(locale);

  try {
    await resetSimulationAccount(auth.user.id);
  } catch (error) {
    return errorFormState(error instanceof Error ? error.message : messages.simulation.resetConfirmation);
  }

  revalidateForSimulationReset();

  return successFormState(messages.simulation.resetConfirmation);
}

const simulationControlInputSchema = z.object({
  control: z.enum(['reset_all', 'reset_cash_only', 'close_all_positions', 'clear_decision_history']),
  confirmText: z.string().min(1),
  expectedConfirmText: z.string().min(1),
});

export async function runSimulationControlAction(_: FormState, formData: FormData): Promise<FormState> {
  const auth = await requireCurrentSession('/invest/simulation');
  const parsed = simulationControlInputSchema.safeParse({
    control: String(formData.get('control') ?? ''),
    confirmText: String(formData.get('confirmText') ?? ''),
    expectedConfirmText: String(formData.get('expectedConfirmText') ?? ''),
  });

  if (!parsed.success) {
    return formStateFromZodError(parsed.error);
  }

  if (parsed.data.confirmText.trim() !== parsed.data.expectedConfirmText.trim()) {
    return errorFormState('Confirmation text did not match. Action aborted.');
  }

  try {
    if (parsed.data.control === 'reset_all') {
      await resetSimulationAccount(auth.user.id);
    } else if (parsed.data.control === 'reset_cash_only') {
      await resetSimulationCashBalance(auth.user.id);
    } else if (parsed.data.control === 'close_all_positions') {
      await closeAllSimulationPositions(auth.user.id);
    } else {
      await clearSimulationDecisionHistory(auth.user.id);
    }
  } catch (error) {
    return errorFormState(error instanceof Error ? error.message : 'Simulation control action failed.');
  }

  revalidateForSimulationReset();
  return successFormState('Simulation control action completed.');
}

export async function getWatchlistStateForUser(userId: string) {
  return getUserWatchlist(userId);
}
