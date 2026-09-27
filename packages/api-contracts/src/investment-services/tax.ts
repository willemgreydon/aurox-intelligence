import { z } from 'zod';
import { moneySchema, rateParPpmSchema } from './money';
import { sourceReferenceSchema } from './provenance';

/**
 * Tax jurisdictions the domain can reason about. Austria (`AT`) is the first
 * implemented jurisdiction. `OTHER` is an explicit "not yet modelled" marker —
 * results for it must degrade to `insufficient_information`, never guess.
 */
export const taxJurisdictionSchema = z.enum(['AT', 'DE', 'US', 'OTHER']);
export type TaxJurisdiction = z.infer<typeof taxJurisdictionSchema>;

/**
 * How an instrument's income/gains are classified FOR TAX PURPOSES. This is
 * deliberately distinct from the market `assetClass` — e.g. bank interest and a
 * securitised capital gain are both "cash income" economically but attract
 * different Austrian rates.
 */
export const taxAssetClassSchema = z.enum([
  'securities_capital_gain', // realised gain on shares / securitised instruments
  'dividend',
  'equity',
  'fund', // funds have distinct AT treatment → handled by a dedicated rule/review
  'crypto',
  'bank_interest', // savings / current-account interest
  'derivative_nonsecuritized',
  'other',
]);
export type TaxAssetClass = z.infer<typeof taxAssetClassSchema>;

/** Broad income category a rule applies within, used for loss-offset grouping. */
export const taxIncomeCategorySchema = z.enum([
  'capital_income_special_rate',
  'bank_interest',
  'business',
  'other',
]);
export type TaxIncomeCategory = z.infer<typeof taxIncomeCategorySchema>;

/** Outcome status of a tax computation — never a silent number. */
export const taxTreatmentStatusSchema = z.enum([
  'calculated',
  'requires_review',
  'insufficient_information',
  'unsupported',
]);
export type TaxTreatmentStatus = z.infer<typeof taxTreatmentStatusSchema>;

/** Defensible confidence band for a tax estimate (no confidence theatre). */
export const taxConfidenceSchema = z.enum(['high', 'moderate', 'low', 'none']);
export type TaxConfidence = z.infer<typeof taxConfidenceSchema>;

/** A rate as integer ppm, plus what it is and which income category it sits in. */
export const taxRateSchema = z.object({
  ratePpm: rateParPpmSchema,
  label: z.string(),
  incomeCategory: taxIncomeCategorySchema,
});
export type TaxRate = z.infer<typeof taxRateSchema>;

/**
 * A single jurisdiction tax rule with temporal validity. Rules are data, never
 * a `const TAX_RATE = 0.275` scattered in code. Effective dating lets the engine
 * pick the rule that applied at a realisation event's date.
 */
export const taxRuleSchema = z.object({
  ruleId: z.string(),
  jurisdiction: taxJurisdictionSchema,
  description: z.string(),
  appliesTo: z.array(taxAssetClassSchema).min(1),
  rate: taxRateSchema,
  effectiveFrom: z.string(), // ISO date
  effectiveUntil: z.string().nullable(), // null = still current
  sourceIds: z.array(z.string()).min(1),
  notes: z.string().nullable(),
});
export type TaxRule = z.infer<typeof taxRuleSchema>;

/**
 * A versioned, source-backed, freshness-aware tax policy for a jurisdiction.
 * `lastVerifiedAt` + `staleAfterDays` make it possible for the runtime to detect
 * "this tax knowledge needs re-verification" WITHOUT any autonomous scraping.
 */
export const taxPolicySchema = z.object({
  policyId: z.string(),
  jurisdiction: taxJurisdictionSchema,
  version: z.string(), // e.g. "AT-2026.1"
  rules: z.array(taxRuleSchema),
  sources: z.array(sourceReferenceSchema),
  publishedAt: z.string(), // ISO date
  lastVerifiedAt: z.string().nullable(),
  staleAfterDays: z.number().int().positive().nullable(),
});
export type TaxPolicy = z.infer<typeof taxPolicySchema>;

/**
 * A tax lot: an acquisition tranche whose remaining quantity can be matched
 * against disposals. Matching method (FIFO / average / etc.) is POLICY-driven,
 * not hardcoded globally.
 */
