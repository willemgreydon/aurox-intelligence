/**
 * Normalizes raw simulation errors into user-safe, typed results.
 *
 * Rules:
 * - userMessage: safe for display to end users, no raw URLs or stack traces
 * - technicalDetail: raw error text for <details> collapsed disclosure only
 * - isRecoverable: true if user can retry without a page refresh
 */

export type NormalizedSimulationError = {
  userMessage: string;
  technicalDetail?: string;
  isRecoverable: boolean;
};

const PROVIDER_QUOTA_PATTERNS = [
  /insufficient_quota/i,
  /rate.?limit/i,
  /429/,
  /quota exceeded/i,
  /too many requests/i,
  /openai/i,
  /anthropic/i,
  /api key/i,
  /you exceeded your current quota/i,
];

const MISSING_QUOTE_PATTERNS = [
  /fresh.*quote required/i,
  /quote.*unavailable/i,
  /market data.*unavailable/i,
  /price.*unavailable/i,
  /no quote/i,
];

const STALE_QUOTE_PATTERNS = [
  /stale.*quote/i,
  /quote.*stale/i,
  /quote.*expired/i,
  /market data.*stale/i,
];

const INSUFFICIENT_CASH_PATTERNS = [
  /insufficient.*cash/i,
  /insufficient fictive cash/i,
  /not enough cash/i,
  /available.*cash.*required/i,
  /cash balance.*required/i,
];

const NO_POSITION_PATTERNS = [
  /no open.*position/i,
  /insufficient position quantity/i,
  /sell quantity exceeds/i,
  /no.*position.*available to sell/i,
];

const INVALID_QUANTITY_PATTERNS = [
  /order quantity must be greater than zero/i,
  /quantity.*invalid/i,
  /invalid.*quantity/i,
  /quantity.*required/i,
];

const DB_TIMEOUT_PATTERNS = [
  /simulation database is currently unavailable/i,
  /database.*unavailable/i,
  /connection.*timed out/i,
  /connection.*refused/i,
  /ECONNREFUSED/,
  /ETIMEDOUT/,
];

const DB_INTERNAL_PATTERNS = [
  /inconsistent types/i,
  /postgres/i,
  /syntax error/i,
  /violates.*constraint/i,
  /duplicate key/i,
  /ERROR:/,
  /SQLSTATE/,
  /pg_/i,
  /transaction.*rolled back/i,
];

function matchesAny(message: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(message));
}

/**
 * Extracts the user-facing message and determines recoverability.
 * Never exposes raw URLs, stack traces, or provider-internal details in userMessage.
 */
export function normalizeSimulationError(err: unknown): NormalizedSimulationError {
  const raw = err instanceof Error ? err.message : String(err ?? 'Unknown error');

  // Provider quota / rate limit — AI provider issues, not order issues
  if (matchesAny(raw, PROVIDER_QUOTA_PATTERNS)) {
    return {
      userMessage: 'AI provider temporarily unavailable. No order was submitted.',
      technicalDetail: raw,
      isRecoverable: true,
    };
  }

  // Missing quote — cannot price the order
  if (matchesAny(raw, MISSING_QUOTE_PATTERNS)) {
    return {
      userMessage: 'Quote unavailable. The simulated order was not submitted.',
      technicalDetail: raw,
      isRecoverable: true,
    };
  }

  // Stale quote
  if (matchesAny(raw, STALE_QUOTE_PATTERNS)) {
    return {
      userMessage: 'Price data is stale. Order not submitted. Refresh and try again.',
      technicalDetail: raw,
      isRecoverable: true,
    };
  }

  // Insufficient cash
  if (matchesAny(raw, INSUFFICIENT_CASH_PATTERNS)) {
    return {
      userMessage: 'Insufficient simulated cash for this order.',
      technicalDetail: raw,
      isRecoverable: false,
    };
  }

  // No position to sell — extract symbol if possible
  if (matchesAny(raw, NO_POSITION_PATTERNS)) {
    const symbolMatch = raw.match(/\b([A-Z0-9.:]{2,20})\b/);
    const symbol = symbolMatch?.[1];
    const userMessage = symbol
      ? `No simulated ${symbol} position available to sell.`
      : 'No simulated position available to sell.';
    return {
      userMessage,
      technicalDetail: raw,
      isRecoverable: false,
    };
  }

  // Invalid quantity
  if (matchesAny(raw, INVALID_QUANTITY_PATTERNS)) {
    return {
      userMessage: 'Invalid quantity for this order.',
      technicalDetail: raw,
      isRecoverable: true,
    };
  }

  // Database timeout / connectivity
  if (matchesAny(raw, DB_TIMEOUT_PATTERNS)) {
    return {
      userMessage: 'Database temporarily unavailable. Please try again.',
      technicalDetail: raw,
      isRecoverable: true,
    };
  }

  // Internal DB errors — never expose raw postgres messages
  if (matchesAny(raw, DB_INTERNAL_PATTERNS)) {
    return {
      userMessage: 'An internal error occurred. The order was not submitted.',
      technicalDetail: raw,
      isRecoverable: true,
    };
  }

  // Unknown fallback
  return {
    userMessage: 'An unexpected error occurred. The order was not submitted.',
    technicalDetail: raw,
    isRecoverable: true,
  };
}
