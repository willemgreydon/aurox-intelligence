# AI in Finance

This document defines how AI should be used inside Aurox Intelligence.

## AI Role in Aurox

AI augments analysis and UX guidance, but deterministic systems remain authoritative for execution and accounting.

## Approved AI Use Cases

- recommendation summarization
- explainability generation
- signal narrative support
- anomaly triage assistance
- operator productivity workflows

## Disallowed AI Behaviors

- direct unreviewed live execution
- replacing deterministic accounting with probabilistic output
- hiding low-confidence model uncertainty

## Design Principles

1. Deterministic Core, Probabilistic Assist
- execution and persistence logic stay deterministic
- AI outputs are advisory unless policy says otherwise

2. Explicit Confidence
- every AI recommendation should include confidence and rationale

3. Traceability
- recommendation provenance should be recoverable from route/service context

4. Human Override
- final order actions stay human-triggered in current state

## Integration Points

- `packages/ai-market-intelligence`
- `packages/agents` workflows
- server mappers/services for route-level narratives

## Quality Controls

- contract-typed AI payloads
- bounded prompt scopes
- deterministic fallback when AI payload invalid

## Future Direction

- model-assisted portfolio review summaries
- scenario explanations linked to forecast drivers
- tighter governance for autonomous behavior with multi-stage approvals
