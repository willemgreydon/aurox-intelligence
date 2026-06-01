/**
 * Governance Gate — pure, deterministic execution-permission resolution.
 *
 * This is the safety kernel that sits in front of ANY order path. It encodes
 * the institutional doctrine: simulation-first, live permanently locked unless
 * every gate passes, kill switch overrides everything, risk failure blocks.
 *
 * Pure (no I/O) so it is fully unit-testable and reusable. It does not execute
 * anything — it only decides whether execution is PERMITTED and, if not, which
 * gate blocked it. The caller (a server action / agent workflow) is responsible
 * for honouring the result and writing the decision to the immutable journal.
 */

export type ApprovalState =
  | 'DRAFT'
  | 'NEEDS_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'BLOCKED_BY_RISK'
  | 'BLOCKED_BY_KILL_SWITCH';

export type ExecutionMode = 'simulation' | 'paper' | 'live';

export type GovernanceState = {
  killSwitchEnabled: boolean;
  emergencyStopEnabled: boolean;
  /** Hard lock; live execution is impossible while true (default true). */
  liveTradingLocked: boolean;
  humanApprovalRequired: boolean;
  /** 0 = suggest-only, 1 = human-confirmed, 2 = autonomous-simulation. Never live. */
  maxAutonomyLevel: 0 | 1 | 2;
};

export const DEFAULT_GOVERNANCE_STATE: GovernanceState = {
  killSwitchEnabled: false,
  emergencyStopEnabled: false,
  liveTradingLocked: true,
  humanApprovalRequired: true,
  maxAutonomyLevel: 1,
};

export type GateInput = {
  governance: GovernanceState;
  mode: ExecutionMode;
  /** Result of the pre-trade risk kernel. */
  riskPassed: boolean;
  /** Whether a human has explicitly approved this specific order. */
  humanApproved: boolean;
  /** Whether ALL live-readiness checks pass (broker/capital/data/etc.). */
  liveReadinessPassed: boolean;
  /** Account this order targets — only a simulation account may fill. */
  accountKind: 'simulation' | 'live';
};

export type GateDecision = {
  permitted: boolean;
  approvalState: ApprovalState;
  /** Machine-readable block code, or null when permitted. */
  blockCode:
    | null
    | 'KILL_SWITCH'
    | 'EMERGENCY_STOP'
    | 'LIVE_TRADING_LOCKED'
    | 'LIVE_NOT_READY'
    | 'RISK_FAILED'
    | 'NEEDS_HUMAN_APPROVAL'
    | 'WRONG_ACCOUNT';
  reason: string;
  /** Always true for any path that does not target a simulation fill. */
  simulationOnly: boolean;
};

/**
 * Resolve whether an order may proceed. Order of precedence is deliberate:
 * kill switch / emergency stop first (they stop everything), then the hard live
 * lock, then risk, then human approval, then account routing.
 */
export function resolveExecutionGate(input: GateInput): GateDecision {
  const { governance, mode, riskPassed, humanApproved, liveReadinessPassed, accountKind } = input;
  const simulationOnly = mode !== 'live';

  if (governance.killSwitchEnabled) {
    return { permitted: false, approvalState: 'BLOCKED_BY_KILL_SWITCH', blockCode: 'KILL_SWITCH', reason: 'Kill switch is engaged — all execution halted.', simulationOnly };
  }
  if (governance.emergencyStopEnabled) {
    return { permitted: false, approvalState: 'BLOCKED_BY_KILL_SWITCH', blockCode: 'EMERGENCY_STOP', reason: 'Emergency stop is engaged — all execution halted.', simulationOnly };
  }

  // ── Live path: permanently locked unless every gate is explicitly open. ──
  if (mode === 'live') {
    if (governance.liveTradingLocked) {
      return { permitted: false, approvalState: 'BLOCKED_BY_KILL_SWITCH', blockCode: 'LIVE_TRADING_LOCKED', reason: 'Live trading is locked. Simulation only.', simulationOnly: false };
    }
    if (!liveReadinessPassed) {
      return { permitted: false, approvalState: 'NEEDS_REVIEW', blockCode: 'LIVE_NOT_READY', reason: 'Live readiness gates have not all passed.', simulationOnly: false };
    }
    if (!riskPassed) {
      return { permitted: false, approvalState: 'BLOCKED_BY_RISK', blockCode: 'RISK_FAILED', reason: 'Risk kernel rejected the order.', simulationOnly: false };
    }
    if (!humanApproved) {
      return { permitted: false, approvalState: 'NEEDS_REVIEW', blockCode: 'NEEDS_HUMAN_APPROVAL', reason: 'Live order requires explicit human approval.', simulationOnly: false };
    }
    if (accountKind !== 'live') {
      return { permitted: false, approvalState: 'REJECTED', blockCode: 'WRONG_ACCOUNT', reason: 'Live mode requires a live account.', simulationOnly: false };
    }
    // Even with every gate open, this module never returns permitted:true for
    // live in the current build — live remains a documented future path.
    return { permitted: false, approvalState: 'NEEDS_REVIEW', blockCode: 'LIVE_TRADING_LOCKED', reason: 'Live execution is not enabled in this build.', simulationOnly: false };
  }

  // ── Simulation / paper path. ──
  if (accountKind !== 'simulation') {
    return { permitted: false, approvalState: 'REJECTED', blockCode: 'WRONG_ACCOUNT', reason: 'Simulation orders may only fill in a simulation account.', simulationOnly: true };
  }
  if (!riskPassed) {
    return { permitted: false, approvalState: 'BLOCKED_BY_RISK', blockCode: 'RISK_FAILED', reason: 'Risk kernel rejected the simulated order.', simulationOnly: true };
  }
  if (governance.humanApprovalRequired && !humanApproved) {
    return { permitted: false, approvalState: 'NEEDS_REVIEW', blockCode: 'NEEDS_HUMAN_APPROVAL', reason: 'This simulated order requires confirmation.', simulationOnly: true };
  }

  return { permitted: true, approvalState: 'APPROVED', blockCode: null, reason: 'Approved for simulation execution.', simulationOnly: true };
}

// ── Approval state machine (pure transition validation) ──────────────────────

const ALLOWED_TRANSITIONS: Record<ApprovalState, ApprovalState[]> = {
  DRAFT: ['NEEDS_REVIEW', 'BLOCKED_BY_RISK', 'BLOCKED_BY_KILL_SWITCH', 'REJECTED'],
  NEEDS_REVIEW: ['APPROVED', 'REJECTED', 'EXPIRED', 'BLOCKED_BY_RISK', 'BLOCKED_BY_KILL_SWITCH'],
  APPROVED: ['EXPIRED', 'BLOCKED_BY_KILL_SWITCH'], // approval can be revoked by a halt, never silently re-opened
  REJECTED: [],
  EXPIRED: [],
  BLOCKED_BY_RISK: ['NEEDS_REVIEW', 'REJECTED'], // may be re-reviewed after risk changes
  BLOCKED_BY_KILL_SWITCH: ['NEEDS_REVIEW', 'REJECTED'],
};

export function canTransition(from: ApprovalState, to: ApprovalState): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/** Returns the next state if the transition is legal, else the current state unchanged. */
export function transitionApproval(from: ApprovalState, to: ApprovalState): ApprovalState {
  return canTransition(from, to) ? to : from;
}
