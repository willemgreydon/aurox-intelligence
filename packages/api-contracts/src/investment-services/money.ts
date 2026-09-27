import { z } from 'zod';

/**
 * Currencies the Investment Services domain can express amounts in. This is an
 * allowlist, not the universe of ISO-4217 — extend deliberately (a new currency
 * implies a scale and rounding decision), never by forking this enum elsewhere.
 */
export const moneyCurrencySchema = z.enum(['EUR', 'USD', 'GBP', 'CHF', 'JPY']);
export type MoneyCurrency = z.infer<typeof moneyCurrencySchema>;

/**
 * Decimal-safe money.
 *
 * `minorUnits` is an INTEGER count of the currency's smallest representable
 * unit (e.g. cents for EUR/USD at scale 2). All authoritative monetary
 * arithmetic in this domain is performed on this integer field — never on a
 * binary floating-point amount. `scale` records how many decimal places the
 * minor unit represents so the same value can round-trip to a human decimal
 * without ever introducing float error.
 *
 * Invariant: two Money values may only be combined when both `currency` and
 * `scale` match. FX conversion is an explicit, provenance-carrying operation,
 * not an implicit coercion.
 */
export const moneySchema = z.object({
  minorUnits: z.number().int(),
  currency: moneyCurrencySchema,
  scale: z.number().int().min(0).max(8),
});
export type Money = z.infer<typeof moneySchema>;

/**
 * A tax/interest rate expressed as an integer in parts-per-million (ppm) to
 * keep rate application on the integer path. 27.5% == 275_000 ppm, 25% ==
 * 250_000 ppm. Rates are never stored as floats.
 */
export const rateParPpmSchema = z.number().int().min(0).max(1_000_000);
