# Aurox Testing & Verification Rules

## Minimum Verification

For changed packages:

```bash
pnpm --filter @repo/<package> typecheck
pnpm --filter @repo/<package> test
```

For contract changes:

```bash
pnpm --filter @repo/api-contracts typecheck
```

For DB changes:

```bash
node packages/db/scripts/migrate.mjs
pnpm --filter @repo/db typecheck
```

For web changes:

```bash
pnpm build:web
```

## Reporting Format

Always report:

```text
Checks run:
- ...

Checks not run:
- ...

Failures:
- ...

Known unrelated baseline issues:
- ...
```

Never claim verification that was not performed.
