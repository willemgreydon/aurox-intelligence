import type { Money, TaxLot, TaxLotInput } from '@repo/api-contracts';
import { taxLotSchema } from '@repo/api-contracts';
import { createDatabaseClient } from '../client';

const taxLotsTable = 'app.tax_lots';

type Row = Record<string, unknown>;

const SELECT_COLUMNS = `
  lot_id as "lotId",
  instrument_symbol as "instrumentSymbol",
  jurisdiction,
  tax_asset_class as "taxAssetClass",
  acquisition_date as "acquisitionDate",
  acquisition_quantity::float8 as "acquisitionQuantity",
  acquisition_unit_price_minor as "acquisitionUnitPriceMinor",
  acquisition_costs_minor as "acquisitionCostsMinor",
  currency,
  scale,
  remaining_quantity::float8 as "remainingQuantity",
  fx_provenance as "fxProvenance",
  broker
`;

function toNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapRow(row: Row): TaxLot {
  const currency = row.currency as string;
  const scale = Math.trunc(toNumber(row.scale));
  const money = (minor: unknown): Money => ({
    minorUnits: Math.trunc(toNumber(minor)),
    // currency is validated by taxLotSchema.parse against the Money enum below.
    currency: currency as Money['currency'],
    scale,
  });
  return taxLotSchema.parse({
    lotId: row.lotId,
    instrumentSymbol: row.instrumentSymbol,
    jurisdiction: row.jurisdiction,
    taxAssetClass: row.taxAssetClass,
    acquisitionDate: row.acquisitionDate,
    acquisitionQuantity: toNumber(row.acquisitionQuantity),
    acquisitionUnitPrice: money(row.acquisitionUnitPriceMinor),
    acquisitionCosts: money(row.acquisitionCostsMinor),
    remainingQuantity: toNumber(row.remainingQuantity),
    currency,
    fxProvenance: (row.fxProvenance as TaxLot['fxProvenance']) ?? null,
    broker: (row.broker as string | null) ?? null,
  });
}

/** Persist a new acquisition lot. Money is stored as integer minor units. */
export async function createTaxLot(investorRef: string, input: TaxLotInput): Promise<TaxLot> {
  const db = createDatabaseClient();
  if (!db.isConfigured) {
    throw new Error('DATABASE_URL is required to persist a tax lot.');
  }
  const rows = await db.query<Row>(
    `insert into ${taxLotsTable} (
      investor_ref, instrument_symbol, jurisdiction, tax_asset_class, acquisition_date,
      acquisition_quantity, acquisition_unit_price_minor, acquisition_costs_minor,
      currency, scale, remaining_quantity, fx_provenance, broker
    ) values (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13
    )
    returning ${SELECT_COLUMNS}`,
    [
      investorRef,
      input.instrumentSymbol,
      input.jurisdiction,
      input.taxAssetClass,
      input.acquisitionDate,
      input.acquisitionQuantity,
      input.acquisitionUnitPrice.minorUnits,
      input.acquisitionCosts.minorUnits,
      input.currency,
      input.acquisitionUnitPrice.scale,
      input.remainingQuantity,
      input.fxProvenance === null ? null : JSON.stringify(input.fxProvenance),
      input.broker,
    ],
  );
  const row = rows[0];
  if (!row) {
    throw new Error('Tax lot insert returned no row.');
  }
  return mapRow(row);
}

/** Open lots (remaining_quantity > 0) for an investor + instrument, oldest-first. */
export async function listOpenTaxLots(
  investorRef: string,
  instrumentSymbol: string,
): Promise<TaxLot[]> {
  const db = createDatabaseClient();
  if (!db.isConfigured) {
    return [];
  }
  const rows = await db.query<Row>(
    `select ${SELECT_COLUMNS} from ${taxLotsTable}
     where investor_ref = $1 and instrument_symbol = $2 and remaining_quantity > 0
     order by acquisition_date asc`,
    [investorRef, instrumentSymbol],
  );
  return rows.map(mapRow);
}

export interface LotDecrement {
  lotId: string;
  quantity: number;
}

/**
 * Persist the remaining-quantity decrements produced by a disposal, atomically.
 * Matching (FIFO/policy) is the pure engine's job in the orchestration layer;
 * this repository only writes the resulting decrements inside one transaction so
 * a partial disposal can never leave lots inconsistent.
 */
export async function applyLotDecrements(decrements: readonly LotDecrement[]): Promise<void> {
  if (decrements.length === 0) {
    return;
  }
  const db = createDatabaseClient();
  if (!db.isConfigured) {
    throw new Error('DATABASE_URL is required to record a disposal.');
  }
  await db.transaction(async (tx) => {
    for (const decrement of decrements) {
      await tx.execute(
        `update ${taxLotsTable} set remaining_quantity = remaining_quantity - $1
         where lot_id = $2 and remaining_quantity >= $1`,
        [decrement.quantity, decrement.lotId],
      );
    }
  });
}
