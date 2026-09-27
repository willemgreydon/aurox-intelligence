/**
 * Neon consumption telemetry — the authoritative egress number.
 *
 * True network egress (Neon's "Network transfer", the free-plan cap that takes
 * the site down) is a PLATFORM metric: it is not queryable from SQL. The only
 * source of truth is the Neon API. This service reads the per-project billing
 * object (`GET /api/v2/projects/{id}`) whose `data_transfer_bytes` is exactly the
 * figure shown in the Neon console, plus current storage and compute.
 *
 * Boundary note: this calls a platform/ops API, not a market-data provider, so
 * it deliberately lives here (colocated with its only consumer, the daily cron)
 * rather than in @repo/providers, which owns canonical market-data adapters.
 *
 * Design: fully OPTIONAL and FAIL-SAFE.
 *  - Skips silently unless NEON_API_KEY + NEON_PROJECT_ID are set → returns null.
 *  - Bounded by a short timeout; any error (network, auth, parse) → null.
 *  - Never throws, so it can never break the cron that calls it.
 */

const NEON_API_BASE = 'https://console.neon.tech/api/v2';
const REQUEST_TIMEOUT_MS = 5_000;
const BYTES_PER_MB = 1024 * 1024;
// Neon free plan network-transfer allowance. Documented default; override via env
// if the plan changes so the "% of cap" context stays accurate.
const DEFAULT_EGRESS_CAP_GB = 5;

export type NeonConsumption = {
  egressMb: number | null;
  egressCapMb: number;
  egressPctOfCap: number | null;
  storageMb: number | null;
  computeHours: number | null;
  periodStart: string | null;
  periodEnd: string | null;
};

type NeonProjectResponse = {
  project?: {
    data_transfer_bytes?: number;
    synthetic_storage_size?: number;
    compute_time_seconds?: number;
    consumption_period_start?: string;
    consumption_period_end?: string;
  };
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export async function getNeonConsumption(): Promise<NeonConsumption | null> {
  const apiKey = process.env.NEON_API_KEY;
  const projectId = process.env.NEON_PROJECT_ID;
  if (!apiKey || !projectId) {
    // Not configured — telemetry is opt-in, so this is a normal no-op.
    return null;
  }

  const capGb = Number(process.env.NEON_EGRESS_CAP_GB) || DEFAULT_EGRESS_CAP_GB;
  const egressCapMb = capGb * 1024;

  try {
    const response = await fetch(`${NEON_API_BASE}/projects/${encodeURIComponent(projectId)}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.warn(`[neon-consumption] API returned ${response.status}; skipping usage telemetry`);
      return null;
    }

    const body = (await response.json()) as NeonProjectResponse;
    const project = body.project ?? {};

    const egressMb =
      typeof project.data_transfer_bytes === 'number'
        ? round1(project.data_transfer_bytes / BYTES_PER_MB)
        : null;
    const storageMb =
      typeof project.synthetic_storage_size === 'number'
        ? round1(project.synthetic_storage_size / BYTES_PER_MB)
        : null;
    const computeHours =
      typeof project.compute_time_seconds === 'number'
        ? round1(project.compute_time_seconds / 3600)
        : null;

    return {
      egressMb,
      egressCapMb,
      egressPctOfCap: egressMb !== null ? round1((egressMb / egressCapMb) * 100) : null,
      storageMb,
      computeHours,
      periodStart: project.consumption_period_start ?? null,
      periodEnd: project.consumption_period_end ?? null,
    };
  } catch (error) {
    console.warn('[neon-consumption] usage telemetry failed (non-fatal)', error);
    return null;
  }
}
