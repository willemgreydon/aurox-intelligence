# /provider-rate-limit-audit

## Purpose
Identify provider calls that risk hitting rate limits and ensure fallback behavior is in place.

## When to Use
- 429 errors appearing in logs
- Provider health check failures
- Adding a new provider
- Before increasing polling frequency

## Claude Code Prompt

```text
Audit provider rate limit exposure in packages/providers/.

Check:
1. How many API calls are made per request for each provider
2. Whether there is per-provider rate limit tracking or throttling
3. Whether exponential backoff is implemented on 429 responses
4. Whether provider health checks are gating calls when a provider is degraded
5. Whether fallback providers are triggered automatically on rate limit

Inspect:
- packages/providers/src/market/routing.ts — fallback chain
- packages/providers/src/ — per-provider client implementations
- packages/observability/ — is rate limit logging present?

Report:

Provider Rate Limit Audit
==========================
Providers without throttling:
- ...

Providers without backoff on 429:
- ...

Missing fallback triggers:
- ...

Missing health check gates:
- ...

Missing observability:
- ...

Recommended fixes:
1. ...
2. ...
```

## Validation Commands
```bash
pnpm --filter @repo/providers typecheck
```

## Expected Output
Per-provider risk assessment with specific gaps and recommendations.

## Safety Notes
- Do not add fake rate limit responses.
- Fallback must not silently serve stale data without lowering confidence score.
