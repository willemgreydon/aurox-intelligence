import postgres, { type Sql, type TransactionSql } from 'postgres';

export type QueryParam = string | number | boolean | Date | Uint8Array | null;

export interface DatabaseClient {
  readonly isConfigured: boolean;
  readonly mode: 'postgres' | 'stub';
  readonly databaseUrl: string | null;
  query<T>(statement: string, params?: readonly QueryParam[]): Promise<T[]>;
  execute(statement: string, params?: readonly QueryParam[]): Promise<void>;
  transaction<T>(callback: (client: DatabaseClient) => Promise<T>): Promise<T>;
}

type SqlLike = Pick<Sql, 'unsafe'> | Pick<TransactionSql, 'unsafe'>;

export type RawDatabase = Sql | null;

let databaseInstance: RawDatabase = null;
let clientInstance: DatabaseClient | null = null;

function resolveRuntimeDatabaseUrl() {
  const value = process.env.DATABASE_URL?.trim();

  if (!value) {
    return null;
  }

  if (!value.startsWith('postgres://') && !value.startsWith('postgresql://')) {
    throw new Error(
      'DATABASE_URL must be a Postgres connection string for the production auth/session layer.',
    );
  }

  return value;
}

export function resolveMigrationDatabaseUrl() {
  const direct =
    process.env.DATABASE_URL_UNPOOLED?.trim() ||
    process.env.DIRECT_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    '';

  if (!direct) {
    throw new Error(
      'Set DATABASE_URL for runtime queries and DIRECT_URL or DATABASE_URL_UNPOOLED for migrations.',
    );
  }

  if (!direct.startsWith('postgres://') && !direct.startsWith('postgresql://')) {
    throw new Error('DIRECT_URL or DATABASE_URL_UNPOOLED must be a Postgres connection string.');
  }

  return direct;
}

function createSql(url: string) {
  return postgres(url, {
    max: 1,
    prepare: false,
    idle_timeout: 20,
    connect_timeout: 30,
    onnotice() {
      // Postgres notices are intentionally ignored in normal runtime operation.
    },
  });
}

function wrapSql(
  sql: SqlLike,
  databaseUrl: string,
  begin?: Sql['begin'],
): DatabaseClient {
  return {
    isConfigured: true,
    mode: 'postgres',
    databaseUrl,
    async query<T>(statement: string, params: readonly QueryParam[] = []) {
      return (await sql.unsafe(statement, [...params])) as T[];
    },
    async execute(statement: string, params: readonly QueryParam[] = []) {
      await sql.unsafe(statement, [...params]);
    },
    async transaction<T>(callback: (client: DatabaseClient) => Promise<T>) {
      if (!begin) {
        return callback(wrapSql(sql, databaseUrl));
      }

      return begin(async (transactionSql: TransactionSql) =>
        callback(wrapSql(transactionSql, databaseUrl)),
      ) as Promise<T>;
    },
  };
}

function createStubClient(reason: string): DatabaseClient {
  return {
    isConfigured: false,
    mode: 'stub',
    databaseUrl: null,
    async query() {
      throw new Error(reason);
    },
    async execute() {
      throw new Error(reason);
    },
    async transaction() {
      throw new Error(reason);
    },
  };
}

export function getDatabase(): RawDatabase {
  if (databaseInstance) {
    return databaseInstance;
  }

  const runtimeUrl = resolveRuntimeDatabaseUrl();

  if (!runtimeUrl) {
    return null;
  }

  databaseInstance = createSql(runtimeUrl);
  return databaseInstance;
}

export function createDatabaseClient(): DatabaseClient {
  if (clientInstance) {
    return clientInstance;
  }

  try {
    const runtimeUrl = resolveRuntimeDatabaseUrl();

    if (!runtimeUrl) {
      clientInstance = createStubClient(
        'DATABASE_URL is required to access the Postgres-backed repository layer.',
      );
      return clientInstance;
    }

    const sql = getDatabase();

    if (!sql) {
      clientInstance = createStubClient(
        'DATABASE_URL is required to access the Postgres-backed repository layer.',
      );
      return clientInstance;
    }

    clientInstance = wrapSql(sql, runtimeUrl, sql.begin.bind(sql));
    return clientInstance;
  } catch (error) {
    clientInstance = createStubClient(
      error instanceof Error ? error.message : 'The database configuration is invalid.',
    );
    return clientInstance;
  }
}

export function createMigrationClient() {
  const migrationUrl = resolveMigrationDatabaseUrl();
  return createSql(migrationUrl);
}
