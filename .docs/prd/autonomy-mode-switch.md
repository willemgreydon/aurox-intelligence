# AI Autonomy Control — Master Enable/Disable & Per-Lane Activation

**Status:** Draft
**Date:** 2026-06-13
**Owner:** Product
**Parent PRD:** `.docs/prd/aurox-intelligence.md`
**Phase:** Simulation-first (buildable and testable now). Live autonomy is [Roadmap / Gated] behind `assertLiveReadinessGate` and the staged live model (LR-05).
**REQ ID Namespace:** `AUT-xx`

---

## Summary

This feature gives users a trustworthy, safety-asymmetric control surface for AI autonomy: a way to bring all approved lanes into "complete autonomous AI execution mode," and an equally trusted — but deliberately faster and friction-free — way to return to full manual or AI-assisted-human-approval control. The design resolves a direct tension with the master PRD's hard constraint SL-04 ("Autonomy level must be a lane-level setting. A global autonomous mode toggle is forbidden") by making the global master an asymmetric instrument: it is a **safety ceiling and emergency off-switch**, not a per-lane bypass. Turning autonomy OFF is instant and always permitted. Turning autonomy ON is gated, explicit, and per-lane — the global master enable is necessary but not sufficient; each lane must independently pass its readiness conditions before it may operate autonomously.

---

## 1. Problem Statement

### 1.1 User Need: A Trusted Way to Run and Stop Autonomous Execution

Users who have configured strategy lanes, validated signals in simulation, and built confidence in their risk configuration need two capabilities:

**First:** A single, clear control to declare "I have reviewed and approved my eligible lanes; let the system run autonomously now." Without this, users with multiple approved lanes must activate each lane individually, one by one, without a coherent moment that marks the transition from oversight to delegation. This fragmentation makes autonomous mode feel fragile and untrustworthy — users are unsure whether the system is "actually running."

**Second:** An equally clear, instant way to declare "Stop all autonomous activity now; I want to be back in control manually." In any stress event — market anomaly, model drift suspicion, personal decision to re-engage hands-on — the user must be able to stop all autonomous execution in one action, without navigating through per-lane configuration screens under pressure.

### 1.2 The Trust Gap Amplified in Autonomous Mode

The master PRD identifies that approximately 62% of systematic retail traders abandon algorithmic approaches within three months of going live. A core driver is that the transition from human-managed to autonomous execution is unstructured and hard to reverse cleanly. If the "turn it off" action is as complicated as the "turn it on" action, users pre-emptively avoid delegation entirely — defaulting to permanent manual mode and extracting none of the efficiency benefit of the autonomous capability.

The design of this feature directly attacks the return-path friction. Deactivation must be so immediate and trustworthy that users feel safe enabling autonomy in the first place.

### 1.3 The Regulatory Requirement for a Human Oversight Mechanism

EU AI Act Article 14 (human oversight) requires that high-risk AI systems include mechanisms enabling human operators to intervene and halt operation. A clearly designed, always-accessible deactivation control — that is prominently positioned and takes effect without delay — is both a product UX requirement and an EU AI Act-aligned mandatory feature.

---

## 2. Design Principle: The Autonomy Asymmetry

This is the central design principle of the feature and must be carried through every requirement, every UI interaction, and every implementation decision.

### 2.1 OFF Is Always Permitted, Instant, and Safety-Positive

Deactivating autonomy — returning all lanes to non-autonomous operation — is:

- **Available at any time** with no precondition, no readiness gate, and no multi-step flow.
- **Instant** in effect: no new autonomous orders may be submitted from the moment the action commits to the DB; in-flight autonomous order loops are interrupted on their next scheduling cycle.
- **Single-confirm** UX: one confirmation dialog, no multi-step wizard.
- **Modeled as a kill-switch variant** in the DB: same durability guarantees (survives restarts), same audit event, same fail-closed semantics as the existing per-lane and global kill switch.
- **Always recoverable** (re-enabling is always possible, just gated).

This is equivalent to the existing kill switch (RG-04), extended to scope "all autonomous submission loops for this account."

### 2.2 ON Is Gated, Explicit, and Per-Lane

Enabling "complete autonomous mode" — the aggregate state in which all eligible and approved lanes run at `ai_autonomous_limited` (Level 2) — is:

- **Not a one-click action.** The global master enable is the prerequisite ceiling; it does not grant autonomy to any lane by itself.
- **Per-lane gated.** Each lane must independently be configured at Level 2 (`ai_autonomous_limited`), pass its own preflight checks (risk envelope valid, minimum confidence threshold met, kill switch armed, data freshness confirmed, capital within cap), and be explicitly approved by the user.
- **Simulation-only initially.** In the current phase, autonomous loops run against the simulation ledger. Live autonomy remains gated behind `assertLiveReadinessGate` and LR-05 stages.
- **Requiring re-confirmation** after deactivation or session expiry. The halted state is sticky: it does not passively expire. Re-enabling always requires an explicit action (see RG-05).

### 2.3 "Complete Autonomous Mode" Is a Derived State, Not a Toggle

"Complete autonomous mode" is the **observed operational outcome** in which:

1. The global Autonomy Ceiling is set to `ENABLED` (sim or live), AND
2. At least one lane has `autonomyLevel = ai_autonomous_limited`, AND
3. That lane's per-lane readiness checks pass continuously at scheduling time.

It is the union of approved per-lane states ANDed with the global ceiling — not a separate mode that bypasses them. The UI may display "AI Running Autonomously" as a derived status badge, but no record in the DB stores "complete_autonomous_mode" as a field. The source of truth is the combination of global ceiling + per-lane config.

### 2.4 Explicit Reconciliation with SL-04

Master PRD SL-04 states: "Autonomy level must be a lane-level setting. A global autonomous mode toggle is forbidden."

This feature does NOT create a toggle that overrides per-lane settings. The global master control:

