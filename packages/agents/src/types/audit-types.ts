import type { AssetKind, IntentSource, ExecutionTarget, OrderState } from './broker-types';
import type { PolicyDecision } from './policy-types';

export interface DecisionPacket {
  readonly traceId: string;
  readonly userId: string;
  readonly accountId: string;
  readonly modeId: string;
  readonly symbol: string;
  readonly assetKind: AssetKind;
  readonly requestedAction: 'buy' | 'sell';
  readonly intentSource: IntentSource;
  readonly policyDecision: PolicyDecision;
  readonly executionTarget: ExecutionTarget;
  readonly orderState: OrderState;
  readonly generatedAt: string;
}

export interface AuditEntry {
  readonly traceId: string;
  readonly userId: string;
  readonly accountId: string;
  readonly event: string;
  readonly detail: Record<string, unknown>;
  readonly occurredAt: string;
}

export interface TradeExplanation {
  readonly summary: string;
  readonly signalReason: readonly string[];
  readonly riskChecks: readonly string[];
  readonly policyChecks: readonly string[];
  readonly sizingExplanation: readonly string[];
  readonly warnings: readonly string[];
}

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function buildTradeExplanation(input: {
  symbol: string;
  source: IntentSource;
  orderState: OrderState;
  executionTarget: ExecutionTarget;
  thesis: string;
  confidence?: number;
  signalDirection?: string;
  policyDecision?: PolicyDecision;
  riskChecks?: readonly string[];
  sizingExplanation?: readonly string[];
  warnings?: readonly string[];
}): TradeExplanation {
  const {
    symbol,
    source,
    orderState,
    executionTarget,
    thesis,
    confidence,
    signalDirection,
    policyDecision,
    riskChecks = [],
    sizingExplanation = [],
    warnings = [],
  } = input;

  const readableState = orderState.replace(/_/g, ' ');
  const readableSource = source.replace(/_/g, ' ');
  const readableTarget = executionTarget.replace(/_/g, ' ');

  const summaryParts = [
    `${symbol} decision is ${readableState}`,
    `via ${readableSource}`,
    `for ${readableTarget} execution`,
  ];

  const signalReason: string[] = [];
  if (signalDirection) {
    signalReason.push(`Signal direction is ${signalDirection}.`);
  }
  if (typeof confidence === 'number' && Number.isFinite(confidence)) {
    signalReason.push(`Confidence is ${(confidence * 100).toFixed(1)}%.`);
  }
  if (thesis.trim()) {
    signalReason.push(`Trade thesis: ${thesis.trim()}`);
  }

  const policyChecks =
    policyDecision?.checks.map((check) => {
      const verdict = check.verdict.replace(/_/g, ' ');
      return `${check.checkId}: ${verdict} — ${check.reason}`;
    }) ?? [];

  const derivedWarnings = [...warnings];
  if (orderState === 'awaiting_user_approval') {
    derivedWarnings.push('This order requires explicit user approval before execution.');
  }
  if (orderState.startsWith('rejected')) {
    derivedWarnings.push('The workflow blocked execution before order submission.');
  }
  if (executionTarget === 'live') {
    derivedWarnings.push('Live execution paths require stricter operational controls and monitoring.');
  }

  return {
    summary: summaryParts.join(' · '),
    signalReason: uniqueStrings(signalReason),
    riskChecks: uniqueStrings(riskChecks),
    policyChecks: uniqueStrings(policyChecks),
    sizingExplanation: uniqueStrings(sizingExplanation),
    warnings: uniqueStrings(derivedWarnings),
  };
}