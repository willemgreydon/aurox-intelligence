# Aurox UI Boundary Rules

Apply to:

- `apps/web/app/**`
- `apps/web/components/**`

## UI Responsibilities

UI may:

- render read models
- show interaction states
- submit server actions
- show risk warnings
- show degraded data states

UI must not:

- call providers
- query DB
- calculate PnL
- calculate risk scores
- calculate signal scores
- mutate portfolios directly
- decide execution eligibility

## Required UX

Financial UI must show:

- simulation vs live context
- data freshness when relevant
- loading states
- empty states
- degraded states
- clear risk language
- no guaranteed return language
