import postgres from 'postgres';
let databaseInstance = null;
let clientInstance = null;
function resolveRuntimeDatabaseUrl() {
    const value = process.env.DATABASE_URL?.trim();
    if (!value) {
        return null;
    }
    if (!value.startsWith('postgres://') && !value.startsWith('postgresql://')) {
        throw new Error('DATABASE_URL must be a Postgres connection string for the production auth/session layer.');
    }
    return value;
}
export function resolveMigrationDatabaseUrl() {
    const direct = process.env.DATABASE_URL_UNPOOLED?.trim() ||
        process.env.DIRECT_URL?.trim() ||
        process.env.DATABASE_URL?.trim() ||
        '';
    if (!direct) {
        throw new Error('Set DATABASE_URL for runtime queries and DIRECT_URL or DATABASE_URL_UNPOOLED for migrations.');
    }
    if (!direct.startsWith('postgres://') && !direct.startsWith('postgresql://')) {
        throw new Error('DIRECT_URL or DATABASE_URL_UNPOOLED must be a Postgres connection string.');
    }
    return direct;
}
function createSql(url) {
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
function wrapSql(sql, databaseUrl, begin) {
    return {
        isConfigured: true,
        mode: 'postgres',
        databaseUrl,
        async query(statement, params = []) {
            return (await sql.unsafe(statement, [...params]));
        },
        async execute(statement, params = []) {
            await sql.unsafe(statement, [...params]);
        },
        async transaction(callback) {
            if (!begin) {
                return callback(wrapSql(sql, databaseUrl));
            }
            return begin(async (transactionSql) => callback(wrapSql(transactionSql, databaseUrl)));
        },
    };
}
function createStubClient(reason) {
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
export function getDatabase() {
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
export function createDatabaseClient() {
    if (clientInstance) {
        return clientInstance;
    }
    try {
        const runtimeUrl = resolveRuntimeDatabaseUrl();
        if (!runtimeUrl) {
            clientInstance = createStubClient('DATABASE_URL is required to access the Postgres-backed repository layer.');
            return clientInstance;
        }
        const sql = getDatabase();
        if (!sql) {
            clientInstance = createStubClient('DATABASE_URL is required to access the Postgres-backed repository layer.');
            return clientInstance;
        }
        clientInstance = wrapSql(sql, runtimeUrl, sql.begin.bind(sql));
        return clientInstance;
    }
    catch (error) {
        clientInstance = createStubClient(error instanceof Error ? error.message : 'The database configuration is invalid.');
        return clientInstance;
    }
}
export function createMigrationClient() {
    const migrationUrl = resolveMigrationDatabaseUrl();
    return createSql(migrationUrl);
}
