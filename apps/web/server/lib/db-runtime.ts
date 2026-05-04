const DEFAULT_DB_READ_TIMEOUT_MS = 2_000;

export type DbGuardResult<T> = {
  value: T;
  degraded: boolean;
  reason: string | null;
};

export function isPrismaDbEnabled(): boolean {
  const raw = process.env.ENABLE_PRISMA_DB;
  if (typeof raw !== 'string') {
    return true;
  }
  return raw.trim().toLowerCase() === 'true';
}

export function getDbReadTimeoutMs(): number {
  const raw = Number(process.env.DB_READ_TIMEOUT_MS ?? DEFAULT_DB_READ_TIMEOUT_MS);
  if (!Number.isFinite(raw) || raw < 250) {
    return DEFAULT_DB_READ_TIMEOUT_MS;
  }
  return Math.floor(raw);
}

export async function withDbReadFallback<T>(
  operationName: string,
  fallback: T,
  load: () => Promise<T>,
): Promise<DbGuardResult<T>> {
  if (!isPrismaDbEnabled()) {
    return {
      value: fallback,
      degraded: true,
      reason: 'disabled',
    };
  }

  const timeoutMs = getDbReadTimeoutMs();
  let timedOut = false;
  const timeout = new Promise<never>((_, reject) => {
    const timer = setTimeout(() => {
      timedOut = true;
      clearTimeout(timer);
      reject(new Error(`DB read timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const value = await Promise.race([load(), timeout]);
    return { value, degraded: false, reason: null };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.warn(`[db-guard] ${operationName} degraded`, {
      timeoutMs,
      timedOut,
      detail,
    });
    return {
      value: fallback,
      degraded: true,
      reason: timedOut ? 'timeout' : 'error',
    };
  }
}
