import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nextEnv from '@next/env';
import postgres from 'postgres';

const { loadEnvConfig } = nextEnv;

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(currentDir, '..');
const repoRoot = path.resolve(packageRoot, '..', '..');

loadEnvConfig(repoRoot);

const migrationUrl =
  process.env.DATABASE_URL_UNPOOLED?.trim() ||
  process.env.DIRECT_URL?.trim() ||
  process.env.DATABASE_URL?.trim();

if (!migrationUrl) {
  throw new Error(
    'Set DATABASE_URL for runtime access and DIRECT_URL or DATABASE_URL_UNPOOLED for Postgres migrations.',
  );
}

const sql = postgres(migrationUrl, {
  max: 1,
  prepare: false,
  idle_timeout: 20,
  connect_timeout: 30,
});

const migrationsDir = path.join(packageRoot, 'src', 'migrations');

async function main() {
  await sql`create schema if not exists app`;
  await sql`
    create table if not exists app.schema_migrations (
      id text primary key,
      applied_at timestamptz not null default now()
    )
  `;

  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort((left, right) => left.localeCompare(right));

  for (const file of files) {
    const existing = await sql`
      select id
      from app.schema_migrations
      where id = ${file}
      limit 1
    `;

    if (existing.length > 0) {
      continue;
    }

    const fullPath = path.join(migrationsDir, file);
    const statement = await readFile(fullPath, 'utf8');

    await sql.begin(async (transaction) => {
      await transaction.unsafe(statement);
      await transaction`
        insert into app.schema_migrations (id)
        values (${file})
      `;
    });

    process.stdout.write(`Applied migration ${file}\n`);
  }
}

main()
  .catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql.end({ timeout: 5 });
  });
