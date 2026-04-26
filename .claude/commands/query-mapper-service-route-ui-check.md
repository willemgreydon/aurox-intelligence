# /query-mapper-service-route-ui-check

## Purpose
Verify that a specific screen or feature follows the canonical Query → Mapper → Service → Route → UI read pattern.

## When to Use
- When reviewing a new route or screen
- When refactoring a screen that directly calls providers or DB
- After adding a new read model

## Claude Code Prompt

```text
Verify the Query → Mapper → Service → Route → UI pattern for a screen.

Screen to check: [USER PROVIDES: e.g. "/invest/portfolio" or "market discovery page"]

Trace each layer:

1. Query (apps/web/server/queries/)
   - Is there a dedicated query file?
   - Does it gather raw data from package boundaries (no formatting)?
   - Does it avoid route-specific formatting?

2. Mapper (apps/web/server/mappers/)
   - Is there a mapper that converts query output to a view model?
   - Does it format display-ready values?
   - Does it keep components simple?

3. Service (apps/web/server/services/)
   - Is there a service that orchestrates query and mapper?
   - Does it handle fallback states?
   - Is the route-facing contract explicit?

4. Route (apps/web/app/)
   - Does the route only call the service?
   - Does it pass the view model to UI?
   - Is there any inline data fetching?

5. UI (apps/web/components/)
   - Is it rendering a read model?
   - Is there any domain calculation in the component?

Report:

Read Pattern Check: <screen name>
==================================
Query: present / missing
Mapper: present / missing
Service: present / missing
Route: compliant / inline fetching (violation)
UI: clean / domain logic in component (violation)

Violations:
- ...

Recommended refactor:
1. ...
```

## Validation Commands
```bash
pnpm build:web
```

## Expected Output
Layer-by-layer compliance check with specific fixes for any violations.

## Safety Notes
- Domain logic in UI components is always a violation, even for "simple" calculations.
