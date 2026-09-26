import type {
  AdminUserPropertiesUpdateInput,
  UserBehaviorAggregatesInput,
  UserEngagementAggregatesInput,
  UserAcquisitionInput,
  UserProfileDetailsUpdateInput,
  UserProperties,
  UserSatisfactionInput,
} from '@repo/api-contracts';
import {
  createDefaultUserProperties,
  deriveNpsCategory,
  userPropertiesSchema,
} from '@repo/api-contracts';
import { createDatabaseClient, type DatabaseClient } from '../client';

const userPropertiesTable = 'app.user_properties';

type UserPropertiesRow = Record<string, unknown>;

const SELECT_COLUMNS = `
  user_id as "userId",
  job_title as "jobTitle",
  organization,
  country,
  region,
  timezone,
  bio,
  lifecycle_stage as "lifecycleStage",
  maturity_tier as "maturityTier",
  onboarding_completed_at as "onboardingCompletedAt",
  first_simulation_at as "firstSimulationAt",
  activated_at as "activatedAt",
  last_active_at as "lastActiveAt",
  total_sessions as "totalSessions",
  total_active_days as "totalActiveDays",
  streak_days as "streakDays",
  total_simulation_orders as "totalSimulationOrders",
  feature_adoption as "featureAdoption",
  aggregates_refreshed_at as "aggregatesRefreshedAt",
  nps_score as "npsScore",
  nps_category as "npsCategory",
  nps_submitted_at as "npsSubmittedAt",
  csat_score as "csatScore",
  csat_submitted_at as "csatSubmittedAt",
  satisfaction_notes as "satisfactionNotes",
  acquisition_source as "acquisitionSource",
  acquisition_medium as "acquisitionMedium",
  acquisition_campaign as "acquisitionCampaign",
  referral_code as "referralCode",
  landing_page as "landingPage",
  first_touch_at as "firstTouchAt",
  risk_appetite as "riskAppetite",
  preferred_asset_scope as "preferredAssetScope",
  most_traded_asset_class as "mostTradedAssetClass",
  avg_position_size_usd as "avgPositionSizeUsd",
  behavior_refreshed_at as "behaviorRefreshedAt",
  marketing_opt_in as "marketingOptIn",
  product_updates_opt_in as "productUpdatesOptIn",
  research_participation_opt_in as "researchParticipationOptIn",
  terms_accepted_version as "termsAcceptedVersion",
  terms_accepted_at as "termsAcceptedAt",
  privacy_policy_version as "privacyPolicyVersion",
  consent_updated_at as "consentUpdatedAt",
  health_score as "healthScore",
  churn_risk_score as "churnRiskScore",
  internal_segments as "internalSegments",
  admin_notes as "adminNotes",
  created_at as "createdAt",
  updated_at as "updatedAt"
`;

function toIsoOrNull(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  return null;
}

/** postgres.js returns numeric(…) as string and int4 as number — normalize both. */
function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toIntOrZero(value: unknown): number {
  const parsed = toNumberOrNull(value);
  return parsed === null ? 0 : Math.trunc(parsed);
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string');
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === 'string') : [];
    } catch {
      return [];
    }
  }
  return [];
}

function toNumberRecord(value: unknown): Record<string, number> {
  const source =
    typeof value === 'string'
      ? (() => {
          try {
            return JSON.parse(value) as unknown;
          } catch {
            return null;
          }
        })()
      : value;

  if (typeof source !== 'object' || source === null || Array.isArray(source)) {
    return {};
  }

  const result: Record<string, number> = {};
  for (const [key, raw] of Object.entries(source as Record<string, unknown>)) {
    const parsed = toNumberOrNull(raw);
    if (parsed !== null) {
      result[key] = parsed;
    }
  }
  return result;
}

