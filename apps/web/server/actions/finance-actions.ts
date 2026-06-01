'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  claudeFinanceActivityInputSchema,
  simulatedBrokerActivitySchema,
} from '@repo/api-contracts';
import { requireCurrentSession } from '../auth/session';
import {
  generateSimulatedBrokerActivityForCurrentUser,
  saveSimulatedBrokerActivityForCurrentUser,
} from '../services/finance-cockpit-service';
import type { FinanceActivityState } from './finance-actions-state';

/**
 * Claude Finance server actions.
 *
 * Canonical write path: UI → action → Zod validation → service → (audit write) →
 * revalidate. Neither action executes a trade. `generate` is a pure preview;
 * `save` writes one append-only audit row. Live execution is impossible here.
 *
 * NOTE: the state TYPE + the `emptyFinanceActivityState` initial value live in
 * ./finance-actions-state (a plain module) because a 'use server' file may only
 * export async functions.
 */

function fieldErrorsFromZod(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !(key in fieldErrors)) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}

export async function generateSimulatedBrokerActivityAction(
  _prev: FinanceActivityState,
  formData: FormData,
): Promise<FinanceActivityState> {
  await requireCurrentSession('/finance');

  const parsed = claudeFinanceActivityInputSchema.safeParse({
    assetId: String(formData.get('assetId') ?? ''),
    symbol: String(formData.get('symbol') ?? ''),
    assetClass: String(formData.get('assetClass') ?? 'stock'),
    side: String(formData.get('side') ?? 'buy').toLowerCase(),
    quantity: formData.get('quantity') ?? 1,
    mode: String(formData.get('mode') ?? 'watchlist-analysis'),
  });

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Please correct the highlighted fields.',
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  try {
    const activity = await generateSimulatedBrokerActivityForCurrentUser(parsed.data);
    return {
      status: 'success',
      message: activity.executable
        ? 'Simulated activity preview generated.'
        : 'Preview generated — activity is currently blocked by risk controls.',
      fieldErrors: {},
      activity,
    };
  } catch (error) {
    return {
      status: 'error',
      message:
        error instanceof Error
          ? 'Could not generate the simulated activity preview. Please try again shortly.'
          : 'Unexpected error generating the preview.',
      fieldErrors: {},
    };
  }
}

export async function saveSimulatedBrokerActivityToJournalAction(
  _prev: FinanceActivityState,
  formData: FormData,
): Promise<FinanceActivityState> {
  await requireCurrentSession('/finance');

  const raw = String(formData.get('activity') ?? '');
  if (!raw) {
    return { status: 'error', message: 'No activity to save.', fieldErrors: {} };
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { status: 'error', message: 'Activity payload was malformed.', fieldErrors: {} };
  }

  const parsed = simulatedBrokerActivitySchema.safeParse(json);
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Activity payload failed validation and was not saved.',
      fieldErrors: {},
    };
  }

  try {
    const { id } = await saveSimulatedBrokerActivityForCurrentUser(parsed.data);
    revalidatePath('/finance');
    return {
      status: 'success',
      message: 'Saved to the decision journal.',
      fieldErrors: {},
      savedDecisionId: id,
    };
  } catch (error) {
    return {
      status: 'error',
      message:
        error instanceof Error
          ? 'Could not save the decision. Simulation journal may be temporarily unavailable.'
          : 'Unexpected error saving the decision.',
      fieldErrors: {},
    };
  }
}
