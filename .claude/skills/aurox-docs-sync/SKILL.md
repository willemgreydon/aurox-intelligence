---
name: aurox-docs-sync
description: Update Aurox documentation after architecture, execution, risk, provider, or simulation changes.
allowed-tools: Read, Grep, Glob, LS, Edit, MultiEdit, Write
---

# Aurox Docs Sync Skill

Use when implementation changes affect:

- architecture
- execution
- risk
- simulation
- broker adapters
- data pipeline
- market intelligence
- provider behavior
- user account flows
- portfolio flows

## Documentation Targets

Preferred docs:

```text
docs/ARCHITECTURE.md
docs/RISK.md
docs/EXECUTION.md
docs/AGENTS.md
docs/SIMULATION_ENGINE.md
docs/BROKER_ADAPTERS.md
docs/MARKET_INTELLIGENCE.md
docs/DATA_PIPELINE.md
CLAUDE.md
AGENTS.md
```

## Update Format

Every doc update should cover:

- current state
- target state
- invariants
- data flow
- changed files
- failure modes
- rollback strategy
- verification notes
