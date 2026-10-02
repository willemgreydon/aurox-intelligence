import { createDatabaseClient } from '../client';

export type TableSize = {
  table: string;
  bytes: number;
};

export type DatabaseSizeReport = {
  databaseBytes: number;
  topTables: TableSize[];
};

/**
 * Lightweight database-size probe for trend logging. True network egress (the
 * Neon free-plan cap that takes the site down) is NOT queryable from SQL — it is
 * a platform metric, readable only from the Neon console/API. Database size and
 * per-table size ARE queryable, and are the actionable proxy: they show which
 * append-only tables are growing so retention windows can be tuned.
 *
 * Best-effort and read-only: returns null without a DB or on any error, so it
 * can never break the caller (a daily cron).
 */
export async function getDatabaseSizeReport(topN = 8): Promise<DatabaseSizeReport | null> {
  const client = createDatabaseClient();
  if (!client.isConfigured) return null;

  try {
    const dbRows = await client.query<{ bytes: string | number }>(
      `select pg_database_size(current_database()) as bytes`,
    );
    const tableRows = await client.query<{ table: string; bytes: string | number }>(
      `select c.relname as "table", pg_total_relation_size(c.oid) as bytes
         from pg_class c
         join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'app'
          and c.relkind = 'r'
        order by pg_total_relation_size(c.oid) desc
        limit $1`,
      [topN],
    );

    return {
      databaseBytes: Number(dbRows[0]?.bytes ?? 0),
      topTables: tableRows.map((row) => ({ table: row.table, bytes: Number(row.bytes) })),
    };
  } catch {
    return null;
  }
}
