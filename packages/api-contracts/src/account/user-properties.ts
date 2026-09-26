import { z } from 'zod';
import { brokerAssetScopeSchema } from '../workspace/preferences';
import { simulationAssetClassSchema } from '../simulation/simulation';

/**
 * User Properties — an additive, data-science / lifecycle / satisfaction /
 * attribution property layer that lives OUTSIDE the auth-critical `users` table
 * (persisted in `app.user_properties`, 1:1 with a user). Every field is
 * nullable or defaulted: a user with no row is represented by
 * `createDefaultUserProperties()`, never by a throw.
 *
 * Exposure boundaries (enforced in the mapper, not here):
 *   - Group A (profile) + G (consent) + D (satisfaction) are user-editable.
 *   - Group B (lifecycle) + C (engagement) + E (attribution) + F (behavior)
 *     are system/admin-populated and read-only to the user.
 *   - Group H (internal DS/ops) is ADMIN-ONLY and must never appear in a
 *     user-facing read model.
 */

// ── Shared enums ────────────────────────────────────────────────────────────

/** B. Where the user sits in their platform lifecycle. */
export const lifecycleStageSchema = z.enum([
  'signed_up',
  'onboarding',
  'activated',
  'engaged',
  'power_user',
  'at_risk',
  'churned',
  'reactivated',
]);

/** B. Aurox-specific product maturity progression. */
export const maturityTierSchema = z.enum(['observer', 'simulator', 'strategist', 'operator']);

/** D. Derived NPS bucket. */
export const npsCategorySchema = z.enum(['detractor', 'passive', 'promoter']);

/** F. Self-reported or derived risk appetite. */
export const riskAppetiteSchema = z.enum(['conservative', 'balanced', 'aggressive']);

// ── Group value objects ─────────────────────────────────────────────────────

/** A. Extended profile — user-editable identity beyond the auth record. */
const profileDetailsShape = {
  jobTitle: z.string().trim().max(120).nullable(),
  organization: z.string().trim().max(120).nullable(),
  country: z.string().trim().max(80).nullable(),
  region: z.string().trim().max(80).nullable(),
  timezone: z.string().trim().max(64).nullable(),
  bio: z.string().trim().max(500).nullable(),
} as const;

/** B. Lifecycle & maturity — system/admin populated. */
const lifecycleShape = {
  lifecycleStage: lifecycleStageSchema.nullable(),
  maturityTier: maturityTierSchema.nullable(),
  onboardingCompletedAt: z.string().nullable(),
  firstSimulationAt: z.string().nullable(),
  activatedAt: z.string().nullable(),
  lastActiveAt: z.string().nullable(),
} as const;

/** C. Engagement aggregates — refreshed by a background job. */
const engagementShape = {
  totalSessions: z.number().int().nonnegative(),
  totalActiveDays: z.number().int().nonnegative(),
  streakDays: z.number().int().nonnegative(),
  totalSimulationOrders: z.number().int().nonnegative(),
  featureAdoption: z.record(z.string(), z.number()),
  aggregatesRefreshedAt: z.string().nullable(),
} as const;

/** D. CSAT / NPS satisfaction signals — user-submitted. */
const satisfactionShape = {
  npsScore: z.number().int().min(0).max(10).nullable(),
  npsCategory: npsCategorySchema.nullable(),
  npsSubmittedAt: z.string().nullable(),
  csatScore: z.number().int().min(1).max(5).nullable(),
  csatSubmittedAt: z.string().nullable(),
  satisfactionNotes: z.string().trim().max(1000).nullable(),
} as const;

/** E. Acquisition / attribution — captured once, first-touch. */
const acquisitionShape = {
  acquisitionSource: z.string().trim().max(120).nullable(),
  acquisitionMedium: z.string().trim().max(120).nullable(),
  acquisitionCampaign: z.string().trim().max(160).nullable(),
  referralCode: z.string().trim().max(80).nullable(),
  landingPage: z.string().trim().max(512).nullable(),
  firstTouchAt: z.string().nullable(),
} as const;

