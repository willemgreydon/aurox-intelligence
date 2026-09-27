# Investment Services Intelligence

**Status:** P0 infrastructure pass (foundation). Not yet wired into product UI.
**Packages:** `@repo/api-contracts` (contracts) + `@repo/investment-services` (pure engines).

Investment Services Intelligence is a first-class Aurox domain that reasons about
the full chain **Market → Instrument → Issuer → Investor → Portfolio →
Suitability → Risk → Cost → Tax → Execution → Settlement → Custody → Regulation
→ Evidence → Decision**. This pass builds the correct, deterministic, tested
foundation for the P0 core and leaves clean seams for later bounded contexts.

The single most important design rule: Aurox must never let these collapse into
one number —
> what the market did · what we earned · what we realised · what is taxable ·
> what tax was already withheld · what tax we likely still owe · what to reserve ·
> what is actually ours after estimated tax.

## Architecture

- **Contracts (source of truth):** `packages/api-contracts/src/investment-services/`
  — `money`, `provenance`, `instrument`, `investor`, `suitability`, `cost`, `tax`.
  Re-exported from the package barrel; nothing forks these locally.
- **Engines (pure, deterministic):** `packages/investment-services/src/` — no I/O,
  no hidden state, no `Date.now()`/`Math.random()`. Mirrors the `packages/signals`
  purity contract. `asOf` dates are always passed in.

## Money semantics (decimal-safe)

`Money = { minorUnits: integer, currency, scale }`. All authoritative arithmetic
is on the integer `minorUnits`; the one fractional operation (`applyRatePpm`) is
done in **BigInt** with explicit rounding, never binary float. Values leaving the
JS safe-integer range throw rather than lose precision. Two amounts combine only
when currency and scale match — FX is an explicit, provenance-carrying operation,
never an implicit coercion. `mulMoneyByWholeQuantity` rejects fractional
quantities (fractional-share cost basis is a later pass). See `src/money/money.ts`.

## Tax reserve semantics

`computeTaxReserve(input, policy, asOfIso)` produces an explicit chain:

```
grossRealizedGain → taxableGain → lossOffset → adjustedTaxBase → estimatedTax
 → taxAlreadyWithheld → creditableWithholding → remainingTaxLiability
 → recommendedReserve → afterTaxProfit
```

Invariants:
- **Unrealised gains are never taxed** (an `unrealizedGain` field is accepted only
  so callers can pass a full economic picture; the engine ignores it for tax).
- Missing `grossRealizedGain` → `status: insufficient_information` (never a guess).
- An unmodelled tax asset class → `status: requires_review` (never a fabricated rate).
- Confidence is honest and **downgraded to `low` when the policy is stale**.
- Every result carries `policyVersion`, `appliedRuleIds`, `sources` and `assumptions`.

The portfolio-wide UI seam is `portfolioTaxViewSchema` (gross value, unrealised,
realised, estimated liability, already withheld, reserve, after-tax wealth).

## Tax policy: versioned, source-backed, freshness-aware

`AUSTRIAN_TAX_POLICY` (`version: AT-2026.1`) encodes the verified 2026 BMF baseline:

| Rule | Applies to | Rate | Effective from |
|---|---|---|---|
| `AT-CAP-SPECIAL-275` | securities capital gains, dividends, equity | 27.5% | 2016-01-01 |
| `AT-CRYPTO-275` | crypto (private capital-income regime) | 27.5% | 2022-03-01 |
| `AT-BANK-INTEREST-25` | savings / current-account interest | 25% | 2016-01-01 |

Rules are **data with effective dates**, not `const TAX_RATE = 0.275`. Funds and
non-securitised derivatives are deliberately not encoded → `requires_review`.
`getApplicableRule` selects by class + date; `isPolicyStale(policy, asOf)` lets the
runtime detect *"tax policy requires re-verification"* using `lastVerifiedAt` +
`staleAfterDays` — **no autonomous scraping**; that is a seam, not an implementation.

> **27.5% is current policy DATA (AT-2026.1), not an eternal constant.** Re-verify
> against the primary BMF sources recorded on the policy before relying on it.

## Suitability vs Appropriateness

Two *different* questions, modelled separately:
- **Suitability** (`evaluateSuitability`): does the instrument fit the investor's
  objectives, horizon, risk tolerance, loss capacity, knowledge and complexity?
  Per-dimension verdicts aggregate into `suitable / conditionally_suitable /
  not_suitable / insufficient_information`. **No numeric suitability score.**
- **Appropriateness** (`evaluateAppropriateness`): does the investor have enough
  knowledge/experience to understand this instrument type? `not_required` for
  non-complex instruments; `insufficient_information` when data is missing.

Crucially, `riskTolerance` (willingness) and `lossBearingCapacity` (ability) are
independent fields with distinct enums — high willingness + no ability is
`not_suitable` for a risky product.

## Cost intelligence

`aggregateCosts` produces a `CostBreakdown` keeping the four disclosure axes
separate (explicit/implicit · one-off/recurring · service/product ·
ex-ante/ex-post) and the gross → net-before-tax → net-after-tax chain. Tax is
never folded into service/product cost.

## Provenance & epistemics

`epistemicKind` distinguishes fact / derived_metric / model_output / policy_rule /
assessment / recommendation so they can never be stored as indistinguishable
"insights". `outputIntent` is the advice-vs-information seam for a later policy
layer. `sourceReference` carries temporal validity and `verifiedAt`; `dataQuality`
makes missing data explicit (`unknown`/`stale`/`unsupported`) — never zero.

## Tests

`packages/investment-services/src/__tests__/` — 35 deterministic tests covering
money precision/rounding, the full Austrian tax matrix (27.5% €1,000→€275 reserve /
€725 after-tax; unrealised → zero; already-withheld; loss offset; insufficient
info; 25% bank-interest distinction; effective-date crypto selection; stale policy;
foreign withholding separate vs creditable; provenance), FIFO lot matching, loss
offsetting by income category, suitability (all four statuses + willingness≠ability),
appropriateness, and cost aggregation.

## Known limitations / intentionally unsupported (seams only)

Issuer/credit, resolution/bail-in, custody, investor protection, FX P&L engine,
execution 2.0 / best execution, settlement, corporate actions, sustainability data
coverage, conflicts, regulatory rule encoding beyond the AT tax baseline, the
knowledge graph, DB persistence/migrations, and all UI wiring are **not** built in
this pass. Existing simulation (float-based) accounting is untouched. Fractional-
share tax-lot precision is deferred.

## Next recommended passes

1. Persist `InvestorProfile` (versioned) + `TaxLot` in `packages/db` behind
   repositories; wire the read path Query → Mapper → Service → Route → UI.
2. A portfolio-wide tax view service producing `PortfolioTaxView` from real
   simulation positions/transactions.
3. Issuer/credit + custody + investor-protection bounded contexts (P1).
4. FX P&L attribution and execution/best-execution intelligence (P1).
