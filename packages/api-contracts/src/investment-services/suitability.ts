import { z } from 'zod';
import { investmentEvidenceSchema } from './provenance';

/** Suitability outcome. Note there is no numeric suitability "score" — by design. */
export const assessmentStatusSchema = z.enum([
  'suitable',
  'conditionally_suitable',
  'not_suitable',
  'insufficient_information',
]);
export type AssessmentStatus = z.infer<typeof assessmentStatusSchema>;

export const suitabilityDimensionSchema = z.enum([
  'objective',
  'horizon',
  'risk',
  'loss_capacity',
  'knowledge',
  'experience',
  'liquidity',
  'portfolio',
  'sustainability',
  'complexity',
]);
export type SuitabilityDimension = z.infer<typeof suitabilityDimensionSchema>;

export const dimensionVerdictKindSchema = z.enum(['fit', 'partial', 'mismatch', 'unknown']);
export type DimensionVerdictKind = z.infer<typeof dimensionVerdictKindSchema>;

export const dimensionVerdictSchema = z.object({
  dimension: suitabilityDimensionSchema,
  verdict: dimensionVerdictKindSchema,
  reason: z.string(),
  ruleId: z.string().nullable(),
});
export type DimensionVerdict = z.infer<typeof dimensionVerdictSchema>;

/**
 * A full suitability assessment. Carries reasons, warnings, missing information,
 * the rule ids applied, the policy version and evidence — so the result is
 * explainable and auditable. `confidence` is nullable and only populated where a
 * confidence value has a defensible meaning.
 */
export const suitabilityResultSchema = z.object({
  status: assessmentStatusSchema,
  dimensions: z.array(dimensionVerdictSchema),
  reasons: z.array(z.string()),
  warnings: z.array(z.string()),
  missingInformation: z.array(z.string()),
  evidence: z.array(investmentEvidenceSchema),
  ruleIds: z.array(z.string()),
  policyVersion: z.string(),
  assessedAt: z.string(),
  confidence: z.number().min(0).max(1).nullable(),
});
export type SuitabilityResult = z.infer<typeof suitabilityResultSchema>;

/**
 * Appropriateness is a DIFFERENT question from suitability: does the investor
 * have enough knowledge/experience to understand this instrument type and its
 * risks — irrespective of whether it fits their goals or finances.
 */
export const appropriatenessStatusSchema = z.enum([
  'appropriate',
  'not_appropriate',
  'insufficient_information',
  'not_required',
]);
export type AppropriatenessStatus = z.infer<typeof appropriatenessStatusSchema>;

export const appropriatenessResultSchema = z.object({
  status: appropriatenessStatusSchema,
  reasons: z.array(z.string()),
  warnings: z.array(z.string()),
  missingInformation: z.array(z.string()),
  evidence: z.array(investmentEvidenceSchema),
  ruleIds: z.array(z.string()),
  policyVersion: z.string(),
  assessedAt: z.string(),
});
export type AppropriatenessResult = z.infer<typeof appropriatenessResultSchema>;