function mapRow(userId: string, row: UserPropertiesRow | undefined): UserProperties {
  if (!row) {
    return createDefaultUserProperties(userId);
  }

  return userPropertiesSchema.parse({
    userId: (row.userId as string) ?? userId,
    jobTitle: (row.jobTitle as string | null) ?? null,
    organization: (row.organization as string | null) ?? null,
    country: (row.country as string | null) ?? null,
    region: (row.region as string | null) ?? null,
    timezone: (row.timezone as string | null) ?? null,
    bio: (row.bio as string | null) ?? null,
    lifecycleStage: (row.lifecycleStage as UserProperties['lifecycleStage']) ?? null,
    maturityTier: (row.maturityTier as UserProperties['maturityTier']) ?? null,
    onboardingCompletedAt: toIsoOrNull(row.onboardingCompletedAt),
    firstSimulationAt: toIsoOrNull(row.firstSimulationAt),
    activatedAt: toIsoOrNull(row.activatedAt),
    lastActiveAt: toIsoOrNull(row.lastActiveAt),
    totalSessions: toIntOrZero(row.totalSessions),
    totalActiveDays: toIntOrZero(row.totalActiveDays),
    streakDays: toIntOrZero(row.streakDays),
    totalSimulationOrders: toIntOrZero(row.totalSimulationOrders),
    featureAdoption: toNumberRecord(row.featureAdoption),
    aggregatesRefreshedAt: toIsoOrNull(row.aggregatesRefreshedAt),
    npsScore: toNumberOrNull(row.npsScore),
    npsCategory: (row.npsCategory as UserProperties['npsCategory']) ?? null,
    npsSubmittedAt: toIsoOrNull(row.npsSubmittedAt),
    csatScore: toNumberOrNull(row.csatScore),
    csatSubmittedAt: toIsoOrNull(row.csatSubmittedAt),
    satisfactionNotes: (row.satisfactionNotes as string | null) ?? null,
    acquisitionSource: (row.acquisitionSource as string | null) ?? null,
    acquisitionMedium: (row.acquisitionMedium as string | null) ?? null,
    acquisitionCampaign: (row.acquisitionCampaign as string | null) ?? null,
    referralCode: (row.referralCode as string | null) ?? null,
    landingPage: (row.landingPage as string | null) ?? null,
    firstTouchAt: toIsoOrNull(row.firstTouchAt),
    riskAppetite: (row.riskAppetite as UserProperties['riskAppetite']) ?? null,
    preferredAssetScope: (row.preferredAssetScope as UserProperties['preferredAssetScope']) ?? null,
    mostTradedAssetClass: (row.mostTradedAssetClass as UserProperties['mostTradedAssetClass']) ?? null,
    avgPositionSizeUsd: toNumberOrNull(row.avgPositionSizeUsd),
    behaviorRefreshedAt: toIsoOrNull(row.behaviorRefreshedAt),
    marketingOptIn: Boolean(row.marketingOptIn),
    productUpdatesOptIn: Boolean(row.productUpdatesOptIn),
    researchParticipationOptIn: Boolean(row.researchParticipationOptIn),
    termsAcceptedVersion: (row.termsAcceptedVersion as string | null) ?? null,
    termsAcceptedAt: toIsoOrNull(row.termsAcceptedAt),
    privacyPolicyVersion: (row.privacyPolicyVersion as string | null) ?? null,
    consentUpdatedAt: toIsoOrNull(row.consentUpdatedAt),
    healthScore: toNumberOrNull(row.healthScore),
    churnRiskScore: toNumberOrNull(row.churnRiskScore),
    internalSegments: toStringArray(row.internalSegments),
    adminNotes: (row.adminNotes as string | null) ?? null,
    createdAt: toIsoOrNull(row.createdAt),
    updatedAt: toIsoOrNull(row.updatedAt),
  });
}

function isMissingUserPropertiesSchemaError(error: unknown) {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false;
  }
  const databaseError = error as { code?: string };
  // 42P01 = undefined_table, 42703 = undefined_column — the migration has not
  // been applied yet; degrade to defaults rather than crash the read path.
  return databaseError.code === '42P01' || databaseError.code === '42703';
}

function getConfiguredClient(): DatabaseClient | null {
  const client = createDatabaseClient();
  return client.isConfigured ? client : null;
}

async function readWithClient(client: DatabaseClient, userId: string): Promise<UserProperties> {
  const rows = await client.query<UserPropertiesRow>(
    `select ${SELECT_COLUMNS} from ${userPropertiesTable} where user_id = $1 limit 1`,
    [userId],
  );
  return mapRow(userId, rows[0]);
}

