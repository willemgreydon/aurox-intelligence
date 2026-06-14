'use server';

import { monitoredProviderConfigSchema, type MonitoredProviderConfig } from '@repo/api-contracts';
import { listProviderMonitorConfigs, saveProviderMonitorConfigs } from '@repo/db';
import { revalidatePath } from 'next/cache';
import { requireCurrentSession } from '../auth/session';

function toBoolean(value: FormDataEntryValue | null) {
  return value === 'on' || value === 'true' || value === '1';
}

// NOTE: This is a "use server" module — every export MUST be an async function.
// Do not export error classes/constants from here, or Next.js drops the action
// export entirely ("export ... was not found"). The authorization error is
// thrown inline below with a stable code string instead.

export async function saveProviderMonitorConfigAction(formData: FormData): Promise<void> {
  // Fail-closed defense-in-depth on top of the `/admin` layout role guard. The
  // form-action contract requires a Promise<void> return, so an unauthorized
  // caller is rejected by throwing rather than returning a result object.
  const auth = await requireCurrentSession('/admin');
  if (auth.user.role !== 'admin') {
    throw new Error('admin_authorization_required: admin role is required for provider monitor configuration');
  }

  const current = await listProviderMonitorConfigs();
  const next: MonitoredProviderConfig[] = current.map((config) => {
    const prefix = config.id;
    const updated = {
      ...config,
      enabled: toBoolean(formData.get(`${prefix}:enabled`)),
      monitorHealth: toBoolean(formData.get(`${prefix}:monitorHealth`)),
      monitorLatency: toBoolean(formData.get(`${prefix}:monitorLatency`)),
      monitorQuota: toBoolean(formData.get(`${prefix}:monitorQuota`)),
      monitorErrors: toBoolean(formData.get(`${prefix}:monitorErrors`)),
      displayInDashboard: toBoolean(formData.get(`${prefix}:displayInDashboard`)),
      updatedAt: new Date().toISOString(),
    };
    return monitoredProviderConfigSchema.parse(updated);
  });

  await saveProviderMonitorConfigs(next);
  revalidatePath('/admin');
  revalidatePath('/admin/monitoring');
  revalidatePath('/admin/monitoring/providers');
}
