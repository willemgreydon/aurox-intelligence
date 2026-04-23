export function normalizeError(error: unknown) {
  return error instanceof Error ? { message: error.message } : { message: 'Unknown error' };
}
