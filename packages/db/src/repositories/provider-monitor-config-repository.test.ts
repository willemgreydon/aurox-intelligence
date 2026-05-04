import { describe, expect, it } from 'vitest';
import { defaultMonitorConfigs } from './provider-monitor-config-repository';

describe('defaultMonitorConfigs', () => {
  it('returns safe fallback defaults with news provider coverage', () => {
    const configs = defaultMonitorConfigs();
    expect(configs.length).toBeGreaterThan(0);
    expect(configs.some((config) => config.category === 'NEWS')).toBe(true);
    expect(configs.every((config) => config.providerKey.length > 0)).toBe(true);
  });

  it('never includes secret values in provider identifiers', () => {
    const configs = defaultMonitorConfigs();
    expect(configs.every((config) => !config.providerKey.includes('KEY'))).toBe(true);
    expect(configs.every((config) => !config.providerName.includes('SECRET'))).toBe(true);
  });
});