- When set to `OFF`: overrides all per-lane autonomy levels to non-autonomous (ceiling drops to L0/L1). Lanes retain their configured `autonomyLevel` in the DB; it is simply not effective while the ceiling is `OFF`. On re-enable, per-lane configs are restored.
- When set to `ENABLED`: raises the ceiling to permit per-lane autonomy up to the account's max allowed level. Does NOT grant autonomy to any lane that has not been individually configured and approved.

This satisfies SL-04 because the per-lane setting remains the authoritative grant of autonomy. The global master is a ceiling and emergency off, consistent with established kill-switch semantics (RG-04, SL-03).

---

## 3. Goals

| # | Goal |
|---|---|
| G-AUT-1 | Give users a single, trustworthy control surface to transition all approved autonomous lanes into active operation ("complete autonomous mode"), with a clear pre-flight summary of what will be activated. |
| G-AUT-2 | Give users an instant, always-accessible single-confirm off control that halts all autonomous order submission across all lanes, restoring full manual/assisted operation. |
| G-AUT-3 | Make re-enabling after a halt require explicit, preflight-gated confirmation — never passive — consistent with RG-05. |
| G-AUT-4 | Surface real-time per-lane autonomy status so users always know which lanes are running autonomously, which are in AI-assisted mode, and which are manual. |
| G-AUT-5 | Ensure that the full standard risk gate (`runPreTradeRiskCheck`) remains mandatory on every autonomous order — autonomy never bypasses risk guards. |
| G-AUT-6 | Implement and validate the full feature in simulation first; structure the live path to be gated behind existing `assertLiveReadinessGate` without any new safety compromise. |
| G-AUT-7 | Produce an EU AI Act-aligned audit trail for every autonomy state transition — who changed what, when, from what prior state, with what preflight evidence. |

---

## 4. Non-Goals

| Non-Goal | Rationale |
|---|---|
| A one-click global "make all lanes autonomous" that skips per-lane readiness or configuration | Explicitly prohibited by SL-04; the master enable is a ceiling, not a lane-bypass |
| AI-initiated fund movement | BK-04 is absolute: fund transfers always require explicit human authorization, regardless of autonomy level |
| Level 3 `ai_autonomous_expanded` autonomy in this scope | Out of scope for this feature; L3 requires stronger reconciliation and compliance maturity not yet available |
| Autonomous execution bypassing `runPreTradeRiskCheck` | Autonomy never bypasses the risk gate; the gate is mandatory on every order, autonomous or not (RG-01, RG-03) |
| Enabling live autonomy ahead of `assertLiveReadinessGate` and LR-05 stage sequence | Live autonomy is Roadmap / Gated; this feature ships the control surface and simulation-side autonomous loops first |
| Passive re-enabling: autonomy resuming automatically after a timeout or session expiry | Re-enabling is always an explicit confirmed action (RG-05) |
| Level 2 autonomy for assets unsupported by the configured broker | Lane autonomy is bounded by the broker's supported instruments and the lane's `allowedAssetClasses` and `allowedSymbols` config |
| AI (including Claude Finance) as execution decision authority | AI output is a side-input signal with its own confidence score; the deterministic risk gate and lane policy are always the dispositive authority |

---

## 5. Personas Affected

### 5.1 Marta — The Small Systematic Operator (Primary)

Marta has three strategy lanes configured in simulation. She has spent weeks validating signal behavior and risk envelopes. She is ready to let the system run autonomously across all three lanes simultaneously. Her primary concerns are:

**What she needs from autonomy control:**
- A coherent "go autonomous" moment that gives her confidence all three lanes are actually running — not a per-lane activation fragmented across three separate config screens.
- A kill control that works under pressure. When something looks wrong, she does not want to navigate through settings to stop the system.
- Confidence that autonomy is not bypassing her risk caps. The system running autonomously should feel safer, not more exposed, because the risk gate is always active.

**Her fear:** The system goes autonomous and she cannot tell whether it is actually submitting orders, or the kill switch is really working, or her capital cap is actually being enforced.

**What success looks like:** From the /invest dashboard, she can see "3 lanes running autonomously" with a live order count, a deactivate button one click away, and per-lane status panels showing the last order, the last risk gate result, and the current drawdown against her cap.

---

### 5.2 Sione — The Serious Self-Directed Investor (Secondary)

Sione has one strategy lane. He runs it in AI-assisted mode (Level 1) most of the time — he reviews the AI's proposals and approves order by order. Occasionally he wants to let it run autonomously for a few hours while he is away from the desk.

**What he needs from autonomy control:**
- An easy path to flip a single lane into autonomous mode with confidence that it will stop on its own if a risk cap is breached.
- An easy path back to AI-assisted mode when he returns.
- Visibility in the audit trail of what the system did while autonomous.

**His fear:** He enables autonomy, goes offline, and comes back to find more orders than he intended, or a drawdown he did not authorize.

**What success looks like:** His lane shows "Autonomous (6 orders today, drawdown 1.2% vs 5% cap, next cadence in 8 min)." Returning to manual is one confirm. The audit log shows every order the system placed autonomously with the signal, the risk gate result, and the confidence score that informed each.

---

### 5.3 Operator/Admin (Guardian)

The operator monitors accounts across the platform. They need to be able to inspect the global autonomy ceiling state and per-lane autonomy levels for any account, and to trigger an operator-level halt without access to the user's account password.

**What they need:**
- Admin interface showing autonomy ceiling state per account and active autonomous lanes.
- Ability to trigger an operator-level autonomy halt on any account.
- Audit log of all autonomy transitions, including operator-initiated halts.

**What success looks like:** `/admin/monitoring` shows a panel: "Accounts with autonomous lanes: 2. Global ceiling: ENABLED-SIM for both. Operator halt available." With one action, the operator can halt all autonomous activity for a specific account and the system logs the event with the operator's identity.

---

## 6. Mode Model and State Machine

### 6.1 Global Autonomy Ceiling States