/** F. Simulation-behavior aggregates — system-derived. */
const behaviorShape = {
  riskAppetite: riskAppetiteSchema.nullable(),
  preferredAssetScope: brokerAssetScopeSchema.nullable(),
  mostTradedAssetClass: simulationAssetClassSchema.nullable(),
  avgPositionSizeUsd: z.number().nonnegative().nullable(),
  behaviorRefreshedAt: z.string().nullable(),
} as const;

/** G. Consent / marketing flags — user-consent, write-path critical. */
const consentShape = {
  marketingOptIn: z.boolean(),
  productUpdatesOptIn: z.boolean(),
  researchParticipationOptIn: z.boolean(),
  termsAcceptedVersion: z.string().trim().max(40).nullable(),
  termsAcceptedAt: z.string().nullable(),
  privacyPolicyVersion: z.string().trim().max(40).nullable(),
  consentUpdatedAt: z.string().nullable(),
} as const;

/** H. Internal data-science / ops — ADMIN-ONLY. Never in a user read model. */
const internalShape = {
  healthScore: z.number().min(0).max(100).nullable(),
  churnRiskScore: z.number().min(0).max(1).nullable(),
  internalSegments: z.array(z.string().trim().max(60)),
  adminNotes: z.string().trim().max(2000).nullable(),
} as const;

// ── Full record ─────────────────────────────────────────────────────────────

/**
 * The complete persisted property record (admin view). A user-facing read model
 * is produced by stripping group H in the mapper.
 */
