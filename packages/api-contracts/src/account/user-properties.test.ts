import { describe, expect, it } from 'vitest';
import {
  adminUserPropertiesUpdateInputSchema,
  createDefaultUserProperties,
  deriveNpsCategory,
  toPublicUserProperties,
  userPropertiesSchema,
  userProfileDetailsUpdateInputSchema,
  userSatisfactionInputSchema,
} from './user-properties';

describe('deriveNpsCategory', () => {
  it('buckets 0–6 as detractor', () => {
    for (const score of [0, 3, 6]) {
      expect(deriveNpsCategory(score)).toBe('detractor');
    }
  });

  it('buckets 7–8 as passive', () => {
    expect(deriveNpsCategory(7)).toBe('passive');
    expect(deriveNpsCategory(8)).toBe('passive');
  });

  it('buckets 9–10 as promoter', () => {
    expect(deriveNpsCategory(9)).toBe('promoter');
    expect(deriveNpsCategory(10)).toBe('promoter');
  });

  it('returns null for null / NaN', () => {
    expect(deriveNpsCategory(null)).toBeNull();
    expect(deriveNpsCategory(Number.NaN)).toBeNull();
  });
});

describe('createDefaultUserProperties', () => {
  it('produces a schema-valid, privacy-by-default record', () => {
    const defaults = createDefaultUserProperties('11111111-1111-1111-1111-111111111111');
    expect(() => userPropertiesSchema.parse(defaults)).not.toThrow();
    expect(defaults.marketingOptIn).toBe(false);
    expect(defaults.productUpdatesOptIn).toBe(false);
    expect(defaults.researchParticipationOptIn).toBe(false);
    expect(defaults.totalSessions).toBe(0);
    expect(defaults.featureAdoption).toEqual({});
    expect(defaults.internalSegments).toEqual([]);
  });
});

describe('toPublicUserProperties', () => {
  it('strips the admin-only internal (H) block', () => {
    const full = {
      ...createDefaultUserProperties('22222222-2222-2222-2222-222222222222'),
      healthScore: 82,
      churnRiskScore: 0.12,
      internalSegments: ['high-intent'],
      adminNotes: 'internal only',
    };
    const publicView = toPublicUserProperties(full) as Record<string, unknown>;
    expect('healthScore' in publicView).toBe(false);
    expect('churnRiskScore' in publicView).toBe(false);
    expect('internalSegments' in publicView).toBe(false);
    expect('adminNotes' in publicView).toBe(false);
    expect(publicView.userId).toBe('22222222-2222-2222-2222-222222222222');
  });
});

describe('userProfileDetailsUpdateInputSchema', () => {
  it('accepts a valid profile + consent payload', () => {
    const parsed = userProfileDetailsUpdateInputSchema.parse({
      jobTitle: 'Quant',
      organization: 'Aurox',
      country: 'AT',
      region: 'Tyrol',
      timezone: 'Europe/Vienna',
      bio: 'Simulation-first trader.',
      marketingOptIn: true,
      productUpdatesOptIn: false,
      researchParticipationOptIn: true,
    });
    expect(parsed.jobTitle).toBe('Quant');
    expect(parsed.marketingOptIn).toBe(true);
  });

  it('rejects an over-long bio', () => {
    const result = userProfileDetailsUpdateInputSchema.safeParse({
      jobTitle: null,
      organization: null,
      country: null,
      region: null,
      timezone: null,
      bio: 'x'.repeat(501),
      marketingOptIn: false,
      productUpdatesOptIn: false,
      researchParticipationOptIn: false,
    });
    expect(result.success).toBe(false);
  });
});

describe('userSatisfactionInputSchema', () => {
  it('requires at least one of NPS / CSAT', () => {
    const result = userSatisfactionInputSchema.safeParse({
      npsScore: null,
      csatScore: null,
      satisfactionNotes: 'no rating',
    });
    expect(result.success).toBe(false);
  });

  it('accepts an NPS-only submission and bounds the score', () => {
    expect(
      userSatisfactionInputSchema.safeParse({ npsScore: 9, csatScore: null, satisfactionNotes: null }).success,
    ).toBe(true);
    expect(
      userSatisfactionInputSchema.safeParse({ npsScore: 11, csatScore: null, satisfactionNotes: null }).success,
    ).toBe(false);
  });
});

describe('adminUserPropertiesUpdateInputSchema', () => {
  it('bounds healthScore to 0–100 and churnRiskScore to 0–1', () => {
    const base = {
      userId: '33333333-3333-4333-8333-333333333333',
      lifecycleStage: 'engaged' as const,
      maturityTier: 'strategist' as const,
      internalSegments: [],
      adminNotes: null,
    };
    expect(adminUserPropertiesUpdateInputSchema.safeParse({ ...base, healthScore: 50, churnRiskScore: 0.5 }).success).toBe(
      true,
    );
    expect(adminUserPropertiesUpdateInputSchema.safeParse({ ...base, healthScore: 120, churnRiskScore: 0.5 }).success).toBe(
      false,
    );
    expect(adminUserPropertiesUpdateInputSchema.safeParse({ ...base, healthScore: 50, churnRiskScore: 2 }).success).toBe(
      false,
    );
  });
});
