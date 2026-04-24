'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireCurrentSession } from '../auth/session';
import {
  runAiSimulationAgentForUser,
  confirmAiSimulationTrade,
  checkAiSimulationAgentAvailability,
} from '../services/ai-simulation-agent-service';
import type { AiSimulationAgentResult, AiSimulationProposedOrder } from '@repo/api-contracts';
import { aiSimulationProposedOrderSchema } from '@repo/api-contracts';

const runAgentInputSchema = z.object({
  autonomyMode: z.enum(['suggest_only', 'human_confirmed', 'autonomous_simulation']),
  modeId: z.string().min(1),
  maxNotionalPerTrade: z.coerce.number().positive().max(100_000),
  maxDailyNotional: z.coerce.number().positive().max(500_000),
  maxOpenExposure: z.coerce.number().positive().max(1_000_000),
});

export type RunAiSimulationAgentActionResult =
  | { ok: true; result: AiSimulationAgentResult }
  | { ok: false; error: string };

export async function runAiSimulationAgentAction(
  formData: FormData,
): Promise<RunAiSimulationAgentActionResult> {
  const auth = await requireCurrentSession('/login');

  const availability = checkAiSimulationAgentAvailability();
  if (!availability.available) {
    return { ok: false, error: availability.reason };
  }

  const parsed = runAgentInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: 'Invalid agent configuration input.' };
  }

  const result = await runAiSimulationAgentForUser({
    userId: auth.user.id,
    autonomyMode: parsed.data.autonomyMode,
    modeId: parsed.data.modeId,
    maxNotionalPerTrade: parsed.data.maxNotionalPerTrade,
    maxDailyNotional: parsed.data.maxDailyNotional,
    maxOpenExposure: parsed.data.maxOpenExposure,
  });

  return { ok: true, result };
}

const confirmTradeInputSchema = z.object({
  proposedOrderJson: z.string().min(1),
  reasoning: z.string().min(1).max(500),
  confidence: z.coerce.number().min(0).max(1),
});

export type ConfirmAiSimulationTradeActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function confirmAiSimulationTradeAction(
  formData: FormData,
): Promise<ConfirmAiSimulationTradeActionResult> {
  const auth = await requireCurrentSession('/login');

  const parsed = confirmTradeInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: 'Invalid confirmation input.' };
  }

  let proposedOrder: AiSimulationProposedOrder;
  try {
    const raw: unknown = JSON.parse(parsed.data.proposedOrderJson);
    const orderParsed = aiSimulationProposedOrderSchema.safeParse(raw);
    if (!orderParsed.success) {
      return { ok: false, error: 'Invalid proposed order schema.' };
    }

    proposedOrder = orderParsed.data;
  } catch {
    return { ok: false, error: 'Failed to parse proposed order.' };
  }

  const result = await confirmAiSimulationTrade(
    auth.user.id,
    proposedOrder,
    parsed.data.reasoning,
    parsed.data.confidence,
  );

  if (result.ok) {
    revalidatePath('/invest/simulation');
    revalidatePath('/invest/overview');
    return { ok: true };
  }

  return { ok: false, error: result.error ?? 'Confirmation failed.' };
}
