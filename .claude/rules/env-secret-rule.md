# Environment and Secret Rule

## Purpose
API keys, database URLs, broker credentials, and auth secrets must never appear in source code or be committed to git. All secrets must be accessed through approved environment variable patterns.

## Applies To
- All packages and apps in the monorepo
- `.env`, `.env.local`, `.env.production` files

## Rule
Secret access rules:
1. **Never hardcode** API keys, database URLs, or credentials in source code
2. **Never commit** `.env`, `.env.local`, or `.env.production` files
3. **Use approved config modules** — access `process.env` only through validated config helpers, not directly in business logic
4. **Server-only secrets** — provider API keys must only be accessed in server-side code (never in client components)
5. **Secret naming** — follow the naming convention to distinguish environments:
   ```
   POLYGON_API_KEY          → polygon market data (server-only)
   TIINGO_API_KEY           → tiingo market data (server-only)
   ALPACA_SANDBOX_API_KEY   → alpaca broker sandbox
   ALPACA_LIVE_API_KEY      → alpaca broker live (handle with extreme care)
   DATABASE_URL             → postgres connection (server-only)
   NEXTAUTH_SECRET          → auth (server-only)
   ```
6. **`.env.example`** — maintain a `.env.example` with all required keys listed but no values

Gitignore must include:
```gitignore
.env
.env.local
.env.production
.env.*.local
.claude/settings.local.json
```

## Forbidden
- `const apiKey = "sk-abc123..."` anywhere in source code
- `DATABASE_URL` referenced in a client component
- Provider API key in any `apps/web/components/` file
- `process.env.ALPACA_LIVE_API_KEY` accessed outside `packages/agents/src/brokers/`
- Committing `.env.local` even "just for testing"
- `console.log(process.env.DATABASE_URL)` in any committed code

## Required Pattern
```ts
// packages/providers/src/config.ts
export function getPolygonApiKey(): string {
  const key = process.env.POLYGON_API_KEY
  if (!key) throw new Error("POLYGON_API_KEY is not configured")
  return key
}
```

```ts
// packages/providers/src/market/polygon-adapter.ts
import { getPolygonApiKey } from "../config"
const apiKey = getPolygonApiKey()  // validated, server-only, centralized
```

## Validation
```bash
git diff --staged --name-only | grep -E "\.env|secrets|credentials"
grep -r "sk-\|pk_\|API_KEY.*=.*[a-zA-Z0-9]{20}" --include="*.ts" --include="*.tsx" apps packages
git log --oneline --all -- "*.env" ".env.local"
```

## Good Example
```ts
const key = process.env.POLYGON_API_KEY ?? null
if (!key) return { error: "provider_not_configured" }
// ✓ Graceful degradation when key is absent, not a crash
```

## Bad Example
```ts
const key = "pGt7Xk9fBj..."  // ✗ Hardcoded API key — will be committed to git
```

## Safety Notes
An API key committed to git is compromised permanently — even if the commit is later reverted. Git history is public on GitHub and indexed by secret-scanning bots. A live broker API key exposed this way can cause unauthorized trades. Rotate any key that was ever committed to git.
