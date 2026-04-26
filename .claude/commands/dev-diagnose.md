# /dev-diagnose

## Purpose
Diagnose why `pnpm dev` or `pnpm dev:web` is not starting or is throwing errors.

## When to Use
- Dev server fails to start
- HMR is broken
- Routes throw unexpected 500 errors locally
- Worker is not connecting

## Claude Code Prompt

```text
Diagnose the Aurox dev server startup issue.

Check in order:
1. Is .env present? Check for required vars: DATABASE_URL, provider API keys
2. Is node_modules present and up to date? Check pnpm-lock.yaml matches
3. Are there TypeScript errors blocking compilation?
   - Run: pnpm --filter @repo/api-contracts typecheck
   - Run: pnpm --filter @repo/db typecheck
4. Is the database reachable? Check DATABASE_URL format
5. Have migrations been run? Check packages/db/src/migrations/
6. Are there port conflicts (3000, 3001)?
7. Check apps/web/next.config.* for misconfigurations

Report:

Dev Diagnose Report
===================
.env: present / missing
Required env vars: present / missing (list missing)
node_modules: present / stale / missing
TypeScript errors: none / list
DB connection: reachable / unreachable / not checked
Migrations: applied / pending / unknown
Port conflicts: none / detected
Next.js config: valid / issues

Root cause hypothesis:
- ...

Recommended fix:
- ...
```

## Validation Commands
```bash
ls .env
pnpm --filter @repo/api-contracts typecheck
pnpm --filter @repo/db typecheck
node packages/db/scripts/migrate.mjs
```

## Expected Output
Ranked list of likely causes with specific fix steps.

## Safety Notes
- Read-only diagnosis. No server mutations.
- Never expose .env contents in output.
