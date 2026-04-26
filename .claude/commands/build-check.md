# /build-check

## Purpose
Verify the web app and worker build cleanly with no type or bundler errors.

## When to Use
- Before any PR
- After changes to routes, server actions, or shared packages
- When deployment is imminent

## Claude Code Prompt

```text
Run a full build check for the Aurox web app.

Steps:
1. Run: pnpm build:web
2. Check for TypeScript errors in the build output
3. Check for missing environment variable warnings
4. Check for failed module resolution
5. Note any pages with build-time errors

Report:

Build Check Report
==================
pnpm build:web: PASS / FAIL

Errors (if any):
- File: <path>
  Error: <message>

Warnings:
- ...

Missing env vars detected:
- ...

Known unrelated baseline:
- apps/web/server/auth/service.test.ts typing issue may surface

Recommended actions:
- ...
```

## Validation Commands
```bash
pnpm build:web
```

## Expected Output
Clean build or explicit error list with file paths.

## Safety Notes
- Build is read-only. No runtime side effects.
- Do not suppress build errors to make the check "pass".
