# AI Provider Config Audit

Date: 2026-05-09

## Current state before this pass

- `.env.example` mixed legacy `CLAUDE_FINANCE_API_KEY` naming with `OPENAI_API_KEY`.
- `apps/web/server/env/ai-agent-env.ts` only modeled OpenAI env keys.
- AI simulation availability checks were OpenAI-only and returned `OPENAI_API_KEY` specific copy.
- `packages/providers/src/ai/claude-finance.ts` required `CLAUDE_FINANCE_API_KEY` naming in degraded reasons.
- Error UX already had safe fallback messaging for quota issues, but provider config resolution was fragmented.

## Confusing names found

- `CLAUDE_FINANCE_API_KEY` suggested a separate Claude Finance product key.
- `CLAUDE_FINANCE_PROVIDER_ENABLED` overlapped with future Anthropic provider naming.

## Fallback and quota behavior before this pass

- Missing OpenAI key made the AI simulation agent unavailable.
- Provider quota errors were normalized in UI (`normalizeAgentError`) to safe HOLD fallback copy.
- No centralized primary/fallback provider resolver.

## Fixes applied in this pass

1. Standardized env model in `packages/providers/src/config.ts`:
   - Added `ANTHROPIC_API_KEY`, `ANTHROPIC_PROVIDER_ENABLED`, `OPENAI_PROVIDER_ENABLED`,
     `AI_PRIMARY_PROVIDER`, `AI_FALLBACK_PROVIDER`.
   - Added `resolveAiProviderConfig()` with deterministic resolution and degraded reasons.
   - Kept backward compatibility: `CLAUDE_FINANCE_API_KEY` works as deprecated alias for Anthropic.

2. Updated AI env resolution in `apps/web/server/env/ai-agent-env.ts`:
   - Added `resolveAiAgentProviderConfig()` wrapper for web server usage.

3. Updated AI simulation availability safety in `apps/web/server/services/ai-simulation-agent-service.ts`:
   - Uses centralized resolver.
   - Returns safe unavailable message: `AI provider unavailable. The agent defaulted to HOLD for safety.`
   - Surfaces deprecation warning when legacy alias is used.

4. Updated OpenAI client guard in `apps/web/server/lib/ai/openai-client.ts`:
   - Uses centralized provider resolution.
   - Never leaks raw config-key-specific errors to UI path.

5. Updated optional Claude/Anthropic provider degraded messages in `packages/providers/src/ai/claude-finance.ts`:
   - Prefer Anthropic naming while retaining legacy alias support.

6. Updated UI copy:
   - `.env.example` now documents Anthropic/OpenAI primary/fallback setup and deprecates alias.
   - AI panel copy now includes Anthropic setup hint and safe unavailable default text.
   - Simulation page label updated from “OpenAI-powered” to provider-neutral phrasing.

## Remaining follow-up

- AI simulation execution currently uses OpenAI client path; Anthropic as runtime execution provider is not yet wired.
- Full i18n coverage for any new provider-warning/setup strings can be expanded in a follow-up.
