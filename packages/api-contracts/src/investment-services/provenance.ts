import { z } from 'zod';

/**
 * Epistemic kind of an intelligence value. The system must never store a fact,
 * a deterministic derivation, a model output, a policy rule, an assessment and
 * a recommendation as indistinguishable "insights".
 */
export const epistemicKindSchema = z.enum([
  'fact', // observed / imported
  'derived_metric', // deterministic transformation of facts
  'model_output', // statistical / model result
  'policy_rule', // jurisdiction / provider rule
  'assessment', // evaluation of data against rules
  'recommendation', // decision-support output
]);
export type EpistemicKind = z.infer<typeof epistemicKindSchema>;

/**
 * Output-intent taxonomy. The enum exists so a later policy layer can reason
 * about behaviour (advice vs information); naming a value does not by itself
 * decide the regulatory status of an output.
 */
export const outputIntentSchema = z.enum([
  'market_information',
  'instrument_information',
  'research',
  'screening',
  'ranking',
  'simulation',
  'portfolio_analysis',
  'personalized_decision_support',
  'recommendation',
]);
export type OutputIntent = z.infer<typeof outputIntentSchema>;

/** Classes of source, ordered loosely from most to least authoritative. */
export const investmentSourceTypeSchema = z.enum([
  'exchange',
  'regulatory_filing',
  'regulator',
  'government',
  'issuer',
  'broker',
  'independent_research',
  'analyst_estimate',
  'news',
  'model_inference',
  'ai_inference',
  'user_input',
  'internal_policy',
]);
export type InvestmentSourceType = z.infer<typeof investmentSourceTypeSchema>;

/**
 * A citable source with temporal validity. Regulatory and tax rules must point
 * at a primary source (BMF, RIS, exchange, filing) — never at a blog treated as
 * canonical. `effectiveFrom`/`effectiveUntil` bound when the referenced rule
 * applies; `verifiedAt` records when a human/agent last confirmed the source.
 */
export const sourceReferenceSchema = z.object({
  sourceId: z.string(),
  authority: z.string(),
  title: z.string(),
  reference: z.string().nullable(), // URL or statutory citation
  jurisdiction: z.string().nullable(), // ISO-3166 alpha-2 where applicable
  sourceType: investmentSourceTypeSchema,
  effectiveFrom: z.string().nullable(), // ISO date
  effectiveUntil: z.string().nullable(), // ISO date, null = open-ended
  retrievedAt: z.string().nullable(),
  verifiedAt: z.string().nullable(),
});
export type SourceReference = z.infer<typeof sourceReferenceSchema>;

/** Freshness / knownness of a critical financial field. Missing data is never zero. */
export const dataQualitySchema = z.enum([
  'known',
  'estimated',
  'stale',
  'unknown',
  'not_applicable',
  'unsupported',
]);
export type DataQuality = z.infer<typeof dataQualitySchema>;

/** A single piece of evidence backing an intelligence claim. */
export const investmentEvidenceSchema = z.object({
  claim: z.string(),
  kind: epistemicKindSchema,
  sources: z.array(sourceReferenceSchema),
  quality: dataQualitySchema,
  asOf: z.string().nullable(),
  notes: z.string().nullable(),
});
export type InvestmentEvidence = z.infer<typeof investmentEvidenceSchema>;
