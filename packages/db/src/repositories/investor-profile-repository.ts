import type { InvestorProfile, InvestorProfileInput } from '@repo/api-contracts';
import { investorProfileSchema } from '@repo/api-contracts';
import { createDatabaseClient } from '../client';

const investorProfilesTable = 'app.investor_profiles';

type Row = Record<string, unknown>;

const SELECT_COLUMNS = `
  profile_id as "profileId",
  investor_ref as "investorRef",
  version,
  effective_date as "effectiveDate",
  last_reviewed_at as "lastReviewedAt",
  client_category as "clientCategory",
  broker_classification as "brokerClassification",
  tax_residency as "taxResidency",
  base_currency as "baseCurrency",
  financial_situation as "financialSituation",
  objective,
  strategy,
  horizon,
  risk_tolerance as "riskTolerance",
  loss_bearing_capacity as "lossBearingCapacity",
  knowledge,
  experience,
  instrument_experience as "instrumentExperience",
  sustainability_preferences as "sustainabilityPreferences",
  completeness::float8 as "completeness",
  provenance
`;

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asObject(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** Parse a persisted row into the validated domain contract. */
function mapRow(row: Row): InvestorProfile {
  const fs = asObject(row.financialSituation);
  return investorProfileSchema.parse({
    profileId: row.profileId,
    investorRef: row.investorRef,
    version: Math.trunc(toNumberOrNull(row.version) ?? 0),
    effectiveDate: row.effectiveDate,
    lastReviewedAt: (row.lastReviewedAt as string | null) ?? null,
    clientCategory: row.clientCategory,
    brokerClassification: (row.brokerClassification as string | null) ?? null,
    taxResidency: (row.taxResidency as string | null) ?? null,
    baseCurrency: row.baseCurrency,
    financialSituation: {
      regularIncome: toNumberOrNull(fs.regularIncome),
      investableAssets: toNumberOrNull(fs.investableAssets),
      liabilities: toNumberOrNull(fs.liabilities),
      liquidityReserveRequirement: toNumberOrNull(fs.liquidityReserveRequirement),
    },
    objective: (row.objective as InvestorProfile['objective']) ?? null,
    strategy: (row.strategy as string | null) ?? null,
    horizon: (row.horizon as InvestorProfile['horizon']) ?? null,
    riskTolerance: (row.riskTolerance as InvestorProfile['riskTolerance']) ?? null,
    lossBearingCapacity: (row.lossBearingCapacity as InvestorProfile['lossBearingCapacity']) ?? null,
    knowledge: (row.knowledge as InvestorProfile['knowledge']) ?? null,
    experience: (row.experience as InvestorProfile['experience']) ?? null,
    instrumentExperience: asObject(row.instrumentExperience),
    sustainabilityPreferences:
      (row.sustainabilityPreferences as InvestorProfile['sustainabilityPreferences']) ?? null,
    completeness: toNumberOrNull(row.completeness) ?? 0,
    provenance: Array.isArray(row.provenance) ? row.provenance : [],
  });
}

/** Latest (highest-version) profile for an investor, or null when none exists. */
export async function getLatestInvestorProfile(investorRef: string): Promise<InvestorProfile | null> {
  const db = createDatabaseClient();
  if (!db.isConfigured) {
    return null;
  }
  const rows = await db.query<Row>(
    `select ${SELECT_COLUMNS} from ${investorProfilesTable} where investor_ref = $1 order by version desc limit 1`,
    [investorRef],
  );
  const row = rows[0];
  return row ? mapRow(row) : null;
}

/** A specific historical version — the reproducibility anchor for past decisions. */
export async function getInvestorProfileVersion(
  investorRef: string,
  version: number,
): Promise<InvestorProfile | null> {
  const db = createDatabaseClient();
  if (!db.isConfigured) {
    return null;
  }
  const rows = await db.query<Row>(
    `select ${SELECT_COLUMNS} from ${investorProfilesTable} where investor_ref = $1 and version = $2 limit 1`,
    [investorRef, Math.trunc(version)],
  );
  const row = rows[0];
  return row ? mapRow(row) : null;
}

/**
 * Append a new profile version. Never mutates an existing row: the next version
 * is computed as max(version)+1 inside a transaction, so concurrent appends do
 * not collide and historical versions stay immutable.
 */
export async function appendInvestorProfileVersion(
  investorRef: string,
  input: InvestorProfileInput,
): Promise<InvestorProfile> {
  const db = createDatabaseClient();
  if (!db.isConfigured) {
    throw new Error('DATABASE_URL is required to append an investor profile version.');
  }

  return db.transaction(async (tx) => {
    const versionRows = await tx.query<{ next: unknown }>(
      `select coalesce(max(version), 0) + 1 as "next" from ${investorProfilesTable} where investor_ref = $1`,
      [investorRef],
    );
    const nextVersion = Math.trunc(toNumberOrNull(versionRows[0]?.next) ?? 1);

    const rows = await tx.query<Row>(
      `insert into ${investorProfilesTable} (
        investor_ref, version, effective_date, last_reviewed_at, client_category,
        broker_classification, tax_residency, base_currency, financial_situation,
        objective, strategy, horizon, risk_tolerance, loss_bearing_capacity, knowledge,
        experience, instrument_experience, sustainability_preferences, completeness, provenance
      ) values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12, $13, $14, $15,
        $16, $17::jsonb, $18::jsonb, $19, $20::jsonb
      )
      returning ${SELECT_COLUMNS}`,
      [
        investorRef,
        nextVersion,
        input.effectiveDate,
        input.lastReviewedAt,
        input.clientCategory,
        input.brokerClassification,
        input.taxResidency,
        input.baseCurrency,
        JSON.stringify(input.financialSituation),
        input.objective,
        input.strategy,
        input.horizon,
        input.riskTolerance,
        input.lossBearingCapacity,
        input.knowledge,
        input.experience,
        JSON.stringify(input.instrumentExperience),
        input.sustainabilityPreferences === null ? null : JSON.stringify(input.sustainabilityPreferences),
        input.completeness,
        JSON.stringify(input.provenance),
      ],
    );

    const row = rows[0];
    if (!row) {
      throw new Error('Investor profile insert returned no row.');
    }
    return mapRow(row);
  });
}
