#!/usr/bin/env node
// ---------------------------------------------------------------------------
// pnpm env:check
//
// Safe local diagnostic for the Aurox Intelligence dev environment.
//
// It loads the repository-root env files using the SAME loader the apps use
// (@next/env loadEnvConfig), then reports which required variables are present.
//
// Safety guarantees:
//   - It NEVER prints any secret value (only presence: yes / no).
//   - It prints which env files were loaded and from where.
//   - It exits non-zero if a required variable is missing, so it can gate CI.
// ---------------------------------------------------------------------------

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nextEnv from '@next/env';

const { loadEnvConfig } = nextEnv;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const isDev = process.env.NODE_ENV !== 'production';
const { loadedEnvFiles } = loadEnvConfig(repoRoot, isDev);

// Required for the web app to boot. Keep in sync with apps/web/server/auth/config.ts.
const REQUIRED = ['AUTH_SECRET'];

// Strongly recommended for a useful local run (warn, do not fail).
const RECOMMENDED = ['DATABASE_URL', 'APP_BASE_URL', 'NODE_ENV'];

// Variables that are validated by length/format (presence is not enough).
const MIN_LENGTHS = { AUTH_SECRET: 32 };

function present(name) {
  const value = process.env[name];
  return typeof value === 'string' && value.trim().length > 0;
}

function meetsMinLength(name) {
  const min = MIN_LENGTHS[name];
  if (!min) return true;
  const value = process.env[name];
  return typeof value === 'string' && value.trim().length >= min;
}

console.log('Aurox Intelligence — environment check');
console.log('======================================');
console.log(`Repo root:   ${repoRoot}`);
console.log(`NODE_ENV:    ${process.env.NODE_ENV ?? '(unset → defaults to development)'}`);

if (loadedEnvFiles.length > 0) {
  console.log('Env files loaded (precedence high → low):');
  for (const file of loadedEnvFiles) {
    console.log(`  - ${file.path}`);
  }
} else {
  console.log('Env files loaded: (none found at repo root)');
}

console.log('');
console.log('Required variables:');
let hasError = false;
for (const name of REQUIRED) {
  const ok = present(name);
  const lengthOk = ok && meetsMinLength(name);
  if (!ok) {
    hasError = true;
    console.log(`  ✗ ${name}: NO (missing)`);
  } else if (!lengthOk) {
    hasError = true;
    console.log(`  ✗ ${name}: present but too short (needs ≥ ${MIN_LENGTHS[name]} chars)`);
  } else {
    console.log(`  ✓ ${name}: yes`);
  }
}

console.log('');
console.log('Recommended variables:');
for (const name of RECOMMENDED) {
  console.log(`  ${present(name) ? '✓' : '·'} ${name}: ${present(name) ? 'yes' : 'no'}`);
}

console.log('');
if (hasError) {
  console.error('Result: FAIL — one or more required variables are missing or invalid.');
  console.error('');
  console.error('Fix:');
  console.error('  1. Copy the template:   cp .env.example .env');
  console.error('  2. Generate a secret:   openssl rand -base64 32');
  console.error('  3. Set AUTH_SECRET in the repository-root .env');
  console.error('  4. Re-run:              pnpm env:check');
  process.exit(1);
}

console.log('Result: OK — required environment is present.');
