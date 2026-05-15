const DEFAULT_DB_READ_TIMEOUT_MS = 8_000;
const DEFAULT_HOME_WIDGET_TIMEOUT_MS = 3_000;
const MIN_TIMEOUT_MS = 500;
const MAX_TIMEOUT_MS = 30_000;

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
  if (!Number.isFinite(raw) || raw < 1_000) {
    return DEFAULT_DB_READ_TIMEOUT_MS;
  }
  return Math.floor(raw);
}

export function getHomeWidgetTimeoutMs(): number {
  const raw = Number(process.env.HOME_WIDGET_TIMEOUT_MS ?? DEFAULT_HOME_WIDGET_TIMEOUT_MS);
  if (!Number.isFinite(raw)) return DEFAULT_HOME_WIDGET_TIMEOUT_MS;
  return Math.floor(Math.min(Math.max(raw, MIN_TIMEOUT_MS), MAX_TIMEOUT_MS));
}

export async function withDbReadFallback<T>(
  operationName: string,
  fallback: T,
  load: () => Promise<T>,
  overrideTimeoutMs?: number,
): Promise<DbGuardResult<T>> {
  if (!isPrismaDbEnabled()) {
    return {
      value: fallback,
      degraded: true,
      reason: 'disabled',
    };
  }

  const timeoutMs = overrideTimeoutMs ?? getDbReadTimeoutMs();
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
