import type { SimulatedBrokerActivity } from '@repo/api-contracts';

/**
 * Plain (non-"use server") module for the Claude Finance action state.
 *
 * A `'use server'` module may ONLY export async functions — any non-function
 * export (like the `emptyFinanceActivityState` constant) resolves to `undefined`
 * on the client. Keeping the state type + initial value here lets both the
 * server action file and the client form import them safely.
 */
export type FinanceActivityState = {
  status: 'idle' | 'error' | 'success';
  message: string | null;
  fieldErrors: Record<string, string>;
  activity?: SimulatedBrokerActivity;
  savedDecisionId?: string;
};

export const emptyFinanceActivityState: FinanceActivityState = {
  status: 'idle',
  message: null,
  fieldErrors: {},
};
