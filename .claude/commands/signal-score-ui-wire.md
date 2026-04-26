# /signal-score-ui-wire

## Purpose
Wire a signal score from the signal package through to UI display following the canonical read path.

## When to Use
- Adding a new signal that needs to appear on an asset card or detail page
- Signal exists in packages/signals but is not showing in UI

## Claude Code Prompt

```text
Wire a signal score through to the Aurox UI.

Signal to wire: [USER PROVIDES: e.g. "momentum signal score for stocks"]

Follow the canonical read path:
1. Verify the signal function exists in packages/signals/ and returns SignalOutput
2. Add signal output to the relevant Zod contract in packages/api-contracts/
3. Add a query in apps/web/server/queries/ that fetches and computes the signal
4. Add signal fields to the mapper in apps/web/server/mappers/
5. Add signal to the service read model in apps/web/server/services/
6. Pass signal to the route in apps/web/app/
7. Render signal score and explanation in the UI component
8. Show confidence as a visual cue (e.g. muted text for low confidence)

Rules:
- Signal score must not be computed inside React components
- Explanation must be surfaced, not hidden
- Confidence below a threshold must be visually indicated
- Score must use the -1 to +1 scale

Report:

Signal Wire Report
==================
Files changed:
- packages/api-contracts: <contract added>
- apps/web/server/queries/: <query>
- apps/web/server/mappers/: <mapper>
- apps/web/server/services/: <service>
- apps/web/app/: <route>
- apps/web/components/: <component>

Verification:
pnpm --filter @repo/api-contracts typecheck
pnpm --filter @repo/signals typecheck
pnpm build:web
```

## Validation Commands
```bash
pnpm --filter @repo/api-contracts typecheck
pnpm --filter @repo/signals typecheck
pnpm build:web
```

## Expected Output
Fully wired signal from package to UI with explanations visible.

## Safety Notes
- Signal scores are informational. They must never trigger execution directly.
