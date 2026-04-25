import { createHash } from 'node:crypto';
import { createDatabaseClient } from '../client';
import { authAccountsTable } from '../schema/auth-accounts';
import { sessionsTable } from '../schema/sessions';
import { usersTable } from '../schema/users';
import { verificationTokensTable } from '../schema/verification-tokens';
export class EmailAlreadyInUseError extends Error {
    constructor() {
        super('A user with that email address already exists.');
        this.name = 'EmailAlreadyInUseError';
    }
}
function toIsoTimestamp(value) {
    if (!value) {
        return null;
    }
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
function hashOpaqueToken(token) {
    return createHash('sha256').update(token).digest('base64url');
}
function parseDatabaseError(error) {
    if (typeof error === 'object' && error !== null && 'code' in error) {
        return error;
    }
    return null;
}
function assertDatabaseConfigured(client) {
    if (!client.isConfigured) {
        throw new Error('DATABASE_URL must point to a Postgres database to use the production auth/session repository.');
    }
}
function mapUser(row) {
    return {
        id: row.id,
        email: row.email,
        name: row.displayName,
        role: row.role,
        avatarUrl: row.avatarUrl,
        createdAt: toIsoTimestamp(row.createdAt) ?? new Date(0).toISOString(),
        updatedAt: toIsoTimestamp(row.updatedAt) ?? new Date(0).toISOString(),
        passwordHash: row.passwordHash,
        status: row.status,
        emailVerifiedAt: toIsoTimestamp(row.emailVerifiedAt),
    };
}
function mapSession(row) {
    return {
        id: row.id,
        userId: row.userId,
        tokenHash: row.sessionTokenHash,
        userAgent: row.userAgent,
        ipAddress: row.ipAddress,
        createdAt: toIsoTimestamp(row.createdAt) ?? new Date(0).toISOString(),
        updatedAt: toIsoTimestamp(row.updatedAt) ?? new Date(0).toISOString(),
        expiresAt: toIsoTimestamp(row.expiresAt) ?? new Date(0).toISOString(),
        lastSeenAt: toIsoTimestamp(row.lastSeenAt),
        revokedAt: toIsoTimestamp(row.revokedAt),
    };
}
function mapJoinedUser(row) {
    return {
        id: row.userRecordId,
        email: row.userEmail,
        name: row.userDisplayName,
        role: row.userRole,
        avatarUrl: row.userAvatarUrl,
        createdAt: toIsoTimestamp(row.userCreatedAt) ?? new Date(0).toISOString(),
        updatedAt: toIsoTimestamp(row.userUpdatedAt) ?? new Date(0).toISOString(),
        passwordHash: row.userPasswordHash,
        status: row.userStatus,
        emailVerifiedAt: toIsoTimestamp(row.userEmailVerifiedAt),
    };
}
function mapVerificationToken(row) {
    return {
        id: row.id,
        userId: row.userId,
        email: row.email,
        tokenHash: row.tokenHash,
        type: row.type,
        expiresAt: toIsoTimestamp(row.expiresAt) ?? new Date(0).toISOString(),
        usedAt: toIsoTimestamp(row.usedAt),
        createdAt: toIsoTimestamp(row.createdAt) ?? new Date(0).toISOString(),
        updatedAt: toIsoTimestamp(row.updatedAt) ?? new Date(0).toISOString(),
    };
}
async function findUserByIdWithClient(client, id) {
    const rows = await client.query(`
      select
        id,
        email,
        display_name as "displayName",
        password_hash as "passwordHash",
        role,
        avatar_url as "avatarUrl",
        status,
        email_verified_at as "emailVerifiedAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
      from ${usersTable}
      where id = $1
      limit 1
    `, [id]);
    return rows[0] ? mapUser(rows[0]) : null;
}
async function findUserByEmailWithClient(client, email) {
    const rows = await client.query(`
      select
        id,
        email,
        display_name as "displayName",
        password_hash as "passwordHash",
        role,
        avatar_url as "avatarUrl",
        status,
        email_verified_at as "emailVerifiedAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
      from ${usersTable}
      where email = $1
      limit 1
    `, [email]);
    return rows[0] ? mapUser(rows[0]) : null;
}
async function findAuthenticatedSessionByTokenHashWithClient(client, tokenHash) {
    const rows = await client.query(`
      select
        s.id,
        s.user_id as "userId",
        s.session_token_hash as "sessionTokenHash",
        s.user_agent as "userAgent",
        s.ip_address as "ipAddress",
        s.created_at as "createdAt",
        s.updated_at as "updatedAt",
        s.expires_at as "expiresAt",
        s.last_seen_at as "lastSeenAt",
        s.revoked_at as "revokedAt",
        u.id as "userRecordId",
        u.email as "userEmail",
        u.display_name as "userDisplayName",
        u.password_hash as "userPasswordHash",
        u.role as "userRole",
        u.avatar_url as "userAvatarUrl",
        u.status as "userStatus",
        u.email_verified_at as "userEmailVerifiedAt",
        u.created_at as "userCreatedAt",
        u.updated_at as "userUpdatedAt"
      from ${sessionsTable} s
      join ${usersTable} u on u.id = s.user_id
      where s.session_token_hash = $1
        and s.revoked_at is null
        and s.expires_at > now()
      limit 1
    `, [tokenHash]);
    const row = rows[0];
    if (!row) {
        return null;
    }
    return {
        user: mapJoinedUser(row),
        session: mapSession(row),
    };
}
export async function findUserByEmail(email) {
    const client = createDatabaseClient();
    assertDatabaseConfigured(client);
    return findUserByEmailWithClient(client, email);
}
export async function findUserById(id) {
    const client = createDatabaseClient();
    assertDatabaseConfigured(client);
    return findUserByIdWithClient(client, id);
}
export async function findAuthUserByEmail(email) {
    return findUserByEmail(email);
}
export async function findAuthUserById(id) {
    return findUserById(id);
}
export async function createUser(input) {
    const client = createDatabaseClient();
    assertDatabaseConfigured(client);
    try {
        return await client.transaction(async (transactionClient) => {
            await transactionClient.execute(`
          insert into ${usersTable} (
            id,
            email,
            password_hash,
            display_name,
            role,
            status,
            avatar_url
          ) values ($1, $2, $3, $4, $5, $6, $7)
        `, [
                input.id,
                input.email,
                input.passwordHash,
                input.displayName,
                input.role ?? 'member',
                input.status ?? 'pending_verification',
                input.avatarUrl ?? null,
            ]);
            await transactionClient.execute(`
          insert into ${authAccountsTable} (
            id,
            user_id,
            provider,
            provider_account_id,
            provider_email,
            metadata
          ) values ($1, $2, 'credentials', $3, $4, $5::jsonb)
        `, [
                crypto.randomUUID(),
                input.id,
                input.email,
                input.email,
                JSON.stringify({ registered_via: 'password' }),
            ]);
            const user = await findUserByIdWithClient(transactionClient, input.id);
            if (!user) {
                throw new Error('Failed to load the user that was just created.');
            }
            return user;
        });
    }
    catch (error) {
        const databaseError = parseDatabaseError(error);
        if (databaseError?.code === '23505') {
            throw new EmailAlreadyInUseError();
        }
        throw error;
    }
}
export async function createAuthUser(input) {
    return createUser({
        id: input.id,
        email: input.email,
        displayName: input.name,
        passwordHash: input.passwordHash,
        ...(input.role ? { role: input.role } : {}),
        ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
    });
}
export async function updateAuthUserProfile(userId, input) {
    const client = createDatabaseClient();
    assertDatabaseConfigured(client);
    try {
        await client.execute(`
        update ${usersTable}
        set
          email = $2,
          display_name = $3,
          avatar_url = $4,
          updated_at = now()
        where id = $1
      `, [userId, input.email, input.name, input.avatarUrl]);
    }
    catch (error) {
        const databaseError = parseDatabaseError(error);
        if (databaseError?.code === '23505') {
            throw new EmailAlreadyInUseError();
        }
        throw error;
    }
    const updatedUser = await findUserById(userId);
    if (!updatedUser) {
        throw new Error('Failed to load the updated user profile.');
    }
    return updatedUser;
}
export async function updateAuthUserPassword(userId, passwordHash) {
    const client = createDatabaseClient();
    assertDatabaseConfigured(client);
    await client.execute(`
      update ${usersTable}
      set
        password_hash = $2,
        updated_at = now(),
        status = case when status = 'disabled' then status else 'active' end
      where id = $1
    `, [userId, passwordHash]);
}
export async function markUserEmailVerified(userId) {
    const client = createDatabaseClient();
    assertDatabaseConfigured(client);
    await client.execute(`
      update ${usersTable}
      set
        email_verified_at = now(),
        status = case when status = 'disabled' then status else 'active' end,
        updated_at = now()
      where id = $1
    `, [userId]);
}
export async function recordUserSignIn(userId) {
    const client = createDatabaseClient();
    assertDatabaseConfigured(client);
    await client.execute(`
      update ${usersTable}
      set
        last_login_at = now(),
        updated_at = now()
      where id = $1
    `, [userId]);
}
export async function createSession(input) {
    const client = createDatabaseClient();
    assertDatabaseConfigured(client);
    const tokenHash = hashOpaqueToken(input.token);
    await client.execute(`
      insert into ${sessionsTable} (
        id,
        user_id,
        session_token_hash,
        expires_at,
        user_agent,
        ip_address,
        last_seen_at
      ) values ($1, $2, $3, $4, $5, $6, now())
    `, [
        input.id,
        input.userId,
        tokenHash,
        input.expiresAt,
        input.userAgent ?? null,
        input.ipAddress ?? null,
    ]);
    const record = await findSessionByToken(input.token);
    if (!record) {
        throw new Error('Failed to load the session that was just created.');
    }
    return record.session;
}
export async function createAuthSession(input) {
    const client = createDatabaseClient();
    assertDatabaseConfigured(client);
    await client.execute(`
      insert into ${sessionsTable} (
        id,
        user_id,
        session_token_hash,
        expires_at,
        user_agent,
        ip_address,
        last_seen_at
      ) values ($1, $2, $3, $4, $5, $6, now())
    `, [
        input.id,
        input.userId,
        input.tokenHash,
        input.expiresAt,
        input.userAgent ?? null,
        input.ipAddress ?? null,
    ]);
    const record = await findAuthenticatedSessionByTokenHash(input.tokenHash);
    if (!record) {
        throw new Error('Failed to load the session that was just created.');
    }
    return record.session;
}
export async function findSessionByToken(token) {
    const client = createDatabaseClient();
    assertDatabaseConfigured(client);
    return findAuthenticatedSessionByTokenHashWithClient(client, hashOpaqueToken(token));
}
export async function findAuthenticatedSessionByTokenHash(tokenHash) {
    const client = createDatabaseClient();
    assertDatabaseConfigured(client);
    return findAuthenticatedSessionByTokenHashWithClient(client, tokenHash);
}
export async function touchAuthSession(sessionId) {
    const client = createDatabaseClient();
    assertDatabaseConfigured(client);
    await client.execute(`
      update ${sessionsTable}
      set
        last_seen_at = now(),
        updated_at = now()
      where id = $1
        and revoked_at is null
    `, [sessionId]);
}
export async function revokeSession(sessionId) {
    const client = createDatabaseClient();
    assertDatabaseConfigured(client);
    await client.execute(`
      update ${sessionsTable}
      set
        revoked_at = now(),
        updated_at = now()
      where id = $1
        and revoked_at is null
    `, [sessionId]);
}
export async function revokeSessionByToken(token) {
    const client = createDatabaseClient();
    assertDatabaseConfigured(client);
    await client.execute(`
      update ${sessionsTable}
      set
        revoked_at = now(),
        updated_at = now()
      where session_token_hash = $1
        and revoked_at is null
    `, [hashOpaqueToken(token)]);
}
export async function deleteAuthSessionByTokenHash(tokenHash) {
    const client = createDatabaseClient();
    assertDatabaseConfigured(client);
    await client.execute(`
      update ${sessionsTable}
      set
        revoked_at = now(),
        updated_at = now()
      where session_token_hash = $1
        and revoked_at is null
    `, [tokenHash]);
}
export async function deleteAuthSessionById(sessionId) {
    return revokeSession(sessionId);
}
export async function revokeAllUserSessions(userId, exceptSessionId) {
    const client = createDatabaseClient();
    assertDatabaseConfigured(client);
    const params = [userId];
    let statement = `
    update ${sessionsTable}
    set
      revoked_at = now(),
      updated_at = now()
    where user_id = $1
      and revoked_at is null
  `;
    if (exceptSessionId) {
        params.push(exceptSessionId);
        statement += ' and id <> $2';
    }
    await client.execute(statement, params);
}
export async function deleteAllAuthSessionsForUser(userId) {
    return revokeAllUserSessions(userId);
}
export async function countActiveAuthSessionsForUser(userId) {
    const client = createDatabaseClient();
    assertDatabaseConfigured(client);
    const rows = await client.query(`
      select count(*) as count
      from ${sessionsTable}
      where user_id = $1
        and revoked_at is null
        and expires_at > now()
    `, [userId]);
    const value = rows[0]?.count;
    return typeof value === 'number' ? value : Number(value ?? 0);
}
export async function listRecentAuthSessionsForUser(userId, currentSessionId) {
    const client = createDatabaseClient();
    assertDatabaseConfigured(client);
    const rows = await client.query(`
      select
        id,
        user_id as "userId",
        session_token_hash as "sessionTokenHash",
        user_agent as "userAgent",
        ip_address as "ipAddress",
        created_at as "createdAt",
        updated_at as "updatedAt",
        expires_at as "expiresAt",
        last_seen_at as "lastSeenAt",
        revoked_at as "revokedAt"
      from ${sessionsTable}
      where user_id = $1
      order by created_at desc
      limit 5
    `, [userId]);
    return rows.map((entry) => ({
        id: entry.id,
        createdAt: toIsoTimestamp(entry.createdAt) ?? new Date(0).toISOString(),
        expiresAt: toIsoTimestamp(entry.expiresAt) ?? new Date(0).toISOString(),
        lastSeenAt: toIsoTimestamp(entry.lastSeenAt),
        isCurrent: entry.id === currentSessionId,
    }));
}
export async function createVerificationToken(input) {
    const client = createDatabaseClient();
    assertDatabaseConfigured(client);
    const tokenHash = hashOpaqueToken(input.token);
    await client.execute(`
      insert into ${verificationTokensTable} (
        id,
        user_id,
        email,
        token_hash,
        type,
        expires_at
      ) values ($1, $2, $3, $4, $5, $6)
    `, [input.id, input.userId ?? null, input.email, tokenHash, input.type, input.expiresAt]);
    return {
        id: input.id,
        userId: input.userId ?? null,
        email: input.email,
        tokenHash,
        type: input.type,
        expiresAt: input.expiresAt,
        usedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
}
export async function consumeVerificationToken(input) {
    const client = createDatabaseClient();
    assertDatabaseConfigured(client);
    return client.transaction(async (transactionClient) => {
        const tokenHash = hashOpaqueToken(input.token);
        const rows = await transactionClient.query(`
        select
          id,
          user_id as "userId",
          email,
          token_hash as "tokenHash",
          type,
          expires_at as "expiresAt",
          used_at as "usedAt",
          created_at as "createdAt",
          updated_at as "updatedAt"
        from ${verificationTokensTable}
        where token_hash = $1
          and type = $2
          and used_at is null
          and expires_at > now()
        limit 1
      `, [tokenHash, input.type]);
        const row = rows[0];
        if (!row) {
            return null;
        }
        await transactionClient.execute(`
        update ${verificationTokensTable}
        set
          used_at = now(),
          updated_at = now()
        where id = $1
          and used_at is null
      `, [row.id]);
        return {
            ...mapVerificationToken(row),
            usedAt: new Date().toISOString(),
        };
    });
}
export async function verifyEmailFromToken(token) {
    const client = createDatabaseClient();
    assertDatabaseConfigured(client);
    return client.transaction(async (transactionClient) => {
        const tokenRecord = await consumeVerificationTokenWithinClient(transactionClient, token, 'email_verification');
        if (!tokenRecord?.userId) {
            return null;
        }
        await transactionClient.execute(`
        update ${usersTable}
        set
          email_verified_at = now(),
          status = case when status = 'disabled' then status else 'active' end,
          updated_at = now()
        where id = $1
      `, [tokenRecord.userId]);
        return findUserByIdWithClient(transactionClient, tokenRecord.userId);
    });
}
export async function resetPasswordFromToken(token, passwordHash) {
    const client = createDatabaseClient();
    assertDatabaseConfigured(client);
    return client.transaction(async (transactionClient) => {
        const tokenRecord = await consumeVerificationTokenWithinClient(transactionClient, token, 'password_reset');
        if (!tokenRecord?.userId) {
            return null;
        }
        await transactionClient.execute(`
        update ${usersTable}
        set
          password_hash = $2,
          status = case when status = 'disabled' then status else 'active' end,
          updated_at = now()
        where id = $1
      `, [tokenRecord.userId, passwordHash]);
        await transactionClient.execute(`
        update ${sessionsTable}
        set
          revoked_at = now(),
          updated_at = now()
        where user_id = $1
          and revoked_at is null
      `, [tokenRecord.userId]);
        return findUserByIdWithClient(transactionClient, tokenRecord.userId);
    });
}
async function consumeVerificationTokenWithinClient(client, token, type) {
    const tokenHash = hashOpaqueToken(token);
    const rows = await client.query(`
      select
        id,
        user_id as "userId",
        email,
        token_hash as "tokenHash",
        type,
        expires_at as "expiresAt",
        used_at as "usedAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
      from ${verificationTokensTable}
      where token_hash = $1
        and type = $2
        and used_at is null
        and expires_at > now()
      limit 1
    `, [tokenHash, type]);
    const row = rows[0];
    if (!row) {
        return null;
    }
    await client.execute(`
      update ${verificationTokensTable}
      set
        used_at = now(),
        updated_at = now()
      where id = $1
        and used_at is null
    `, [row.id]);
    return {
        ...mapVerificationToken(row),
        usedAt: new Date().toISOString(),
    };
}
