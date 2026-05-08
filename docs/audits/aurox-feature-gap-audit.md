# Aurox Feature Gap Audit

Date: 2026-05-08  
Scope: Requested Tasks 0-15

## Status Legend
- `integrated`
- `partially integrated`
- `missing`

## Feature Matrix

| Area | Status | Files Found | Proposed Changes |
|---|---|---|---|
| Claude Finance integration | missing | `apps/web/server/lib/ai/openai-client.ts`, `packages/agents/src/intelligence/recommendation-service.ts` | Add `ClaudeFinanceProvider` abstraction, structured analysis schema, degraded fallback, wire into recommendation context as explainable side-input only. |
| Micro Trading mode | partially integrated | `apps/web/server/config/broker-mode-registry.ts`, `docs/live-microtrading/*` | Add feature flag + simulation settings toggle, explicit micro guardrail UX payload and deterministic checks (daily trade cap/confidence/spread/volatility). |
| News stream / ingestion | partially integrated | `packages/providers/src/news/*`, `apps/web/server/queries/news-query.ts`, `apps/web/app/news/page.tsx` | Extend normalized news shape (asset IDs, entities, risk tags), stale handling, richer dedupe, “why this matters” explanation, persistence hooks. |
| Translation / i18n | partially integrated | `apps/web/lib/i18n/messages.ts`, `apps/web/lib/i18n/locales/*.json` | Remove hardcoded strings from major pages/components, add missing empty/loading/error keys, add locale key parity test. |
| Admin monitor / API monitoring | partially integrated | `apps/web/app/admin/monitoring/*`, `packages/db/src/repositories/provider-monitor-config-repository.ts`, `packages/db/src/migrations/0010_provider_monitor_configs.sql` | Add provider runtime health fields (last success/error/latency/status) and explicit monitored toggle behavior in model/UI. |
| NeonDB schema/models for intelligence memory | partially integrated | `packages/db/src/migrations/0008_ai_simulation_agent_audit_tables.sql`, `0009_ai_simulation_agent_audit_metadata_v1.sql` | Add memory tables: snapshots, traces, report artifacts, knowledge chunks + repositories + retention strategy + docs. |
| Signal detail / explainability views | partially integrated | `apps/web/app/signals/page.tsx`, `apps/web/components/signals/*` | Add tabs for history/accuracy/ROI/news impact and richer decision trace metadata. |
| User/account translations | partially integrated | `apps/web/app/account/*`, `apps/web/components/account/*` | Replace hardcoded UI text with locale messages and add missing keys. |
| Stock/ETF/Crypto lane pages | partially integrated | `apps/web/app/invest/stocks/page.tsx`, `apps/web/app/invest/etfs/page.tsx`, `apps/web/app/invest/crypto/page.tsx` | Mobile row/grid responsive fixes, lane-specific KPI blocks, list-mode row semantics, empty/loading/error states. |
| Legal pages | partially integrated | `apps/web/app/legal/*` | Add missing disclaimer pages (simulation, AI, market-data, cookie/tracking, contact/support) with i18n + footer links. |
| Footer layout | partially integrated | `apps/web/components/layout/footer.tsx` | Update to requested 4-column IA and add intelligence/resources/legal targets. |
| Cash currency config | missing (simulation account is USD-only) | `packages/db/src/migrations/0003_simulation_trading_schema.sql`, `packages/api-contracts/src/simulation/simulation.ts`, `packages/db/src/repositories/simulated-trading-repository.ts` | Make simulation account currency configurable, default EUR, preserve quote/account separation and FX fallback messaging. |

## Implementation Notes
- Preserve simulation-first execution and live gating.
- Keep deterministic logic primary; AI/news are explainable secondary adjustments.
- Keep package boundaries (`contracts -> db/providers -> services -> routes/mappers -> ui`).
- Add tests for new core logic and fallback paths.
