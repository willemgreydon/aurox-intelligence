# README and Documentation Update Rule

## Purpose
Significant architecture, API, contract, or safety changes must update the relevant documentation. Stale documentation causes new contributors to implement against outdated patterns.

## Applies To
- `docs/`
- `README.md`
- `CLAUDE.md`
- Package-level `README.md` files

## Rule
Update documentation when:

| Change Type | Update Required |
|---|---|
| New package boundary rule | CLAUDE.md §6 |
| New canonical data flow pattern | `docs/ARCHITECTURE.md` |
| New risk rule or threshold | `docs/RISK.md` + CLAUDE.md §13 |
| New execution path | `docs/EXECUTION.md` + CLAUDE.md §11 |
| New agent workflow | `docs/AGENTS.md` |
| New simulation behavior | `docs/SIMULATION_ENGINE.md` |
| New broker adapter | `docs/BROKER_ADAPTERS.md` |
| New market provider | `docs/DATA_PIPELINE.md` |
| New environment variable | `.env.example` |
| New baseline failure | `CLAUDE.md §4` |
| Fixed baseline failure | Remove from `CLAUDE.md §4` |

Documentation must:
- Describe current state (not planned state)
- Not describe removed features
- Be updated in the same PR as the code change

Documentation may be deferred for:
- Experimental or draft features not yet merged to main
- Internal implementation details that are not cross-package

## Forbidden
- Changing a package's public API without updating its README
- Adding a new required environment variable without updating `.env.example`
- Documenting "future" features as current state
- Architecture docs that describe the system before the current refactor

## Required Pattern
When adding a new provider:
```bash
# 1. Update .env.example
echo "NEW_PROVIDER_API_KEY=your-key-here" >> .env.example

# 2. Update docs/DATA_PIPELINE.md
# Add provider to supported providers list
# Document fallback position in routing chain
# Note any rate limit constraints

# 3. Update CLAUDE.md §14 if routing rules changed
```

## Validation
```bash
grep -r "NEW_FEATURE\|TODO.*docs\|document later" docs CLAUDE.md --include="*.md"
cat .env.example | grep -c "="  # Verify all known vars are listed
```

## Good Example
```markdown
# docs/DATA_PIPELINE.md — updated when adding Tiingo provider
## Supported Providers (updated 2024-01-15)
- polygon (primary for stocks/ETFs)
- tiingo (fallback for stocks/ETFs) ← newly added
- coingecko (primary for crypto)
```

## Bad Example
A new `TIINGO_API_KEY` environment variable added to `packages/providers/src/config.ts` but not added to `.env.example`. Next developer's setup silently fails with a cryptic "provider_not_configured" error.

## Safety Notes
Stale documentation about risk thresholds is dangerous — a developer might implement a new risk check using an outdated threshold from an old document, silently weakening the risk system. Documentation must be treated as part of the change, not an afterthought.