export async function getUserProperties(userId: string): Promise<UserProperties> {
  const client = getConfiguredClient();
  if (!client) {
    return createDefaultUserProperties(userId);
  }

  try {
    return await readWithClient(client, userId);
  } catch (error) {
    if (isMissingUserPropertiesSchemaError(error)) {
      return createDefaultUserProperties(userId);
    }
    throw error;
  }
}

/**
 * A compact, admin-facing summary row for the user-management list. Includes the
 * admin-only churn/health signals — this projection is ONLY for admin surfaces.
 */
export type UserPropertiesAdminSummary = {
  userId: string;
  lifecycleStage: UserProperties['lifecycleStage'];
  maturityTier: UserProperties['maturityTier'];
  healthScore: number | null;
  churnRiskScore: number | null;
  npsScore: number | null;
  npsCategory: UserProperties['npsCategory'];
  marketingOptIn: boolean;
};

/**
 * Batched admin read: one query for many users (avoids N+1 on the admin list).
 * Users with no property row are simply absent from the result map.
 */
export async function listUserPropertiesAdminSummaries(
  userIds: readonly string[],
): Promise<Map<string, UserPropertiesAdminSummary>> {
  const result = new Map<string, UserPropertiesAdminSummary>();
  if (userIds.length === 0) {
    return result;
  }

  const client = getConfiguredClient();
  if (!client) {
    return result;
  }

  // Explicit placeholder list ($1,$2,…): postgres.js `unsafe` binds each id as a
  // separate positional string param — avoids array-parameter ambiguity.
  const placeholders = userIds.map((_, index) => `$${index + 1}`).join(', ');

  try {
    const rows = await client.query<UserPropertiesRow>(
      `
        select
          user_id as "userId",
          lifecycle_stage as "lifecycleStage",
          maturity_tier as "maturityTier",
          health_score as "healthScore",
          churn_risk_score as "churnRiskScore",
          nps_score as "npsScore",
          nps_category as "npsCategory",
          marketing_opt_in as "marketingOptIn"
        from ${userPropertiesTable}
        where user_id in (${placeholders})
      `,
      [...userIds],
    );

    for (const row of rows) {
      const userId = row.userId as string;
      result.set(userId, {
        userId,
        lifecycleStage: (row.lifecycleStage as UserProperties['lifecycleStage']) ?? null,
        maturityTier: (row.maturityTier as UserProperties['maturityTier']) ?? null,
        healthScore: toNumberOrNull(row.healthScore),
        churnRiskScore: toNumberOrNull(row.churnRiskScore),
        npsScore: toNumberOrNull(row.npsScore),
        npsCategory: (row.npsCategory as UserProperties['npsCategory']) ?? null,
        marketingOptIn: Boolean(row.marketingOptIn),
      });
    }
  } catch (error) {
    if (isMissingUserPropertiesSchemaError(error)) {
      return result;
    }
    throw error;
  }

  return result;
}

/** A + G(opt-ins): user-editable profile details and marketing consent. */
export async function upsertUserProfileDetails(
  userId: string,
  input: UserProfileDetailsUpdateInput,
): Promise<UserProperties> {
  const client = getConfiguredClient();
  if (!client) {
    return { ...createDefaultUserProperties(userId), ...input, consentUpdatedAt: null };
  }

  try {
    return await client.transaction(async (tx) => {
      await tx.execute(
        `
          insert into ${userPropertiesTable} (
            user_id, job_title, organization, country, region, timezone, bio,
            marketing_opt_in, product_updates_opt_in, research_participation_opt_in, consent_updated_at
          ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
          on conflict (user_id) do update set
            job_title = excluded.job_title,
            organization = excluded.organization,
            country = excluded.country,
            region = excluded.region,
            timezone = excluded.timezone,
            bio = excluded.bio,
            marketing_opt_in = excluded.marketing_opt_in,
            product_updates_opt_in = excluded.product_updates_opt_in,
            research_participation_opt_in = excluded.research_participation_opt_in,
            consent_updated_at = now(),
            updated_at = now()
        `,
        [
          userId,
          input.jobTitle,
          input.organization,
          input.country,
          input.region,
          input.timezone,
          input.bio,
          input.marketingOptIn,
          input.productUpdatesOptIn,
          input.researchParticipationOptIn,
        ],
      );

      const rows = await tx.query<UserPropertiesRow>(
        `select ${SELECT_COLUMNS} from ${userPropertiesTable} where user_id = $1 limit 1`,
        [userId],
      );
      return mapRow(userId, rows[0]);
    });
  } catch (error) {
    if (isMissingUserPropertiesSchemaError(error)) {
      return { ...createDefaultUserProperties(userId), ...input, consentUpdatedAt: null };
    }
    throw error;
  }
}