export const taxLotSchema = z.object({
  lotId: z.string(),
  instrumentSymbol: z.string(),
  jurisdiction: taxJurisdictionSchema,
  taxAssetClass: taxAssetClassSchema,
  acquisitionDate: z.string(),
  acquisitionQuantity: z.number().nonnegative(),
  acquisitionUnitPrice: moneySchema,
  acquisitionCosts: moneySchema,
  remainingQuantity: z.number().nonnegative(),
  currency: z.string(),
  fxProvenance: sourceReferenceSchema.nullable(),
  broker: z.string().nullable(),
});
export type TaxLot = z.infer<typeof taxLotSchema>;

/** A realised, taxable event. */
export const taxEventTypeSchema = z.enum([
  'dividend',
  'realized_gain',
  'realized_loss',
  'interest',
  'withholding',
]);
export type TaxEventType = z.infer<typeof taxEventTypeSchema>;

export const taxEventSchema = z.object({
  eventId: z.string(),
  type: taxEventTypeSchema,
  instrumentSymbol: z.string(),
  taxAssetClass: taxAssetClassSchema,
  incomeCategory: taxIncomeCategorySchema,
  date: z.string(),
  amount: moneySchema, // signed: gains/dividends positive, losses negative
});
export type TaxEvent = z.infer<typeof taxEventSchema>;

/**
 * Input to the tax-reserve engine for a single realised, taxable amount. All
 * money fields must share currency/scale. `unrealizedGain` is accepted only so
 * callers can pass a full economic picture — the engine MUST NOT tax it.
 */
export const taxReserveInputSchema = z.object({
  jurisdiction: taxJurisdictionSchema,
  taxAssetClass: taxAssetClassSchema,
  realizationDate: z.string(), // ISO date of the realisation event
  grossRealizedGain: moneySchema.nullable(), // null → insufficient information
  offsettableLosses: moneySchema.nullable(),
  domesticTaxWithheld: moneySchema.nullable(), // KESt already withheld at source
  foreignWithholdingTax: moneySchema.nullable(),
  creditableForeignWithholding: moneySchema.nullable(),
  unrealizedGain: moneySchema.nullable(), // context only — never taxed here
});
export type TaxReserveInput = z.infer<typeof taxReserveInputSchema>;

/**
 * The full, provenance-carrying result of a tax-reserve computation. The chain
 * grossRealizedGain → taxableGain → lossOffset → adjustedTaxBase → estimatedTax
 * → withheld → remainingLiability → reserve → afterTaxProfit is explicit and can
 * never collapse into a single number.
 */
export const taxReserveResultSchema = z.object({
  jurisdiction: taxJurisdictionSchema,
  taxYear: z.number().int(),
  status: taxTreatmentStatusSchema,
  grossRealizedGain: moneySchema,
  taxableGain: moneySchema,
  lossOffsetApplied: moneySchema,
  adjustedTaxBase: moneySchema,
  appliedRatePpm: z.number().int().nullable(),
  estimatedTax: moneySchema,
  taxAlreadyWithheld: moneySchema,
  creditableWithholding: moneySchema,
  remainingTaxLiability: moneySchema,
  recommendedReserve: moneySchema,
  afterTaxProfit: moneySchema,
  confidence: taxConfidenceSchema,
  assumptions: z.array(z.string()),
  warnings: z.array(z.string()),
  missingInformation: z.array(z.string()),
  policyVersion: z.string().nullable(),
  appliedRuleIds: z.array(z.string()),
  sources: z.array(sourceReferenceSchema),
  computedAt: z.string(),
});
export type TaxReserveResult = z.infer<typeof taxReserveResultSchema>;

/**
 * Portfolio-wide tax view-model contract (section 16 UI seam). Distinguishes
 * economic value, realised vs unrealised, tax already withheld, the recommended
 * reserve and the estimated after-tax wealth — so the UI can never imply the
 * market's paper gain is spendable, tax-settled money.
 */
export const portfolioTaxViewSchema = z.object({
  currency: moneySchema.shape.currency,
  grossPortfolioValue: moneySchema,
  unrealizedPnl: moneySchema,
  realizedPnl: moneySchema,
  estimatedTaxLiability: moneySchema,
  taxAlreadyWithheld: moneySchema,
  taxReserve: moneySchema,
  estimatedAfterTaxWealth: moneySchema,
  status: taxTreatmentStatusSchema,
  computedAt: z.string(),
});
export type PortfolioTaxView = z.infer<typeof portfolioTaxViewSchema>;
