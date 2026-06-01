import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GOVERNANCE_STATE,
  canTransition,
  resolveExecutionGate,
  transitionApproval,
  type GateInput,
} from './governance-gate';

function gate(overrides: Partial<GateInput> = {}): GateInput {
  return {
    governance: { ...DEFAULT_GOVERNANCE_STATE },
    mode: 'simulation',
    riskPassed: true,
    humanApproved: true,
    liveReadinessPassed: false,
    accountKind: 'simulation',
    ...overrides,
  };
}

describe('resolveExecutionGate — safety doctrine', () => {
  it('permits an approved, risk-passed simulation order in a simulation account', () => {
    const d = resolveExecutionGate(gate());
    expect(d.permitted).toBe(true);
    expect(d.approvalState).toBe('APPROVED');
    expect(d.simulationOnly).toBe(true);
  });

  it('kill switch blocks everything, even valid simulation orders', () => {
    const d = resolveExecutionGate(gate({ governance: { ...DEFAULT_GOVERNANCE_STATE, killSwitchEnabled: true } }));
    expect(d.permitted).toBe(false);
    expect(d.blockCode).toBe('KILL_SWITCH');
    expect(d.approvalState).toBe('BLOCKED_BY_KILL_SWITCH');
  });

  it('emergency stop blocks everything', () => {
    const d = resolveExecutionGate(gate({ governance: { ...DEFAULT_GOVERNANCE_STATE, emergencyStopEnabled: true } }));
    expect(d.blockCode).toBe('EMERGENCY_STOP');
  });

  it('blocks simulation when the risk kernel fails', () => {
    const d = resolveExecutionGate(gate({ riskPassed: false }));
    expect(d.permitted).toBe(false);
    expect(d.blockCode).toBe('RISK_FAILED');
    expect(d.approvalState).toBe('BLOCKED_BY_RISK');
  });

  it('requires human approval when governance demands it', () => {
    const d = resolveExecutionGate(gate({ humanApproved: false }));
    expect(d.permitted).toBe(false);
    expect(d.blockCode).toBe('NEEDS_HUMAN_APPROVAL');
  });

  it('never fills a simulation order into a live account', () => {
    const d = resolveExecutionGate(gate({ accountKind: 'live' }));
    expect(d.permitted).toBe(false);
    expect(d.blockCode).toBe('WRONG_ACCOUNT');
  });

  it('LIVE mode is locked by default and never permitted in this build', () => {
    const locked = resolveExecutionGate(gate({ mode: 'live' }));
    expect(locked.permitted).toBe(false);
    expect(locked.blockCode).toBe('LIVE_TRADING_LOCKED');

    // Even with every gate explicitly opened, live is still not permitted.
    const allOpen = resolveExecutionGate(
      gate({
        mode: 'live',
        governance: { ...DEFAULT_GOVERNANCE_STATE, liveTradingLocked: false, humanApprovalRequired: true },
        liveReadinessPassed: true,
        humanApproved: true,
        accountKind: 'live',
      }),
    );
    expect(allOpen.permitted).toBe(false);
  });
});

describe('approval state machine', () => {
  it('allows legal transitions and rejects illegal ones', () => {
    expect(canTransition('DRAFT', 'NEEDS_REVIEW')).toBe(true);
    expect(canTransition('NEEDS_REVIEW', 'APPROVED')).toBe(true);
    expect(canTransition('APPROVED', 'NEEDS_REVIEW')).toBe(false); // cannot silently re-open
    expect(canTransition('REJECTED', 'APPROVED')).toBe(false); // terminal
  });

  it('a kill switch can revoke an approval', () => {
    expect(transitionApproval('APPROVED', 'BLOCKED_BY_KILL_SWITCH')).toBe('BLOCKED_BY_KILL_SWITCH');
  });

  it('returns the current state unchanged on an illegal transition', () => {
    expect(transitionApproval('REJECTED', 'APPROVED')).toBe('REJECTED');
  });
});