/** D: record a CSAT / NPS submission; NPS category is derived deterministically. */
export async function recordUserSatisfaction(
  userId: string,
  input: UserSatisfactionInput,
): Promise<UserProperties> {
  const npsCategory = deriveNpsCategory(input.npsScore);
  const client = getConfiguredClient();
  if (!client) {
    return {
      ...createDefaultUserProperties(userId),
      npsScore: input.npsScore,
      npsCategory,
      csatScore: input.csatScore,
      satisfactionNotes: input.satisfactionNotes,
    };
  }

  try {
    return await client.transaction(async (tx) => {
      await tx.execute(
        `
          insert into ${userPropertiesTable} (
            user_id,
            nps_score, nps_category, nps_submitted_at,
            csat_score, csat_submitted_at,
            satisfaction_notes
          ) values (
            $1,
            $2, $3, case when $2 is null then null else now() end,
            $4, case when $4 is null then null else now() end,
            $5
          )
          on conflict (user_id) do update set
            nps_score = coalesce(excluded.nps_score, ${userPropertiesTable}.nps_score),
            nps_category = coalesce(excluded.nps_category, ${userPropertiesTable}.nps_category),
            nps_submitted_at = case when excluded.nps_score is null then ${userPropertiesTable}.nps_submitted_at else now() end,
            csat_score = coalesce(excluded.csat_score, ${userPropertiesTable}.csat_score),
            csat_submitted_at = case when excluded.csat_score is null then ${userPropertiesTable}.csat_submitted_at else now() end,
            satisfaction_notes = coalesce(excluded.satisfaction_notes, ${userPropertiesTable}.satisfaction_notes),
            updated_at = now()
        `,
        [userId, input.npsScore, npsCategory, input.csatScore, input.satisfactionNotes],
      );

      const rows = await tx.query<UserPropertiesRow>(
        `select ${SELECT_COLUMNS} from ${userPropertiesTable} where user_id = $1 limit 1`,
        [userId],
      );
      return mapRow(userId, rows[0]);
    });
  } catch (error) {
    if (isMissingUserPropertiesSchemaError(error)) {
      return {
        ...createDefaultUserProperties(userId),
        npsScore: input.npsScore,
        npsCategory,
        csatScore: input.csatScore,
        satisfactionNotes: input.satisfactionNotes,
      };
    }
    throw error;
  }
}

/** B + H: admin (manage_users) lifecycle / maturity / internal DS fields. */
export async function updateUserPropertiesByAdmin(
  input: AdminUserPropertiesUpdateInput,
): Promise<UserProperties> {
  const client = getConfiguredClient();
  if (!client) {
    return {
      ...createDefaultUserProperties(input.userId),
      lifecycleStage: input.lifecycleStage,
      maturityTier: input.maturityTier,
      healthScore: input.healthScore,
      churnRiskScore: input.churnRiskScore,
      internalSegments: input.internalSegments,
      adminNotes: input.adminNotes,
    };
  }

  return client.transaction(async (tx) => {
    await tx.execute(
      `
        insert into ${userPropertiesTable} (
          user_id, lifecycle_stage, maturity_tier,
          health_score, churn_risk_score, internal_segments, admin_notes
        ) values ($1, $2, $3, $4, $5, $6::jsonb, $7)
        on conflict (user_id) do update set
          lifecycle_stage = excluded.lifecycle_stage,
          maturity_tier = excluded.maturity_tier,
          health_score = excluded.health_score,
          churn_risk_score = excluded.churn_risk_score,
          internal_segments = excluded.internal_segments,
          admin_notes = excluded.admin_notes,
          updated_at = now()
      `,
      [
        input.userId,
        input.lifecycleStage,
        input.maturityTier,
        input.healthScore,
        input.churnRiskScore,
        JSON.stringify(input.internalSegments),
        input.adminNotes,
      ],
    );

    const rows = await tx.query<UserPropertiesRow>(
      `select ${SELECT_COLUMNS} from ${userPropertiesTable} where user_id = $1 limit 1`,
      [input.userId],
    );
    return mapRow(input.userId, rows[0]);
  });
}

