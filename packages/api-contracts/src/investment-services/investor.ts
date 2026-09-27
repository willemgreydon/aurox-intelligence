import { z } from 'zod';
import { moneyCurrencySchema } from './money';
import { investmentEvidenceSchema } from './provenance';

/**
 * REGULATORY client classification (MiFID). Kept explicitly separate from a
 * broker's own tiering and from the Aurox application role — a user being an
 * "operator" in the app says nothing about their regulatory category.
 */
export const investorClientCategorySchema = z.enum([
  'retail',
  'professional',
  'eligible_counterparty',
]);
export type InvestorClientCategory = z.infer<typeof investorClientCategorySchema>;

export const knowledgeLevelSchema = z.enum(['none', 'basic', 'informed', 'advanced', 'expert']);
export type KnowledgeLevel = z.infer<typeof knowledgeLevelSchema>;

export const experienceLevelSchema = z.enum(['none', 'limited', 'moderate', 'extensive']);
export type ExperienceLevel = z.infer<typeof experienceLevelSchema>;

export const investmentObjectiveSchema = z.enum([
  'preservation',
  'income',
  'balanced',
  'growth',
  'speculation',
]);
export type InvestmentObjective = z.infer<typeof investmentObjectiveSchema>;

export const investmentHorizonSchema = z.enum(['short', 'medium', 'long']);
export type InvestmentHorizon = z.infer<typeof investmentHorizonSchema>;

/**
 * WILLINGNESS to take risk (a preference). CRITICAL: this is modelled
 * independently from `lossBearingCapacity` — a client can be willing to take
 * high risk while being financially unable to absorb losses, and vice versa.
 */
export const riskToleranceSchema = z.enum(['very_low', 'low', 'moderate', 'high', 'very_high']);
export type RiskTolerance = z.infer<typeof riskToleranceSchema>;

/** ABILITY to absorb losses (a financial fact), distinct from willingness. */
export const lossBearingCapacitySchema = z.enum([
  'none',
  'limited',
  'moderate',
  'substantial',
  'full',
]);
export type LossBearingCapacity = z.infer<typeof lossBearingCapacitySchema>;

export const sustainabilityPreferenceStrengthSchema = z.enum(['none', 'considered', 'preferred', 'required']);
export type SustainabilityPreferenceStrength = z.infer<typeof sustainabilityPreferenceStrengthSchema>;

/** Investor-side sustainability preferences (kept separate from instrument ESG data). */
export const investorSustainabilityPreferencesSchema = z.object({
  strength: sustainabilityPreferenceStrengthSchema,
  minSustainableInvestmentShare: z.number().min(0).max(1).nullable(),
  considerPrincipalAdverseImpacts: z.boolean().nullable(),
  exclusions: z.array(z.string()),
});
export type InvestorSustainabilityPreferences = z.infer<typeof investorSustainabilityPreferencesSchema>;

/** Financial situation snapshot — all optional/nullable, never guessed. */
export const investorFinancialSituationSchema = z.object({
  regularIncome: z.number().nullable(),
  investableAssets: z.number().nullable(),
  liabilities: z.number().nullable(),
  liquidityReserveRequirement: z.number().nullable(),
});
export type InvestorFinancialSituation = z.infer<typeof investorFinancialSituationSchema>;

/**
 * Canonical, VERSIONED investor profile. Never mutate a historical profile in
 * place: a decision made against version N must remain reproducible even after
 * the client updates to version N+1. `investorRef` links to the auth user id but
 * this record lives in the Investment Services domain, not the auth table.
 */
export const investorProfileSchema = z.object({
  profileId: z.string(),
  investorRef: z.string(),
  version: z.number().int().positive(),
  effectiveDate: z.string(),
  lastReviewedAt: z.string().nullable(),
  clientCategory: investorClientCategorySchema,
  brokerClassification: z.string().nullable(),
  taxResidency: z.string().nullable(), // ISO-3166 alpha-2
  baseCurrency: moneyCurrencySchema,
  financialSituation: investorFinancialSituationSchema,
  objective: investmentObjectiveSchema.nullable(),
  strategy: z.string().nullable(),
  horizon: investmentHorizonSchema.nullable(),
  riskTolerance: riskToleranceSchema.nullable(),
  lossBearingCapacity: lossBearingCapacitySchema.nullable(),
  knowledge: knowledgeLevelSchema.nullable(),
  experience: experienceLevelSchema.nullable(),
  instrumentExperience: z.record(z.string(), experienceLevelSchema),
  sustainabilityPreferences: investorSustainabilityPreferencesSchema.nullable(),
  completeness: z.number().min(0).max(1),
  provenance: z.array(investmentEvidenceSchema),
});
export type InvestorProfile = z.infer<typeof investorProfileSchema>;

/**
 * The fields a caller supplies when appending a new profile version. `profileId`
 * and `version` are assigned server-side by the repository (append-only), so a
 * caller can never overwrite a historical version by re-specifying them.
 */
export const investorProfileInputSchema = investorProfileSchema.omit({
  profileId: true,
  version: true,
});
export type InvestorProfileInput = z.infer<typeof investorProfileInputSchema>;
