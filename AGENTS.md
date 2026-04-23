# AI Coding Agent Rules

- Preserve monorepo boundaries.
- Do not move provider logic into UI layers.
- Do not move forecasting logic into route handlers or components.
- Keep DB access inside `packages/db`.
- Keep canonicalization in `packages/ingestion`.
- Keep analytics logic pure in `packages/signals` and `packages/forecasting`.
- Use shared contracts from `packages/api-contracts`.
- Validate boundaries with Zod.
- Prefer smaller, coherent vertical slices over fake enterprise filler.