/**
 * E: first-touch acquisition capture. Write-once — existing attribution is
 * preserved via coalesce so a later touch never overwrites the first.
 */
export async function captureUserAcquisition(userId: string, input: UserAcquisitionInput): Promise<void> {
  const client = getConfiguredClient();
  if (!client) {
    return;
  }

  try {
    await client.execute(
      `
        insert into ${userPropertiesTable} (
          user_id, acquisition_source, acquisition_medium, acquisition_campaign,
          referral_code, landing_page, first_touch_at
        ) values ($1, $2, $3, $4, $5, $6, now())
        on conflict (user_id) do update set
          acquisition_source = coalesce(${userPropertiesTable}.acquisition_source, excluded.acquisition_source),
          acquisition_medium = coalesce(${userPropertiesTable}.acquisition_medium, excluded.acquisition_medium),
          acquisition_campaign = coalesce(${userPropertiesTable}.acquisition_campaign, excluded.acquisition_campaign),
          referral_code = coalesce(${userPropertiesTable}.referral_code, excluded.referral_code),
          landing_page = coalesce(${userPropertiesTable}.landing_page, excluded.landing_page),
          first_touch_at = coalesce(${userPropertiesTable}.first_touch_at, excluded.first_touch_at),
          updated_at = now()
      `,
      [
        userId,
        input.acquisitionSource,
        input.acquisitionMedium,
        input.acquisitionCampaign,
        input.referralCode,
        input.landingPage,
      ],
    );
  } catch (error) {
    if (isMissingUserPropertiesSchemaError(error)) {
      return;
    }
    throw error;
  }
}

/** C: engagement aggregates written by a background refresh job. */
export async function saveUserEngagementAggregates(
  userId: string,
  input: UserEngagementAggregatesInput,
): Promise<void> {
  const client = getConfiguredClient();
  if (!client) {
    return;
  }

  try {
    await client.execute(
      `
        insert into ${userPropertiesTable} (
          user_id, total_sessions, total_active_days, streak_days,
          total_simulation_orders, feature_adoption, last_active_at, aggregates_refreshed_at
        ) values ($1, $2, $3, $4, $5, $6::jsonb, $7, now())
        on conflict (user_id) do update set
          total_sessions = excluded.total_sessions,
          total_active_days = excluded.total_active_days,
          streak_days = excluded.streak_days,
          total_simulation_orders = excluded.total_simulation_orders,
          feature_adoption = excluded.feature_adoption,
          last_active_at = coalesce(excluded.last_active_at, ${userPropertiesTable}.last_active_at),
          aggregates_refreshed_at = now(),
          updated_at = now()
      `,
      [
        userId,
        input.totalSessions,
        input.totalActiveDays,
        input.streakDays,
        input.totalSimulationOrders,
        JSON.stringify(input.featureAdoption),
        input.lastActiveAt,
      ],
    );
  } catch (error) {
    if (isMissingUserPropertiesSchemaError(error)) {
      return;
    }
    throw error;
  }
}

/** F: simulation-behavior aggregates written by a background refresh job. */
export async function saveUserBehaviorAggregates(
  userId: string,
  input: UserBehaviorAggregatesInput,
): Promise<void> {
  const client = getConfiguredClient();
  if (!client) {
    return;
  }

  try {
    await client.execute(
      `
        insert into ${userPropertiesTable} (
          user_id, risk_appetite, preferred_asset_scope,
          most_traded_asset_class, avg_position_size_usd, behavior_refreshed_at
        ) values ($1, $2, $3, $4, $5, now())
        on conflict (user_id) do update set
          risk_appetite = excluded.risk_appetite,
          preferred_asset_scope = excluded.preferred_asset_scope,
          most_traded_asset_class = excluded.most_traded_asset_class,
          avg_position_size_usd = excluded.avg_position_size_usd,
          behavior_refreshed_at = now(),
          updated_at = now()
      `,
      [
        userId,
        input.riskAppetite,
        input.preferredAssetScope,
        input.mostTradedAssetClass,
        input.avgPositionSizeUsd,
      ],
    );
  } catch (error) {
    if (isMissingUserPropertiesSchemaError(error)) {
      return;
    }
    throw error;
  }
}
