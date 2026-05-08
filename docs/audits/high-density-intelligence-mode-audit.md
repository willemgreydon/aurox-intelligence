# High-Density Intelligence Mode Audit

Date: 2026-05-08

## Scope audited
- `/market`
- `/observe`
- `/signals`
- `/portfolio/intelligence`
- `/dashboard`
- `/news`
- `/invest/stocks`
- `/invest/etfs`
- `/invest/crypto`
- Header + mega overlay nav
- Workstation shell and sidebar patterns
- Observation engine, persistence, and outcome joins

## Current status summary

### Implemented (strong baseline)
- Simulation-first safety posture (no unsafe auto live execution path in observation surfaces).
- Premium workstation shell for `/market` with collapsible sidebar modules.
- `/observe` with observer feed, timeline, anomaly radar, watchlist intelligence, readiness checks, persistence-aware fallback.
- Observation persistence repository and interaction endpoints (read/pin/dismiss).
- Route-specific loading skeletons across major routes.
- Expanded mega overlay navigation groups (core, markets, intelligence, admin, legal).

### Partially implemented
- Cross-asset awareness exists implicitly (signals/news/risk), but relationship narratives are not first-class.
- Watchlist intelligence is interactive but still route-local and not globally searchable.
- Operator acceleration exists in nav overlays, but no command palette / jump system.
- Density controls (compact/dense/focus mode) are limited and not globally consistent.
- Regime + anomalies are explainable, but deeper “threaded evolution” and replay UX is still shallow.

### Missing / highest-value gaps
- Global command palette (`Ctrl/Cmd + K`) for routes/assets/observations/actions.
- Dedicated cross-asset relationship engine (dependency/cascade narratives).
- Unified high-density mode controls persisted per operator workspace.
- Institutional heatmap/breadth/flow dashboards as reusable workstation panels.
- Advanced replay (before/after snapshots with signal/risk/news drift) beyond current timeline annotations.
- Alert center with grouping/cooldown/correlation.

## Architecture findings
- Existing pattern follows `Query -> Mapper -> Service -> Route -> UI` on most major surfaces.
- Observation orchestration is already centralized in `apps/web/server/services/market-observation-service.ts`.
- Best extension seam for cross-asset intelligence is server lib/service layer (not UI components).
- Best seam for operator speed is shared layout layer (`HeaderClient`) with a pure search helper.

## UI/workflow density findings
- Information density is improved but still fragmented across route switches.
- Context switching between market/observe/signals remains slower than institutional workflows.
- Quick navigation exists in sidebar and mega menu; keyboard-first workflow is missing.
- Some surfaces still show repeated cards where merged actionable summaries would be more efficient.

## Patch plan applied in this iteration
1. Add deterministic cross-asset relationship engine and wire it into `/observe`.
2. Add global command palette (`Ctrl/Cmd + K`) with grouped results and keyboard navigation.
3. Add lightweight density/focus controls in observer workstation context.
4. Add focused tests for:
   - command palette ranking/filtering
   - cross-asset relationship narrative generation

## Next recommended slices
1. Alert center + dedup cooldown engine wired to persisted observation events.
2. Replay surface upgrade with decision-input deltas and outcome windows.
3. Breadth/correlation/flow visualization module set with virtualization/perf guardrails.
4. Saved workspace layouts and dense/pro mode across `/market`, `/observe`, `/signals`.
