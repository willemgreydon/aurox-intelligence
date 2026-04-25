import { isPerfLoggingEnabled } from './market-runtime-config';

export function perfNow() {
  return isPerfLoggingEnabled() ? performance.now() : null;
}

export function perfLog(label: string, startedAt: number | null) {
  if (startedAt === null) {
    return;
  }

  const elapsed = performance.now() - startedAt;
  console.debug(`[perf] ${label} ${elapsed.toFixed(0)}ms`);
}

