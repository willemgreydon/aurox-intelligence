type PerfMeta = Record<string, unknown>;

const SENSITIVE_KEY_PATTERN = /(token|secret|password|authorization|api[-_]?key|cookie)/i;

function isEnabled() {
  const raw = process.env.AUROX_PERF_LOGS ?? process.env.ENABLE_PERF_LOGS;
  if (!raw) {
    return false;
  }
  return raw === '1' || raw.toLowerCase() === 'true';
}

export function redactMeta(meta: PerfMeta): PerfMeta {
  const output: PerfMeta = {};
  for (const [key, value] of Object.entries(meta)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      output[key] = '[redacted]';
      continue;
    }
    output[key] = value;
  }
  return output;
}

export function startPerfTimer(name: string, meta: PerfMeta = {}) {
  const startedAt = Date.now();
  return {
    end(extraMeta: PerfMeta = {}) {
      if (!isEnabled()) {
        return;
      }
      const durationMs = Date.now() - startedAt;
      const merged = redactMeta({ ...meta, ...extraMeta });
      console.debug(`[aurox-perf] ${name} ${durationMs}ms`, merged);
    },
  };
}
