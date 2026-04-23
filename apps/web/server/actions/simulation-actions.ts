'use server';

import { resetSimulationAccount, getUserWatchlist, toggleWatchlistItem } from '@repo/db';
import type { SimulationAssetClass, SimulationLaneId } from '@repo/api-contracts';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getMessages } from '../../lib/i18n/messages';
import { requireCurrentSession } from '../auth/session';
import { getRequestLocale } from '../i18n/locale';
import { errorFormState, formStateFromZodError, successFormState, type FormState } from '../auth/forms';
import { executeSimulationOrderForCurrentUser } from '../services/simulation-service';
import {
  assertSimulationSessionAllowsTradingForCurrentUser,
  resolveLaneMode,
  startSimulationSessionForCurrentUser,
} from '../services/simulation-workstation-service';

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

  revalidatePath('/dashboard');
  revalidatePath('/invest');
  revalidatePath('/invest/simulation');
  revalidatePath('/stocks');
  revalidatePath('/invest/etfs');
  revalidatePath('/invest/crypto');
  if (parsed.data.assetClass === 'stock') {
    revalidatePath(`/stocks/${parsed.data.symbol}`);
  }

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
    simulationSessionId: formData.get('simulationSessionId') ? String(formData.get('simulationSessionId')) : undefined,
    idempotencyKey: formData.get('idempotencyKey') ? String(formData.get('idempotencyKey')) : undefined,
  });

  if (!parsed.success) {
    return formStateFromZodError(parsed.error);
  }

  let order;
  try {
    const simulationSession = await assertSimulationSessionAllowsTradingForCurrentUser(parsed.data.simulationSessionId);

    if (simulationSession.laneId !== parsed.data.strategyLaneId) {
      return errorFormState(`This order was prepared for ${parsed.data.strategyLaneId}, but the active simulation lane is ${simulationSession.laneId}. Refresh the workstation and submit again.`);
    }

    if (!laneSupportsAssetClass(simulationSession.laneId, parsed.data.assetClass)) {
      return errorFormState(buildUnsupportedLaneMessage(simulationSession.laneId, parsed.data.assetClass));
    }

    if (simulationSession.assetScope !== 'multi-asset' && simulationSession.assetScope !== parsed.data.assetClass) {
      return errorFormState(`The active session is scoped to ${simulationSession.assetScope.toUpperCase()} assets. Switch to a matching or multi-asset session before placing this order.`);
    }

    order = await executeSimulationOrderForCurrentUser({
      assetId: parsed.data.assetId,
      symbol: parsed.data.symbol,
      assetClass: parsed.data.assetClass as SimulationAssetClass,
      side: parsed.data.side,
      quantity: parsed.data.quantity,
      notes: `session=${simulationSession.id};lane=${parsed.data.strategyLaneId};source=${parsed.data.decisionSource}`,
      idempotencyKey: parsed.data.idempotencyKey,
    });
  } catch (error) {
    return errorFormState(error instanceof Error ? error.message : messages.simulation.orderRecorded);
  }

  revalidatePath('/dashboard');
  revalidatePath('/invest');
  revalidatePath('/invest/simulation');
  revalidatePath('/invest/portfolio');
  revalidatePath('/invest/orders');
  revalidatePath('/stocks');
  revalidatePath('/invest/etfs');
  revalidatePath('/invest/crypto');
  if (parsed.data.assetClass === 'stock') {
    revalidatePath(`/stocks/${parsed.data.symbol}`);
  }

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

export async function resetSimulationAccountAction(): Promise<FormState> {
  const auth = await requireCurrentSession('/invest/simulation');
  const locale = await getRequestLocale();
  const messages = getMessages(locale);

  try {
    await resetSimulationAccount(auth.user.id);
  } catch (error) {
    return errorFormState(error instanceof Error ? error.message : messages.simulation.resetConfirmation);
  }

  revalidatePath('/dashboard');
  revalidatePath('/invest');
  revalidatePath('/invest/simulation');

  return successFormState(messages.simulation.resetConfirmation);
}

export async function getWatchlistStateForUser(userId: string) {
  return getUserWatchlist(userId);
}
