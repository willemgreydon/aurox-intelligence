export function snapToStep(value: number, min: number, step: number) {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(step) || step <= 0) {
    return min;
  }
  const raw = Math.max(min, value);
  const snapped = Math.round((raw - min) / step) * step + min;
  return Number(snapped.toFixed(8));
}

export function buildNoOpenPositionReason(symbol: string) {
  return `No open ${symbol} position is available to sell.`;
}

// Signatures of AI-provider / transport failures that must NOT be shown raw in
// the primary UI — they are mapped to the safe "defaulted to HOLD" message
// (the raw text stays available only in the collapsed developer disclosure).
// Domain errors (insufficient cash, no open position, invalid quantity, …) are
// intentionally NOT matched here so the user keeps the actionable message.
const PROVIDER_FAILURE_SIGNATURES = [
  'quota',
  'rate limit',
  'insufficient_quota',
  '429',
  '401',
  '403',
  '500',
  '502',
  '503',
  '504',
  '529',
  'timeout',
  'timed out',
  'provider unavailable',
  'service unavailable',
  'bad gateway',
  'gateway timeout',
  'overloaded',
  'api key',
  'invalid_api_key',
  'authentication',
  'model_not_found',
  'openai',
  'anthropic',
  'enotfound',
  'econnreset',
  'econnrefused',
  'fetch failed',
  'network error',
  'socket hang up',
];

export function normalizeAgentError(message: string, fallback: string) {
  const lower = message.toLowerCase();
  if (PROVIDER_FAILURE_SIGNATURES.some((signature) => lower.includes(signature))) {
    return fallback;
  }
  return message;
}
