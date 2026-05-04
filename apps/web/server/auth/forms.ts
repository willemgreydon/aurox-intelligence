import type { ZodError } from 'zod';
import type { SimulationOrderErrorCode } from '@repo/api-contracts';

export type OrderResult = {
  orderId: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  executionPrice: number;
  grossAmount: number;
  realizedPnl: number;
};

export type FormState = {
  status: 'idle' | 'error' | 'success';
  message: string | null;
  fieldErrors: Record<string, string>;
  orderResult?: OrderResult;
  errorCode?: SimulationOrderErrorCode;
};

export const emptyFormState: FormState = {
  status: 'idle',
  message: null,
  fieldErrors: {},
};

export function formStateFromZodError(error: ZodError) {
  const fieldErrors: Record<string, string> = {};

  for (const issue of error.issues) {
    const key = issue.path[0];

    if (typeof key === 'string' && !(key in fieldErrors)) {
      fieldErrors[key] = issue.message;
    }
  }

  return {
    status: 'error' as const,
    message: 'Please correct the highlighted fields.',
    fieldErrors,
  };
}

export function errorFormState(
  message: string,
  fieldErrors: Record<string, string> = {},
  errorCode?: SimulationOrderErrorCode,
): FormState {
  return {
    status: 'error' as const,
    message,
    fieldErrors,
    ...(errorCode !== undefined ? { errorCode } : {}),
  };
}

export function successFormState(message: string, orderResult?: OrderResult): FormState {
  const base: FormState = { status: 'success', message, fieldErrors: {} };
  if (orderResult !== undefined) {
    return { ...base, orderResult };
  }
  return base;
}
