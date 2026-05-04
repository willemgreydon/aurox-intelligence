'use server';

import { monitoredProviderConfigSchema, type MonitoredProviderConfig } from '@repo/api-contracts';
import { listProviderMonitorConfigs, saveProviderMonitorConfigs } from '@repo/db';
import { revalidatePath } from 'next/cache';

function toBoolean(value: FormDataEntryValue | null) {
  return value === 'on' || value === 'true' || value === '1';
}

export async function saveProviderMonitorConfigAction(formData: FormData): Promise<void> {
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
