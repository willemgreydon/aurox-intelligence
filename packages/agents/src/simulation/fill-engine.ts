function roundPrice(value: number): number {
  return Math.round((value + Number.EPSILON) * 1e8) / 1e8;
}

/**
 * Deterministic fill price for a simulated market order.
 * Applies slippage basis points in the adverse direction (buy = higher, sell = lower).
 * Mirrors the applySlippage logic in the simulation trading repository.
 */
export function simulateFill(
  marketPrice: number,
  side: 'buy' | 'sell',
  slippageBps: number = 0,
): number {
  if (!Number.isFinite(marketPrice) || marketPrice <= 0) {
    throw new Error('marketPrice must be a positive finite number.');
  }

  if (!Number.isFinite(slippageBps) || slippageBps < 0) {
    throw new Error('slippageBps must be a non-negative finite number.');
  }

  if (slippageBps === 0) {
    return marketPrice;
  }

  const multiplier = slippageBps / 10_000;
  const adjusted =
    side === 'buy'
      ? marketPrice * (1 + multiplier)
      : marketPrice * (1 - multiplier);

  return roundPrice(Math.max(adjusted, Number.EPSILON));
}
