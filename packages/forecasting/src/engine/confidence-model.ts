export function calculateConfidenceScore(signalCount: number): number {
  return Math.max(0, Math.min(1, signalCount / 10));
}
