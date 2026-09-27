import { z } from 'zod';
import { moneySchema } from './money';

/** Every distinct cost the domain can attribute to a position or transaction. */
export const costCategorySchema = z.enum([
  'broker_commission',
  'venue_fee',
  'clearing_fee',
  'settlement_fee',
  'custody_fee',
  'account_fee',
  'product_management_fee',
  'product_expense_ratio',
  'performance_fee',
  'spread',
  'slippage',
  'market_impact',
  'fx_spread',
  'fx_commission',
  'tax',
  'withholding_tax',
  'financing_cost',
  'borrowing_cost',
  'embedded_derivative_cost',
  'entry_cost',
  'exit_cost',
  'transfer_cost',
]);
export type CostCategory = z.infer<typeof costCategorySchema>;

/**
 * A cost component tagged along the four canonical axes required for MiFID-style
 * ex-ante / ex-post cost disclosure:
 *   explicit vs implicit · one-off vs recurring · service vs product ·
 *   estimated vs actual · ex-ante vs ex-post.
 */
export const costComponentSchema = z.object({
  category: costCategorySchema,
  amount: moneySchema,
  explicit: z.boolean(),
  recurring: z.boolean(),
  productLevel: z.boolean(), // true = product cost, false = service cost
  estimated: z.boolean(), // true = estimated, false = actual
  exAnte: z.boolean(), // true = ex-ante projection, false = ex-post realised
  label: z.string().nullable(),
});
export type CostComponent = z.infer<typeof costComponentSchema>;

/**
 * A canonical cost breakdown with pre-aggregated totals and the gross → net
 * return chain. `netBeforeTax` and `netAfterTax` are kept separate so tax is
 * never silently folded into service/product costs.
 */
export const costBreakdownSchema = z.object({
  currency: moneySchema.shape.currency,
  components: z.array(costComponentSchema),
  totalExplicit: moneySchema,
  totalImplicit: moneySchema,
  totalOneOff: moneySchema,
  totalRecurring: moneySchema,
  totalServiceCost: moneySchema,
  totalProductCost: moneySchema,
  totalCost: moneySchema,
  grossReturn: moneySchema.nullable(),
  costImpact: moneySchema,
  netBeforeTaxReturn: moneySchema.nullable(),
  netAfterTaxReturn: moneySchema.nullable(),
});
export type CostBreakdown = z.infer<typeof costBreakdownSchema>;