export const userPropertiesSchema = z.object({
  userId: z.string(),
  ...profileDetailsShape,
  ...lifecycleShape,
  ...engagementShape,
  ...satisfactionShape,
  ...acquisitionShape,
  ...behaviorShape,
  ...consentShape,
  ...internalShape,
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

export type UserProperties = z.infer<typeof userPropertiesSchema>;

/**
 * User-facing projection: everything the user may see about themselves — all
 * groups EXCEPT the admin-only internal (H) block.
 */
export const userPropertiesPublicSchema = userPropertiesSchema.omit({
  healthScore: true,
  churnRiskScore: true,
  internalSegments: true,
  adminNotes: true,
});

export type UserPropertiesPublic = z.infer<typeof userPropertiesPublicSchema>;

// ── Write-path input schemas ────────────────────────────────────────────────

/** A + G(opt-ins): the fields a user may edit about themselves. */
export const userProfileDetailsUpdateInputSchema = z.object({
  jobTitle: profileDetailsShape.jobTitle,
  organization: profileDetailsShape.organization,
  country: profileDetailsShape.country,
  region: profileDetailsShape.region,
  timezone: profileDetailsShape.timezone,
  bio: profileDetailsShape.bio,
  marketingOptIn: consentShape.marketingOptIn,
  productUpdatesOptIn: consentShape.productUpdatesOptIn,
  researchParticipationOptIn: consentShape.researchParticipationOptIn,
});

export type UserProfileDetailsUpdateInput = z.infer<typeof userProfileDetailsUpdateInputSchema>;

/** D: a satisfaction submission. At least one of NPS / CSAT must be provided. */
export const userSatisfactionInputSchema = z
  .object({
    npsScore: satisfactionShape.npsScore,
    csatScore: satisfactionShape.csatScore,
    satisfactionNotes: satisfactionShape.satisfactionNotes,
  })
  .refine((value) => value.npsScore !== null || value.csatScore !== null, {
    message: 'Provide an NPS or CSAT rating.',
    path: ['npsScore'],
  });

export type UserSatisfactionInput = z.infer<typeof userSatisfactionInputSchema>;

/** E: first-touch acquisition capture (write-once). */
export const userAcquisitionInputSchema = z.object({
  acquisitionSource: acquisitionShape.acquisitionSource,
  acquisitionMedium: acquisitionShape.acquisitionMedium,
  acquisitionCampaign: acquisitionShape.acquisitionCampaign,
  referralCode: acquisitionShape.referralCode,
  landingPage: acquisitionShape.landingPage,
});

export type UserAcquisitionInput = z.infer<typeof userAcquisitionInputSchema>;

/** C: engagement aggregates written by a refresh job. */
export const userEngagementAggregatesInputSchema = z.object({
  totalSessions: engagementShape.totalSessions,
  totalActiveDays: engagementShape.totalActiveDays,
  streakDays: engagementShape.streakDays,
  totalSimulationOrders: engagementShape.totalSimulationOrders,
  featureAdoption: engagementShape.featureAdoption,
  lastActiveAt: lifecycleShape.lastActiveAt,
});

export type UserEngagementAggregatesInput = z.infer<typeof userEngagementAggregatesInputSchema>;

/** F: behavior aggregates written by a refresh job. */
export const userBehaviorAggregatesInputSchema = z.object({
  riskAppetite: behaviorShape.riskAppetite,
  preferredAssetScope: behaviorShape.preferredAssetScope,
  mostTradedAssetClass: behaviorShape.mostTradedAssetClass,
  avgPositionSizeUsd: behaviorShape.avgPositionSizeUsd,
});

export type UserBehaviorAggregatesInput = z.infer<typeof userBehaviorAggregatesInputSchema>;

/** B + H: fields an admin (manage_users) may set. */
export const adminUserPropertiesUpdateInputSchema = z.object({
  userId: z.string().uuid('A valid user id is required.'),
  lifecycleStage: lifecycleShape.lifecycleStage,
  maturityTier: lifecycleShape.maturityTier,
  healthScore: internalShape.healthScore,
  churnRiskScore: internalShape.churnRiskScore,
  internalSegments: internalShape.internalSegments,
  adminNotes: internalShape.adminNotes,
});

export type AdminUserPropertiesUpdateInput = z.infer<typeof adminUserPropertiesUpdateInputSchema>;

// ── Helpers ─────────────────────────────────────────────────────────────────

/** D: canonical NPS bucket derivation (0–6 detractor, 7–8 passive, 9–10 promoter). */
export function deriveNpsCategory(score: number | null): UserProperties['npsCategory'] {
  if (score === null || Number.isNaN(score)) {
    return null;
  }
  if (score >= 9) {
    return 'promoter';
  }
  if (score >= 7) {
    return 'passive';
  }
  return 'detractor';
}

/**
 * A fully-defaulted property record for a user with no persisted row. Numeric
 * aggregates default to 0, collections to empty, consent to opt-out (privacy by
 * default), everything else to null.
 */
export function createDefaultUserProperties(userId: string): UserProperties {
  return {
    userId,
    jobTitle: null,
    organization: null,
    country: null,
    region: null,
    timezone: null,
    bio: null,
    lifecycleStage: null,
    maturityTier: null,
    onboardingCompletedAt: null,
    firstSimulationAt: null,
    activatedAt: null,
    lastActiveAt: null,
    totalSessions: 0,
    totalActiveDays: 0,
    streakDays: 0,
    totalSimulationOrders: 0,
    featureAdoption: {},
    aggregatesRefreshedAt: null,
    npsScore: null,
    npsCategory: null,
    npsSubmittedAt: null,
    csatScore: null,
    csatSubmittedAt: null,
    satisfactionNotes: null,
    acquisitionSource: null,
    acquisitionMedium: null,
    acquisitionCampaign: null,
    referralCode: null,
    landingPage: null,
    firstTouchAt: null,
    riskAppetite: null,
    preferredAssetScope: null,
    mostTradedAssetClass: null,
    avgPositionSizeUsd: null,
    behaviorRefreshedAt: null,
    marketingOptIn: false,
    productUpdatesOptIn: false,
    researchParticipationOptIn: false,
    termsAcceptedVersion: null,
    termsAcceptedAt: null,
    privacyPolicyVersion: null,
    consentUpdatedAt: null,
    healthScore: null,
    churnRiskScore: null,
    internalSegments: [],
    adminNotes: null,
    createdAt: null,
    updatedAt: null,
  };
}

/** Strip the admin-only (H) block to produce a user-facing projection. */
export function toPublicUserProperties(properties: UserProperties): UserPropertiesPublic {
  const {
    healthScore: _healthScore,
    churnRiskScore: _churnRiskScore,
    internalSegments: _internalSegments,
    adminNotes: _adminNotes,
    ...rest
  } = properties;
  return rest;
}
