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

export function normalizeAgentError(message: string, fallback: string) {
  const lower = message.toLowerCase();
  if (
    lower.includes('quota') ||
    lower.includes('rate limit') ||
    lower.includes('insufficient_quota') ||
    lower.includes('429') ||
    lower.includes('401') ||
    lower.includes('403') ||
    lower.includes('timeout') ||
    lower.includes('provider unavailable') ||
    lower.includes('api key')
  ) {
    return fallback;
  }
  return message;
}