| State | Description | Autonomous orders permitted? |
|---|---|---|
| `CEILING_OFF` | Global autonomy ceiling is OFF. No lane may execute autonomously regardless of per-lane config. All lanes operate at max Level 1 (`ai_suggested_human_approval`). | No |
| `CEILING_ENABLED_SIM` | Global ceiling is enabled for simulation. Per-lane autonomous config is active for simulation execution target. Live autonomous execution remains blocked. | Simulation only |
| `CEILING_ENABLED_LIVE` | Global ceiling is enabled for live. Per-lane autonomous config is active for live execution target (requires all LR-05 gates to have passed). | Simulation + Live |

**Default state at account creation:** `CEILING_OFF`.

**Transitions:**

```
CEILING_OFF
  → CEILING_ENABLED_SIM    : User action: master enable (sim preflight passes) + confirm
  → CEILING_ENABLED_LIVE   : [Roadmap/Gated] User action: master enable (live readiness gate passes) + confirm

CEILING_ENABLED_SIM
  → CEILING_OFF            : User/operator action: deactivate + single confirm (instant, no gate)
  → CEILING_ENABLED_LIVE   : [Roadmap/Gated] Live readiness gate passes + confirm

CEILING_ENABLED_LIVE
  → CEILING_OFF            : User/operator action: deactivate + single confirm (instant, no gate)
  → CEILING_ENABLED_SIM    : [Roadmap] Operator demotes live autonomy to sim-only
```

### 6.2 Per-Lane Autonomy Levels (From `lane-autonomy-model.md`)

| Level | Name | Description | Autonomous orders? |
|---|---|---|---|
| L0 | `manual_only` | AI may analyze; user explicitly submits every order. No autonomous execution. | No |
| L1 | `ai_suggested_human_approval` | AI proposes; user approves per-order or within a bounded session policy. All submissions are human-gated. | No |
| L2 | `ai_autonomous_limited` | AI submits orders within the strict lane envelope; immediate halt on lane or global constraint breach. Operator intervention always available. | Yes (bounded) |
| L3 | `ai_autonomous_expanded` | (Future) Broader autonomy under stronger reconciliation/compliance maturity. | [Future] |

### 6.3 Effective Autonomy: Ceiling × Lane Config

The **effective** autonomy of a lane is `min(global_ceiling, lane_configured_level)`:

| Global Ceiling | Lane Config | Effective Level | Autonomous orders? |
|---|---|---|---|
| `CEILING_OFF` | L2 | L1 (ceiling caps to L1) | No |
| `CEILING_OFF` | L0 or L1 | L0 or L1 | No |
| `CEILING_ENABLED_SIM` | L0 | L0 | No |
| `CEILING_ENABLED_SIM` | L1 | L1 | No |
| `CEILING_ENABLED_SIM` | L2 | L2 (sim only) | Yes (simulation) |
| `CEILING_ENABLED_LIVE` | L2 + live gate passed | L2 (live) | Yes (live) [Roadmap] |

**"Complete autonomous mode"** is the observed state when the ceiling is `CEILING_ENABLED_SIM` (or `CEILING_ENABLED_LIVE`) AND at least one lane is configured at L2 and passes per-scheduling-cycle preflight checks.

### 6.4 Per-Lane Preflight Checks (Required Before Each Autonomous Schedule Cycle)

In addition to the per-order `runPreTradeRiskCheck`, the autonomous scheduling loop must verify per cycle:

| Check | Condition to proceed |
|---|---|
| Global ceiling | Must be `CEILING_ENABLED_SIM` or `CEILING_ENABLED_LIVE` |
| Global halt state | `isHalted` must be `false` |
| Lane kill switch | `laneKillSwitchEnabled` and no active halt on this lane |
| Data freshness | Latest quote for lane's symbols must not be stale beyond threshold |
| Signal confidence | Latest signal confidence ≥ lane's `minSignalConfidenceForAutonomy` |
| Daily loss cap | Lane's realized + unrealized loss today must not exceed `maxDailyLoss` |
| Cadence | Time since last autonomous order ≥ `cooldownSeconds`; orders in rolling window ≤ `maxOrdersPerHour` |
| Rejection ratio | Recent rejection ratio in rolling window must be below `maxRejectionRatioPct` |
| Connectivity | Provider health confirms non-degraded data feed |

If any check fails: skip this scheduling cycle, log the skip reason, do not halt the global ceiling unless the failure is a critical condition (see AUT-28).

---

## 7. User Journeys

### Journey A: Enabling Complete Autonomous Mode (Simulation)

**Current state (pain):**
1. User wants all three lanes running autonomously. There is no global summary of which lanes are eligible.
2. User must navigate to each lane's configuration screen individually.
3. There is no "preflight" moment that shows what would happen if they activated — they must trust the configuration is correct.
4. Once lanes are active, there is no single status view confirming autonomous activity.

**Desired state:**
1. User navigates to `/invest/autonomy` (or the autonomy section of `/invest/settings`).
2. The page shows: **Global Autonomy Ceiling: OFF.** Below it, a table of all configured lanes with columns: Lane Name | Current Level | Eligible for Autonomous (L2 configured?) | Preflight Status.
3. User reviews the preflight summary. For each L2-eligible lane: "Capital within cap ✓ | Signal confidence 0.71 ✓ | Kill switch armed ✓ | Data fresh ✓."
4. Any lane failing preflight is shown with the blocking reason and a link to fix it. That lane will not activate autonomously.
5. User clicks **"Enable Autonomous Mode (Simulation)"**. A confirmation dialog appears:
   - "This will activate autonomous order submission for 2 of your 3 lanes (Lane C is blocked: signal confidence below threshold). Orders will be submitted within each lane's risk envelope. You can deactivate instantly at any time."
   - Two buttons: **Cancel** | **Enable Autonomous Mode**
6. User confirms. Server action sets `global_autonomy_ceiling = CEILING_ENABLED_SIM` in the DB. System event logged.
7. Page transitions. The header badge changes from "Manual" to **"AI Running — 2 Lanes Active."** A deactivate button is prominently visible.
8. Per-lane status panels show: last order timestamp, orders today, daily P&L vs cap, next scheduled cycle.
9. Lane C remains at L1 (AI-suggested). No autonomous orders are submitted for it.

