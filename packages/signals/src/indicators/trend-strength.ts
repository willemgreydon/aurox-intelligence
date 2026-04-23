export function trendStrength(change: number, volatilityValue: number): number {
  if (volatilityValue === 0) return 0;
  return change / volatilityValue;
}
