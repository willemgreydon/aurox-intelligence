export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  return fn();
}
