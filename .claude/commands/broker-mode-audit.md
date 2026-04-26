# /broker-mode-audit

## Purpose
Audit the broker adapter configuration to ensure simulation is default and live paths are gated.

## When to Use
- After changes to broker adapter configuration
- Before any live trading work
- When the execution mode appears incorrect

## Claude Code Prompt

```text
Audit Aurox broker mode configuration and adapter wiring.

Check packages/agents/src/:
1. What is the default execution target? (should be simulation)
2. Is there a hard-coded or config-driven mode selector?
3. Can live execution be activated via environment variable alone, or does it require explicit readiness gate?
4. Is the broker adapter interface clearly separated from the simulation adapter?

Check the adapter routing:
5. Is there a broker-supervisor-agent.ts or equivalent that routes to simulation vs live?
6. Can the routing be overridden without code change to enable live?
7. Is paper trading mode supported and distinct from simulation?

Check environment config:
8. What env vars control broker mode?
9. Are they documented in .env.example?
10. Is the default value simulation-safe?

Report:

Broker Mode Audit
=================
Default execution mode: simulation / paper / live (EXPECTED: simulation)
Live activation requires: env var only (RISK) / readiness gate (SAFE)
Broker adapter separation: clear / mixed

Broker mode env vars:
- <VAR_NAME>: default=<value>, description=<desc>

Risks:
- ...

Recommended hardening:
1. ...
```

## Validation Commands
```bash
pnpm --filter @repo/agents typecheck
```

## Expected Output
Clear picture of how broker mode is controlled and any risks.

## Safety Notes
- Simulation must be the default. Live must require an explicit gated action.
