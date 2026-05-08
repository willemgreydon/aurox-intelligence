import { describe, expect, it } from 'vitest';
import { shouldDisplayProviderCheck, type ProviderCheck } from './admin-query';
import type { MonitoredProviderConfig } from '@repo/api-contracts';

function makeCheck(id: string): ProviderCheck {
  return {
    id,
    name: id,
    displayName: id,
    category: 'metadata',
    capabilities: [],
    configured: true,
    isActiveProvider: false,
    status: 'nominal',
    detail: 'ok',
    lastChecked: null,
    latencyMs: null,
    monitored: true,
    enabled: true,
    lastSuccessfulCheck: null,
    lastError: null,
  };
}

function makeConfig(overrides: Partial<MonitoredProviderConfig>): MonitoredProviderConfig {
  const now = new Date().toISOString();
  return {
    id: 'polygon',
    providerKey: 'polygon',
    providerName: 'Polygon',
    category: 'MARKET_DATA',
    enabled: true,
    monitorHealth: true,
    monitorLatency: true,
    monitorQuota: false,
    monitorErrors: true,
    displayInDashboard: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('shouldDisplayProviderCheck', () => {
  it('hides disabled providers', () => {
    const configByKey = new Map<string, MonitoredProviderConfig>([['polygon', makeConfig({ enabled: false })]]);
    expect(shouldDisplayProviderCheck(makeCheck('polygon'), configByKey)).toBe(false);
  });

  it('hides non-displayed providers', () => {
    const configByKey = new Map<string, MonitoredProviderConfig>([['polygon', makeConfig({ displayInDashboard: false })]]);
    expect(shouldDisplayProviderCheck(makeCheck('polygon'), configByKey)).toBe(false);
  });

  it('shows provider when config is missing', () => {
    expect(shouldDisplayProviderCheck(makeCheck('polygon'), new Map())).toBe(true);
  });
});
