import { describe, expect, it } from 'vitest';
import { createDefaultUserProperties, toPublicUserProperties } from '@repo/api-contracts';
import { mapAccountUserProperties } from './user-properties-mapper';

const USER_ID = '44444444-4444-4444-4444-444444444444';

describe('mapAccountUserProperties', () => {
  it('maps a default (empty) record to blank form defaults and no insights', () => {
    const vm = mapAccountUserProperties(toPublicUserProperties(createDefaultUserProperties(USER_ID)));

    expect(vm.profile).toEqual({
      jobTitle: '',
      organization: '',
      country: '',
      region: '',
      timezone: '',
      bio: '',
    });
    expect(vm.consent.marketingOptIn).toBe(false);
    expect(vm.consent.consentUpdatedLabel).toBeNull();
    expect(vm.satisfaction.npsScore).toBeNull();
    expect(vm.satisfaction.npsCategoryLabel).toBeNull();
    expect(vm.insights).toEqual([]);
  });

  it('formats populated profile, consent, satisfaction, and insight rows', () => {
    const populated = {
      ...createDefaultUserProperties(USER_ID),
      jobTitle: 'Quant',
      organization: 'Aurox',
      bio: 'Simulation-first.',
      marketingOptIn: true,
      consentUpdatedAt: '2026-09-01T00:00:00.000Z',
      lifecycleStage: 'engaged' as const,
      maturityTier: 'strategist' as const,
      totalSimulationOrders: 42,
      streakDays: 5,
      riskAppetite: 'balanced' as const,
      avgPositionSizeUsd: 1234.56,
      npsScore: 9,
      npsCategory: 'promoter' as const,
      npsSubmittedAt: '2026-09-10T00:00:00.000Z',
    };

    const vm = mapAccountUserProperties(toPublicUserProperties(populated));

    expect(vm.profile.jobTitle).toBe('Quant');
    expect(vm.consent.marketingOptIn).toBe(true);
    expect(vm.consent.consentUpdatedLabel).not.toBeNull();
    expect(vm.satisfaction.npsCategoryLabel).toBe('Promoter');

    const insightIds = vm.insights.map((entry) => entry.id);
    expect(insightIds).toContain('lifecycle');
    expect(insightIds).toContain('maturity');
    expect(insightIds).toContain('orders');
    expect(insightIds).toContain('streak');
    expect(insightIds).toContain('risk');
    expect(insightIds).toContain('avg-position');

    const orders = vm.insights.find((entry) => entry.id === 'orders');
    expect(orders?.value).toBe('42');
    const avg = vm.insights.find((entry) => entry.id === 'avg-position');
    expect(avg?.value).toContain('$1,235');
  });

  it('never exposes admin-only (H) fields on the view model', () => {
    const withInternal = {
      ...createDefaultUserProperties(USER_ID),
      healthScore: 90,
      churnRiskScore: 0.1,
      internalSegments: ['vip'],
      adminNotes: 'secret',
    };
    const vm = mapAccountUserProperties(toPublicUserProperties(withInternal));
    const serialized = JSON.stringify(vm);
    expect(serialized).not.toContain('secret');
    expect(serialized).not.toContain('vip');
  });
});