---

### Journey B: Deactivating Autonomy — Returning to Manual Per-Lane Control

**Current state (pain):**
1. User wants to stop autonomous activity. Must navigate per-lane to change config.
2. Under stress (market event, unexpected drawdown), multi-step navigation is dangerous.

**Desired state:**
1. From **any page** in `/invest`, the header shows the **"AI Running" badge** with a visible **"Deactivate"** button or link.
2. User clicks Deactivate. A single confirmation dialog:
   - "This will immediately stop all autonomous order submission. In-flight submissions will be cancelled. Existing positions will be held for your manual management. Your lane configurations are preserved and can be re-enabled."
   - Two buttons: **Cancel** | **Stop All Autonomous Activity**
3. User confirms. Server action sets `global_autonomy_ceiling = CEILING_OFF` in the DB. System event logged.
4. All autonomous scheduling loops check the ceiling on their next cycle and do not submit. Any currently pending autonomous orders (submitted to the broker but not yet confirmed) are cancelled where cancellable; uncancellable orders are flagged for human review.
5. Existing open positions are NOT automatically closed. They are held for manual management.
6. The header badge changes to **"Manual Control."** Deactivation is confirmed with a timestamp: "Autonomous activity stopped at 14:32:07. Review your open positions."
7. Each lane's effective level drops to L1 (or L0 if configured at L0). Lane config in the DB is unchanged — the ceiling is now `CEILING_OFF`.

---

### Journey C: Automatic Halt (Guard Breach) and Explicit Re-Enable

**Current state (pain):**
1. No automatic halt mechanism exists for breached guards in autonomous mode.
2. No structured re-enable path exists; users do not know what happened or what must change.

