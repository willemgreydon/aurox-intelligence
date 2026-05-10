# Vercel Turbo Env Audit

Date: 2026-05-09

## Summary

Vercel warned that several configured environment variables would not be available during Turbo tasks because they were missing from `turbo.json` `globalEnv`. These vars are referenced in server/provider code paths and should be available to build/runtime tasks.

## Server-only secrets

Keep server-only (never `NEXT_PUBLIC`):

- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `CLAUDE_FINANCE_API_KEY` (deprecated alias)
- `FINNHUB_API_KEY`
- `POLYGON_API_KEY`
- `TWELVE_DATA_API_KEY`
- `TIINGO_API_KEY`
- `COINGECKO_API_KEY`
- `EODHD_API_KEY`
- `NEWS_API_KEY`
- broker/exchange secrets (`BINANCE_API_SECRET`, `COINBASE_API_KEY_SECRET`, etc.)

These are allowed in Turbo env propagation for server builds, but must not be exposed with `NEXT_PUBLIC_*`.

## Safe config flags (non-secret)

- `MACRO_DATA_PROVIDER`
- `NEWS_DATA_PROVIDER`
- `CLAUDE_FINANCE_PROVIDER_ENABLED`
- `ANTHROPIC_PROVIDER_ENABLED`
- `OPENAI_PROVIDER_ENABLED`
- `AI_PRIMARY_PROVIDER`
- `AI_FALLBACK_PROVIDER`
- `MARKET_DATA_PROVIDER` and related provider selection flags

## Package usage highlights

- `packages/providers/src/config.ts` reads:
  - `MACRO_DATA_PROVIDER`, `NEWS_DATA_PROVIDER`
  - `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`
  - `CLAUDE_FINANCE_API_KEY`, `CLAUDE_FINANCE_PROVIDER_ENABLED`
  - `ANTHROPIC_PROVIDER_ENABLED`, `OPENAI_PROVIDER_ENABLED`
  - `AI_PRIMARY_PROVIDER`, `AI_FALLBACK_PROVIDER`
- `apps/web/server/env/ai-agent-env.ts` and AI service path read OpenAI key and resolved provider config from providers package.
- `apps/worker/src/env.ts` reads provider keys and market provider config.

## turbo.json changes applied

Added missing variables to `globalEnv`:

- `MACRO_DATA_PROVIDER`
- `NEWS_DATA_PROVIDER`
- `ANTHROPIC_API_KEY`
- `CLAUDE_FINANCE_API_KEY`
- `CLAUDE_FINANCE_PROVIDER_ENABLED`
- `ANTHROPIC_PROVIDER_ENABLED`
- `OPENAI_PROVIDER_ENABLED`
- `AI_PRIMARY_PROVIDER`
- `AI_FALLBACK_PROVIDER`

`OPENAI_API_KEY` and market provider keys were already present.

## Vars intentionally not added as NEXT_PUBLIC

No secret provider/API keys were moved to `NEXT_PUBLIC_*`. Client bundles remain protected from server secrets.

