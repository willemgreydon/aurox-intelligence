export function simulateFill(
  marketPrice: number,
  side: "buy" | "sell"
) {
  const spread = marketPrice * 0.001; // 0.1%
  const slippage = marketPrice * (Math.random() * 0.002);

  const executionPrice =
    side === "buy"
      ? marketPrice + spread + slippage
      : marketPrice - spread - slippage;

  return executionPrice;
}