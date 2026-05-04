import { monitoredProviderConfigSchema } from '@repo/api-contracts';
import { createDatabaseClient } from '../client';
const table = 'app.provider_monitor_configs';
function isMissingTable(error) {
    if (typeof error !== 'object' || error === null || !('code' in error))
        return false;
    const e = error;
    return e.code === '42P01' || e.code === '42703';
}
export function defaultMonitorConfigs() {
    const now = new Date().toISOString();
    return [
        {
            id: 'market-finnhub',
            providerKey: 'finnhub',
            providerName: 'Finnhub',
            category: 'MARKET_DATA',
            enabled: true,
            monitorHealth: true,
            monitorLatency: true,
            monitorQuota: false,
            monitorErrors: true,
            displayInDashboard: true,
            alertThresholdMs: 3000,
            failureThreshold: 3,
            createdAt: now,
            updatedAt: now,
        },
        {
            id: 'news-polygon',
            providerKey: 'polygon-news',
            providerName: 'Polygon News',
            category: 'NEWS',
            enabled: true,
            monitorHealth: true,
            monitorLatency: true,
            monitorQuota: false,
            monitorErrors: true,
            displayInDashboard: true,
            alertThresholdMs: 3000,
            failureThreshold: 3,
            createdAt: now,
            updatedAt: now,
        },
    ];
}
export async function listProviderMonitorConfigs() {
    const client = createDatabaseClient();
    if (!client.isConfigured)
        return defaultMonitorConfigs();
    try {
        const rows = await client.query(`select
          id,
          provider_key as "providerKey",
          provider_name as "providerName",
          category,
          enabled,
          monitor_health as "monitorHealth",
          monitor_latency as "monitorLatency",
          monitor_quota as "monitorQuota",
          monitor_errors as "monitorErrors",
          display_in_dashboard as "displayInDashboard",
          alert_threshold_ms as "alertThresholdMs",
          failure_threshold as "failureThreshold",
          created_at as "createdAt",
          updated_at as "updatedAt"
       from ${table}
       order by provider_name asc`);
        if (rows.length === 0)
            return defaultMonitorConfigs();
        return rows.map((row) => monitoredProviderConfigSchema.parse({
            ...row,
            ...(row.alertThresholdMs === null ? {} : { alertThresholdMs: row.alertThresholdMs }),
            ...(row.failureThreshold === null ? {} : { failureThreshold: row.failureThreshold }),
        }));
    }
    catch (error) {
        if (isMissingTable(error))
            return defaultMonitorConfigs();
        throw error;
    }
}
export async function saveProviderMonitorConfigs(configs) {
    const parsed = configs.map((config) => monitoredProviderConfigSchema.parse(config));
    const client = createDatabaseClient();
    if (!client.isConfigured)
        return parsed;
    try {
        await client.transaction(async (tx) => {
            for (const config of parsed) {
                await tx.execute(`insert into ${table} (
              id, provider_key, provider_name, category, enabled, monitor_health, monitor_latency,
              monitor_quota, monitor_errors, display_in_dashboard, alert_threshold_ms, failure_threshold, created_at, updated_at
           ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
           on conflict (id) do update set
              provider_key = excluded.provider_key,
              provider_name = excluded.provider_name,
              category = excluded.category,
              enabled = excluded.enabled,
              monitor_health = excluded.monitor_health,
              monitor_latency = excluded.monitor_latency,
              monitor_quota = excluded.monitor_quota,
              monitor_errors = excluded.monitor_errors,
              display_in_dashboard = excluded.display_in_dashboard,
              alert_threshold_ms = excluded.alert_threshold_ms,
              failure_threshold = excluded.failure_threshold,
              updated_at = excluded.updated_at`, [
                    config.id,
                    config.providerKey,
                    config.providerName,
                    config.category,
                    config.enabled,
                    config.monitorHealth,
                    config.monitorLatency,
                    config.monitorQuota,
                    config.monitorErrors,
                    config.displayInDashboard,
                    config.alertThresholdMs ?? null,
                    config.failureThreshold ?? null,
                    config.createdAt,
                    config.updatedAt,
                ]);
            }
        });
        return parsed;
    }
    catch (error) {
        if (isMissingTable(error))
            return parsed;
        throw error;
    }
}
