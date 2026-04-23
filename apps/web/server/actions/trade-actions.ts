'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireCurrentSession } from '../auth/session';
import { getBrokerModeConfig } from '../config/broker-mode-registry';
import { executeTradeForUser } from '../services/trade-execution-service';
import type { TradeIntentPayload } from '@repo/agents';

const tradeIntentSchema = z
  .object({
    symbol: z.string().min(1).max(10),
    side: z.enum(['buy', 'sell']),
    assetKind: z.enum(['stock', 'etf', 'crypto']),
    sizingMode: z.enum(['notional', 'quantity', 'risk_budget']),
    notional: z.coerce.number().positive().optional(),
    quantity: z.coerce.number().positive().optional(),
    modeId: z.string().min(1),
    thesis: z.string().min(1).max(500),
    source: z.enum(['manual', 'ai_suggested', 'ai_autonomous']),
    confidence: z.coerce.number().min(0).max(1).optional(),
    strategyTag: z.string().trim().max(80).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.sizingMode === 'quantity' && value.quantity === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['quantity'],
        message: 'Quantity is required when sizingMode is quantity.',
      });
    }

    if (
      (value.sizingMode === 'notional' || value.sizingMode === 'risk_budget') &&
      value.notional === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['notional'],
        message: 'Notional is required when sizingMode is notional or risk_budget.',
      });
    }
  });

export async function submitTradeAction(formData: FormData): Promise<void> {
  const auth = await requireCurrentSession('/login');

  const parsed = tradeIntentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect('/invest/simulation?error=invalid_trade_intent');
  }

  const {
    modeId,
    notional,
    quantity,
    strategyTag,
    ...fields
  } = parsed.data;

  const config = getBrokerModeConfig(modeId);
  if (config === null) {
    redirect('/invest/simulation?error=unknown_mode');
  }

  const intent: TradeIntentPayload = {
    accountId: auth.user.id,
    modeId,
    symbol: fields.symbol,
    assetKind: fields.assetKind,
    side: fields.side,
    sizingMode: fields.sizingMode,
    source: fields.source,
    thesis: fields.thesis,
    ...(fields.confidence !== undefined ? { confidence: fields.confidence } : {}),
    ...(strategyTag ? { strategyTag } : {}),
    ...(notional !== undefined ? { notional } : {}),
    ...(quantity !== undefined ? { quantity } : {}),
  };

  const result = await executeTradeForUser(intent, config, auth.user.id);

  if (!result.ok) {
    redirect(`/invest/simulation?error=${encodeURIComponent(result.code)}`);
  }

  revalidatePath('/invest/overview');
  revalidatePath('/invest/simulation');
  redirect('/invest/simulation?success=1');
}