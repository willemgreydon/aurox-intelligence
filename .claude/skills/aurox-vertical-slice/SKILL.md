---
name: aurox-vertical-slice
description: Implement a safe vertical slice in Aurox while preserving contracts, monorepo boundaries, and production realism.
allowed-tools: Read, Grep, Glob, LS, Edit, MultiEdit, Write, Bash
---

# Aurox Vertical Slice Skill

Use this skill when implementing a feature that touches multiple layers.

## Procedure

1. Identify domain:
   - market data
   - simulation
   - execution
   - portfolio
   - risk
   - UI
   - provider
   - auth
   - reporting

2. Inspect existing files:
   - contracts
   - package exports
   - DB repositories
   - web query/mapper/service
   - route and components
   - tests

3. Preserve architecture:
   - contracts first
   - package logic second
   - web orchestration third
   - UI last

4. Implement smallest safe slice:
   - avoid broad rewrites
   - avoid unrelated refactors
   - avoid fake enterprise filler

5. Add or update:
   - types
   - Zod schemas
   - repository logic
   - service/mappers
   - UI read models
   - docs if behavior changed

6. Verify:
   - package typecheck
   - targeted tests
   - build if route-level change

## Output Summary

End with:

```text
Files changed:
- ...

Architecture preserved:
- ...

Verification:
- ...

Residual risks:
- ...

Next recommended step:
- ...
```