**Desired state:**
1. An autonomous lane's daily loss limit is reached (`maxDailyLoss` breached at 16:14:02).
2. The autonomous scheduling loop detects the breach on its next preflight check. It sets `laneKillSwitchEnabled = halted` for that lane. A system event is logged: "Lane [ID] autonomous halt — daily loss cap breached."
3. The `/invest` dashboard shows an alert banner: "Lane [Name] autonomous activity halted — daily loss limit reached. Review required before re-enabling."
4. If the user clicks the per-lane "Review & Re-enable" path:
   - System shows the halt event, the exact condition that triggered it, the current drawdown vs cap, and the signal state.
   - A preflight check is run in real-time. All checks must pass before re-enabling is offered.
   - If the daily loss cap is still breached (and today's session is not over), re-enabling is blocked: "Cannot re-enable: daily loss cap still exceeded. Re-enable will be available after [next trading session / when PnL recovers above threshold]."
   - If the user has manually adjusted the lane's risk config (e.g., increased the cap, or the PnL has recovered), and all preflight checks now pass, the **"Re-enable Autonomous (This Lane)"** button becomes available.
5. User clicks re-enable. A confirmation dialog reminds them of the condition that triggered the halt and asks for explicit confirmation.
6. Lane resumes autonomous operation. System event logged: "Lane [ID] autonomous activity re-enabled by user [ID] at [timestamp] following halt review."

---

## 8. Functional Requirements

### 8.1 Global Autonomy Master Control

| REQ ID | Requirement | Priority | Status | Cross-ref |
|---|---|---|---|---|
| AUT-01 | The system must maintain a `global_autonomy_ceiling` field per account in the DB (not in-memory). Valid values: `CEILING_OFF`, `CEILING_ENABLED_SIM`, `CEILING_ENABLED_LIVE`. Default at account creation: `CEILING_OFF`. | Must | Gap | SL-04, RG-04 |
| AUT-02 | The global ceiling must be read by every autonomous scheduling loop before submitting any order. If the ceiling is `CEILING_OFF`, no autonomous order may be submitted regardless of lane config. | Must | Gap | SL-04 |
| AUT-03 | The global ceiling state must survive process restarts. It must be stored in the DB and reloaded on startup — never held in-memory only. | Must | Gap | RG-04 |
| AUT-04 | Setting the ceiling to `CEILING_OFF` (deactivation) must execute via a privileged server action, take effect immediately on DB write, and not require any readiness gate or preflight. Single user confirmation is the only required friction. | Must | Gap | RG-04, RG-05 |
| AUT-05 | Setting the ceiling to `CEILING_ENABLED_SIM` (activation) requires: (a) user to review per-lane preflight summary, (b) one explicit confirmation, (c) a server-side preflight that confirms at least one lane is configured at L2 and passes per-lane checks. If no lane passes preflight, the master enable must be blocked with a clear explanation. | Must | Gap | SL-04, LR-01 |
| AUT-06 | Setting the ceiling to `CEILING_ENABLED_LIVE` is Roadmap / Gated. It must require `assertLiveReadinessGate` to pass for every live-target lane, plus the master LR-01 conditions. This transition is not available in the simulation-first phase. | Must | Roadmap | LR-01, LR-05 |
| AUT-07 | Every ceiling state transition must be logged as a system event with: account ID, previous state, new state, actor (user ID or operator ID), timestamp, and the preflight summary at time of transition. | Must | Gap | AO-05 |
| AUT-08 | The global ceiling state must be inspectable by an operator from `/admin/monitoring` without accessing user account credentials. | Must | Gap | AO-04 |
| AUT-09 | Operators must be able to trigger a ceiling-level halt (set to `CEILING_OFF`) on any account from the admin interface. This operator halt must be logged with the operator's identity and reason. | Must | Gap | AO-04 |

---

### 8.2 Per-Lane Autonomy Activation

| REQ ID | Requirement | Priority | Status | Cross-ref |
|---|---|---|---|---|
| AUT-10 | Each lane must have an `autonomy_level` field in the DB (`manual_only`, `ai_suggested_human_approval`, `ai_autonomous_limited`, `ai_autonomous_expanded`). This is the per-lane configured level — the ceiling modulates the effective level. | Must | Roadmap | SL-04 |
| AUT-11 | The effective autonomy of a lane is `min(global_ceiling_permits_level, lane_configured_level)`. When the ceiling is `CEILING_OFF`, all lanes operate at max L1 regardless of their configured level. | Must | Gap | SL-04 |
| AUT-12 | Setting a lane to `ai_autonomous_limited` (L2) must require per-lane preflight checks to pass: capital within cap, signal confidence ≥ lane minimum, kill switch armed, data fresh. The UI must show which checks passed and which failed before activation. | Must | Gap | LR-01, RG-01 |
| AUT-13 | A lane whose kill switch is in `halted` state must not execute autonomously even if the global ceiling is `CEILING_ENABLED_SIM`. The per-lane halt overrides the global ceiling for that lane only. | Must | Gap | SL-03, RG-04 |
| AUT-14 | Lane autonomy configuration changes must be persisted via a server action with Zod validation of all lane config fields. No lane config may be changed directly from client-side state. | Must | Gap | SL-04 |
| AUT-15 | A per-lane autonomy status panel must show (in real time or near-real time): current effective level, last order timestamp, orders today, daily P&L vs daily loss cap, current drawdown vs max drawdown cap, cadence state (time until next eligible cycle). | Must | Gap | SL-06 |

---

### 8.3 Enable Path and Gating

| REQ ID | Requirement | Priority | Status | Cross-ref |
|---|---|---|---|---|
| AUT-16 | The autonomy enable flow must present a "What Will Happen" preview before confirmation: a table of lanes, their configured level, their preflight status (pass/fail with reason), and whether they will activate autonomously or remain at L1/L0. Lanes that will not activate must be explained. | Must | Gap | — |
| AUT-17 | The enable confirmation dialog must explicitly state the execution target (Simulation or Live), the number of lanes that will become autonomous, and include the sentence "You can deactivate instantly at any time." | Must | Gap | UX-01 |
| AUT-18 | After master enable, the system must run per-lane preflight checks on each autonomous-configured lane before its first scheduling cycle, not in advance of the cycle (to ensure checks are current). | Must | Gap | AUT-05 |
| AUT-19 | For live autonomy [Roadmap]: the enable flow must additionally surface the LR-04 audit export link ("Your simulation history for this lane") and require a separate "I have reviewed the simulation history" acknowledgment step before the live enable confirmation. | Must | Roadmap | LR-04, LR-05 |

---

### 8.4 Deactivate / Halt Path

| REQ ID | Requirement | Priority | Status | Cross-ref |
|---|---|---|---|---|
| AUT-20 | A "Deactivate Autonomous Mode" control must be accessible from the `/invest` dashboard header, the per-lane status panel, and the `/invest/autonomy` settings page. It must not require navigation to a deeply buried settings page. | Must | Gap | RG-04 |
| AUT-21 | The deactivation action must take effect on DB write (before the HTTP response returns). The autonomous scheduling loops must check the ceiling on every scheduling tick and stop immediately when `CEILING_OFF` is read. Target: no new autonomous order submission initiated more than one scheduling tick (≤30 seconds) after deactivation DB write. | Must | Gap | RG-04 |
| AUT-22 | Deactivation must cancel any autonomous orders that are in `PENDING` state (not yet submitted to broker) at the moment of halt. Orders in `SUBMITTED` state (already sent to broker) must be flagged for user review — they cannot be automatically recalled once submitted. The user must be notified of any in-flight orders requiring manual attention. | Must | Gap | order-lifecycle-rule |
| AUT-23 | Deactivation must NOT automatically close or liquidate existing open positions. All open positions are held for manual management. This must be stated explicitly in the deactivation confirmation dialog. | Must | Gap | BK-04 |
| AUT-24 | After deactivation, the UI must display: confirmation timestamp, number of autonomous orders cancelled (if any), number of in-flight orders requiring manual attention (if any), and the current open positions requiring manual management. | Must | Gap | AUT-22 |
| AUT-25 | An automatic halt triggered by a guard breach (daily loss cap, rejection rate spike, connectivity failure, reconciliation drift) must behave identically to a manual deactivation for the affected scope (lane halt for a per-lane breach; global halt for a global breach), and must notify the user with the breach reason. | Must | Gap | RG-04, SL-03 |
| AUT-26 | Re-enabling after any halt (manual or automatic) must require an explicit user action. The halted state must not passively expire. The system must not resume autonomous activity without a new user-confirmed enable action that passes current preflight checks. | Must | Gap | RG-05 |

---

### 8.5 In-Flight and Open-Position Handling on Deactivation

| REQ ID | Requirement | Priority | Status | Cross-ref |
|---|---|---|---|---|
| AUT-27 | On deactivation, the system must atomically: (1) set `global_autonomy_ceiling = CEILING_OFF` in the DB, (2) cancel all `PENDING` autonomous orders, (3) log a system event. These three operations must succeed together or fail together (transaction). | Must | Gap | repository-transaction-rule |
| AUT-28 | If an autonomous order is in `SUBMITTED` state at deactivation, the system must: (a) flag the order with `autonomous_halt_pending_review = true`, (b) surface a user notification "1 order requires your review," (c) NOT auto-cancel (cancellation attempt on submitted orders must be a separate user action). | Must | Gap | order-lifecycle-rule |
| AUT-29 | Critical automatic halts (connectivity failure, reconciliation drift >threshold, rejection ratio spike) must trigger a global halt (not just a per-lane halt), activate the global kill switch semantics for execution, and generate an operator-visible alert in `/admin/monitoring`. | Must | Gap | kill-switch-rule |

---

### 8.6 Risk-Guard Enforcement Under Autonomy

| REQ ID | Requirement | Priority | Status | Cross-ref |
|---|---|---|---|---|
| AUT-30 | Every autonomous order must pass the full `runPreTradeRiskCheck` (cash availability, max position, drawdown, liquidity, slippage, instrument constraints, confidence threshold, lane permissions, data freshness) before submission. Autonomous execution never bypasses the risk gate. | Must | Gap | RG-01, RG-03 |
| AUT-31 | Autonomous orders must additionally pass the autonomous-specific guards before each submission: daily loss cap check (lane + account), cadence check (cooldown and hourly cap), rejection-ratio check (rolling window), data freshness check (stale data blocks autonomous submit), and signal confidence ≥ lane's `minSignalConfidenceForAutonomy`. | Must | Gap | LR-08 |
| AUT-32 | If `runPreTradeRiskCheck` fails for an autonomous order, the order must be rejected (not retried), the failure must be logged with the full check detail, and the per-lane schedule must apply a cooldown before the next attempt. The failure must NOT halt the lane or global ceiling unless the failure is a critical condition (AUT-29). | Must | Gap | RG-02 |
| AUT-33 | Signal confidence below the lane's `minSignalConfidenceForAutonomy` must block the autonomous order for that scheduling cycle. The system must log "skipped: confidence below threshold" — not counted as a rejection. | Must | Gap | confidence-score-rule |
| AUT-34 | Every autonomous order submission attempt (both accepted and rejected) must be persisted with: input snapshot, allow/deny, reason codes, policy version at time of check, and trace IDs. This record must be immutable (append-only). | Must | Gap | simulation-auditability-rule |
| AUT-35 | AI (including Claude Finance) output must remain a side-input signal with its own confidence score. In autonomous mode, it proposes; the deterministic risk gate disposes. Claude Finance output failing or being unavailable must not halt the autonomous loop — the loop falls back to deterministic signals only. | Must | Gap | AN-09, RG-01 |

---

### 8.7 Audit and Traceability

| REQ ID | Requirement | Priority | Status | Cross-ref |
|---|---|---|---|---|
| AUT-36 | The `simulation_orders` record for autonomous orders must include a `source = "autonomous"` field and a `lane_id` reference. | Must | Gap | simulation-auditability-rule |
| AUT-37 | A dedicated `autonomy_events` table must record every ceiling and per-lane autonomy state transition with: account ID, lane ID (if per-lane), event type (enabled/disabled/halted/re-enabled), actor type (user/operator/system), actor ID, previous state, new state, preflight summary (JSON), timestamp. | Must | Gap | AO-05 |
| AUT-38 | The `/invest/orders` history must visually distinguish autonomous orders from manual orders (a badge or column indicating source). | Must | Gap | SE-07 |
| AUT-39 | The per-lane audit export (extension of LR-04) must include: autonomy events for the lane, per-order source (autonomous/assisted/manual), risk gate results per order, and signal inputs for each autonomous order. | Should | Roadmap | LR-04 |
| AUT-40 | The autonomy events log must be queryable and visible on the `/invest/autonomy` settings page: a timeline of when autonomy was enabled, disabled, halted, and re-enabled, and by whom. | Must | Gap | — |

---

### 8.8 Simulation vs Live Gating

| REQ ID | Requirement | Priority | Status | Cross-ref |
|---|---|---|---|---|
| AUT-41 | In the simulation-first phase, `CEILING_ENABLED_SIM` is the maximum ceiling state available. `CEILING_ENABLED_LIVE` is not reachable without passing `assertLiveReadinessGate` and the LR-05 stage sequence. | Must | Gap | LR-01, LR-05 |
| AUT-42 | The autonomy enable flow must make the execution target (Simulation / Live) unambiguous at all steps. The execution mode badge (UX-01) must be prominent during all autonomy configuration and activation flows. | Must | Gap | UX-01, SE-01 |
| AUT-43 | Autonomous loops running in simulation must use the simulation ledger exclusively (`simulation_orders`, `simulation_positions`, `simulation_accounts`). No autonomous simulation order may route to a live broker adapter. | Must | Gap | SE-01, simulation-first-rule |
| AUT-44 | The simulation autonomous loop must apply the same cadence, risk, and guard logic as the planned live loop. Simulation-only shortcuts that would make simulation results unrepresentative of live behavior are forbidden. | Must | Gap | SE-10 |

---

### 8.9 UI/UX

| REQ ID | Requirement | Priority | Status | Cross-ref |
|---|---|---|---|---|
| AUT-45 | The global ceiling state must be visible in the `/invest` dashboard header as a persistent status badge: "Manual Control" / "AI Running — N Lanes Active" / "AI Running — Live — N Lanes Active" (Roadmap). The badge color must follow design tokens (amber for enabled-sim, red for enabled-live [Roadmap], gray for off). | Must | Gap | UX-01 |
| AUT-46 | The "Deactivate" control must be accessible from the header badge (one click to reach the confirmation dialog). It must not require navigating to settings. | Must | Gap | AUT-20 |
| AUT-47 | The autonomy enable and deactivate confirmation dialogs must have asymmetric visual friction: deactivation dialog is simple (one confirm button, no multi-step); activation dialog surfaces the preflight summary and "what will happen" detail. | Must | Gap | AUT-16, AUT-17 |
| AUT-48 | Autonomy settings and per-lane configuration must be behind a dedicated `/invest/autonomy` route (or a prominent tab on `/invest/settings`) — not buried inside general account settings. | Must | Gap | — |
| AUT-49 | Each lane card in the autonomy settings view must display: lane name (human-readable, per SL-05), configured autonomy level, effective autonomy level, preflight check status, and an enable/disable toggle for that lane's autonomy config (scoped to L0/L1/L2 selection, not master ceiling). | Must | Gap | SL-05, AUT-15 |
| AUT-50 | When autonomy is active, a per-lane status panel must show in near-real time (polling ≤30s): orders today, daily P&L vs cap percentage, last order timestamp, time to next scheduled cycle, and the "Manual Override" action to halt just this lane. | Should | Gap | SL-06 |
| AUT-51 | All autonomy-related UI strings must be i18n-compliant. No hardcoded English strings (AC-02). | Must | Gap | AC-02 |
| AUT-52 | The autonomy control surface must be fully keyboard-navigable and screen-reader accessible (WCAG 2.1 AA). The deactivate button must have an explicit `aria-label` identifying what it will stop. | Must | Gap | accessibility-rule |

---

## 9. Non-Functional Requirements

### 9.1 Determinism and Fail-Closed

- Any ambiguity in ceiling state reads (DB error, stale read) must resolve to **no autonomous order submission**. The system is fail-closed on autonomy: uncertain state = stop.
- Autonomous scheduling loops must re-read the global ceiling on every scheduling tick from the DB — not from a process-level cache that could be stale post-deactivation.
- If the ceiling state cannot be confirmed (DB timeout, connectivity failure), the loop must halt for that tick and log the failure. This is not a global halt trigger unless repeated consecutively beyond a threshold.

### 9.2 Deactivation Latency

- **Target:** No new autonomous order submission initiated more than one scheduling tick after deactivation DB write is confirmed. At the default cadence minimum (`cooldownSeconds`), this means deactivation stops new orders within the next scheduling cycle.
- **Hard floor:** The scheduling loop must check the ceiling state at the start of every cycle, before any order is prepared or submitted. There must be no scenario where an order is submitted after the ceiling has been set to `CEILING_OFF`.
- **Pending order cancellation:** The atomic `PENDING` order cancellation (AUT-27) must complete within the same DB transaction as the ceiling state write.

### 9.3 Auditability (EU AI Act Alignment)

- Every autonomy state transition must produce an immutable record in `autonomy_events` with full context (actor, reason, preflight state, timestamp).
- Every autonomous order's risk gate result must be persisted with the input snapshot and policy version — sufficient to reconstruct the exact decision at any future point (EU AI Act Article 12/13/14 traceability).
- Autonomous orders must be clearly distinguishable from manual orders in all audit exports and historical views.
- The halt and re-enable lifecycle must form a complete, queryable timeline for any regulatory inquiry.

### 9.4 Idempotent Transitions

- Setting the ceiling to `CEILING_OFF` when it is already `CEILING_OFF` must be a no-op (log a duplicate-transition event but do not error).
- Setting the ceiling to `CEILING_ENABLED_SIM` when already `CEILING_ENABLED_SIM` must be a no-op.
- Preflight checks must be idempotent — running them multiple times on the same state must produce the same result.

### 9.5 Restart Survivability

- Autonomous loops must re-read the ceiling state on startup before initiating any scheduling. They must not assume the ceiling is enabled because it was enabled before the last shutdown.
- The `autonomy_events` table must be populated with a system event on each process restart that reflects the recovered ceiling state.

### 9.6 No Global Bypass Invariant

The following invariant must be enforced at the implementation level and verified in tests:

> At no point in any code path may an autonomous order be submitted when `global_autonomy_ceiling = CEILING_OFF` OR `is_globally_halted = true` OR `lane_kill_switch_halted = true` for the relevant lane.

This invariant must be tested with integration tests in simulation that cover: (1) deactivation mid-cycle, (2) ceiling `CEILING_OFF` at startup, (3) per-lane halt with global ceiling `CEILING_ENABLED_SIM`.

### 9.7 Observability

- Autonomous scheduling loop health must be observable: last tick timestamp, cycle count, skip count, and rejection count must be emitted as metrics.
- Alerts must fire on: ceiling state change (any), guard-triggered halt, rejection ratio spike, consecutive preflight failures ≥ 3.
- The `/admin/monitoring` panel must show active autonomous loops, their last-tick timestamp, and any recent halt events.

---

## 10. Success Metrics

| Metric | Baseline | Target | Measurement |
|---|---|---|---|
| Deactivation latency (ceiling `CEILING_OFF` → last autonomous order submitted) | Not measured | ≤ one scheduling tick (≤ 30s at minimum cadence) | P99 measured in simulation integration tests |
| Zero unsafe-bypass incidents | N/A | 0 (hard invariant) | Automated test coverage of no-bypass invariant; security review |
| Autonomous orders that passed full `runPreTradeRiskCheck` | N/A (feature not built) | 100% (every autonomous order) | Audit log cross-reference: orders with `source=autonomous` must each have a matching risk gate PASS record |
| Operator halt-to-confirmed-stop time | N/A | ≤ 60 seconds end-to-end (admin action → all loops stopped) | Measured in staging with simulated operator halt |
| Preflight pass rate on first enable attempt | N/A | Track as leading indicator; target >80% (users should be able to enable without repeated config fixes) | Server-side event log |
| User-reported "I trust the off switch" satisfaction | N/A | Measure via in-app survey post-first-deactivation; target ≥4.2/5 | In-app survey |
| Simulation autonomous hours before live enablement | N/A | ≥ 30 accumulated autonomous simulation hours per lane before any live autonomy enablement is permitted | Prerequisite check in LR-01 extension for autonomous lanes |
| Guardrail-triggered halt MTTR (mean time to operator visibility) | N/A | ≤ 5 minutes from trigger to alert in `/admin/monitoring` | Alert latency measured in staging |
| Autonomous lane re-enable requiring explicit confirmation | N/A | 100% (no passive re-enable) | Audit log: every re-enable event must reference a preceding explicit user action; zero passive re-enables |

---

## 11. Open Questions

| Question | Safe Default If Unresolved | Owner |
|---|---|---|
| On deactivation, what happens to OPEN positions held in an autonomous lane? Options: (a) Hold for manual management (no auto-close), (b) Offer user a one-click "close all positions in this lane" option, (c) Auto-close at market. | **Hold for manual management. No auto-close without explicit user consent.** Working autonomous orders in `PENDING` state are cancelled; `SUBMITTED` orders are flagged for review; existing filled positions are held. Auto-liquidation is never initiated by the system unless a future explicit feature is designed, reviewed, and approved. | Product |
| Who may flip the global ceiling? Options: (a) account owner only, (b) operator only, (c) both. | Account owner may enable/disable their own ceiling. Operator may issue a ceiling halt (to `CEILING_OFF`) on any account but may not enable a ceiling on behalf of a user. | Product / Legal |
| Does master `CEILING_OFF` also suppress AI-suggested (L1) execution, or only autonomous (L2)? | **Ceiling `CEILING_OFF` suppresses L2 (autonomous) only. L1 (AI-suggested-human-approval) continues to operate — the user still receives AI proposals and approves manually.** The ceiling is specifically an autonomy ceiling, not an AI-activity ceiling. | Product |
| Should there be a scheduling quiet-hours window (e.g., no autonomous orders between 22:00 and 06:00 local time)? | **Defer to lane config. Default: no automatic quiet hours.** Add `quietHoursStart` / `quietHoursEnd` to the lane config schema as optional fields. If not configured, the loop runs per cadence without time restriction. | Product |
| How is `minSignalConfidenceForAutonomy` surfaced and edited by the user? Options: (a) in the lane config editor as a slider (0.0–1.0), (b) preset tiers (Conservative 0.7, Moderate 0.5, Aggressive 0.4), (c) not user-editable (operator-set). | **User-editable in the lane config editor, displayed as a slider with preset tier labels as reference points. Default: 0.6.** | Product / UX |
| Does the global master enable require re-confirmation at the start of each new trading session (e.g., each day), or is it persistent until explicitly disabled? | **Persistent until explicitly disabled.** The ceiling state is sticky. Adding a configurable "require daily re-confirmation" option is a future enhancement, not a blocker. | Product |
| How does the system handle a lane that transitions from simulation to live (LR-05) while the global ceiling is `CEILING_ENABLED_SIM`? Is the lane's autonomous operation automatically promoted to live, or does a separate live-autonomy enable be required? | **A separate live-autonomy enable is required.** Transitioning a lane to live execution does not automatically promote it to live-autonomous operation. The ceiling must be set to `CEILING_ENABLED_LIVE` (gated behind `assertLiveReadinessGate`) as a distinct step. | Product / Engineering |
| What is the maximum `cooldownSeconds` value for autonomous cadence, and what is the minimum (to prevent over-trading)? | **Default minimum cooldown: 60 seconds. Default maximum: no cap (user-configurable). Enforce a system-level floor of 30 seconds (no autonomous lane may submit more than one order per 30s per lane).** | Engineering / Risk |

---

## 12. Appendix

### 12.1 Source Map

This PRD synthesizes requirements from the following repository files:

| Document | Relevant Sections |
|---|---|
| `.docs/prd/aurox-intelligence.md` | §6.5 (SL-03, SL-04), §6.6 (RG-04, RG-05), §6.7 (LR-05), §6.7.1 (BK-04), §6.1 (SE-01, SE-10) |
| `docs/live-microtrading/lane-autonomy-model.md` | Per-lane autonomy levels L0–L3, guardrail rules, lane config schema |
| `docs/live-microtrading/overview.md` | "Autonomy level must be a lane-level setting" constraint |
| `docs/live-microtrading/incident-response-and-kill-switch.md` | Kill switch scopes, DB-backed halt, re-enable requires explicit confirmation |
| `docs/live-microtrading/risk-policy-and-guards.md` | Autonomous-specific guards (daily loss, cadence caps, rejection ratio, connectivity) |
| `.claude/rules/kill-switch-rule.md` | Kill switch pattern, DB persistence, system event on activation, re-enable requirements |
| `.claude/rules/risk-gates-required.md` | `runPreTradeRiskCheck` mandatory on every order; no autonomous bypass |
| `.claude/rules/order-lifecycle-rule.md` | Order state machine, cancel/fill constraints |
| `.claude/rules/repository-transaction-rule.md` | Atomic multi-table writes |
| `.claude/rules/simulation-auditability-rule.md` | Append-only records, `source` field on orders |
| `.claude/rules/simulation-first-rule.md` | Simulation is default; live is explicitly gated |

### 12.2 Glossary

| Term | Definition |
|---|---|
| **Autonomy Ceiling** | The global, account-level maximum autonomy level that any lane may operate at. Set to `CEILING_OFF`, `CEILING_ENABLED_SIM`, or `CEILING_ENABLED_LIVE`. Stored in the DB; modulated by the global master control. |
| **Master Enable/Disable** | The user-facing global control for the Autonomy Ceiling. Enabling raises the ceiling (gated, per-lane config still required). Disabling drops the ceiling to `CEILING_OFF` instantly, with a single confirm. |
| **Autonomy Level (L0–L2)** | Per-lane configured level: L0 = manual only; L1 = AI-suggested-human-approval; L2 = AI-autonomous-limited. Effective level = min(ceiling, configured level). |
| **Complete Autonomous Mode** | The observed operational state in which the Autonomy Ceiling is `ENABLED` AND at least one lane is configured at L2 and passes per-cycle preflight checks. Not a DB field — a derived status. |
| **Autonomy Halt** | The state in which all autonomous execution is stopped, modeled as a kill-switch variant. DB-backed, logged as a system event, does not auto-expire. Triggered by user, operator, or guard breach. |
| **Re-enable Preflight** | The set of per-lane and global checks that must pass before autonomous execution may resume after a halt. Checked at re-enable time, not at halt time. |
| **Scheduling Cycle / Tick** | The recurring interval at which an autonomous lane evaluates whether to submit an order (checking ceiling state, running preflight, running risk gate). Duration bounded by `cooldownSeconds` per lane config. |
| **Guard-Triggered Halt** | An automatic halt initiated by the system when a guard condition is breached (daily loss cap, rejection rate spike, connectivity failure, reconciliation drift). Behaves identically to a manual halt for audit and recovery purposes. |

### 12.3 Simulation-First Validation Requirement

This feature must be fully implemented, tested, and validated in simulation before any live autonomy enablement is considered. The 30-accumulated-autonomous-simulation-hours-per-lane prerequisite (see §10 Success Metrics) is a hard gate in the LR-01 extension for autonomous lanes. Shipping the control surface, the autonomous simulation loops, and the deactivation mechanism is the near-term buildable slice. Live autonomous execution (`CEILING_ENABLED_LIVE`) is Roadmap / Gated and requires the full LR-05 stage sequence.
