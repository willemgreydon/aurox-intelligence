import { getSimulationWorkspace } from '@repo/db';
import { requireCurrentSession } from '../auth/session';
import { getObservationOutcome } from './observation-outcome-service';
import { sanitizeSimulationSourceLabel } from '../../lib/simulation-source';

export type SimulationJournalRow = {
  id: string;
  timestamp: string;
  side: 'BUY' | 'SELL' | 'HOLD' | 'REDUCE' | 'CLOSE' | 'RESET';
  symbol: string;
  assetClass: string;
  quantity: number | null;
  price: number | null;
  notional: number | null;
  feeEstimate: number | null;
  slippageEstimate: number | null;
  confidence: number | null;
  signalScore: number | null;
  riskScore: number | null;
  newsImpact: number | null;
  guardrailResult: 'PASS' | 'FAIL' | 'UNAVAILABLE';
  source: string;
  lane: string | null;
  decisionReason: string;
  cashImpact: number | null;
  positionImpact: string;
  outcomeStatus: 'PENDING' | 'WIN' | 'LOSS' | 'NEUTRAL' | 'UNAVAILABLE';
  realizedPnl: number | null;
  unrealizedPnl: number | null;
  replayHref: string | null;
};

/**
 * Converts raw transaction/order types to human-readable labels for display.
 * Never returns raw DB enum values to the UI.
 */
export function humanizeTransactionType(type: string): string {
  const map: Record<string, string> = {
    initial_funding: 'Initial funding',
    buy: 'Simulated buy',
    sell: 'Simulated sell',
    reset: 'Cash adjustment',
    close_all: 'Close all positions',
  };
  return map[type] ?? type;
}

export function parseOrderSource(notes: string | null) {
  if (!notes) return { source: 'simulation', lane: null, reason: 'Manual simulation order' };
  const sourceMatch = notes.match(/source=([a-z0-9_-]+)/i);
  const laneMatch = notes.match(/lane=([^;]+)/i);
  const normalizedSource = sourceMatch?.[1] ?? 'simulation';
  return {
    source: normalizedSource,
    sourceLabel: sanitizeSimulationSourceLabel(normalizedSource),
    lane: laneMatch?.[1] ?? null,
    reason: notes,
  };
}

export function toCsv(rows: SimulationJournalRow[]) {
  const headers = [
    'timestamp', 'side', 'symbol', 'assetClass', 'quantity', 'price', 'notional', 'feeEstimate', 'slippageEstimate',
    'confidence', 'signalScore', 'riskScore', 'newsImpact', 'guardrailResult', 'source', 'lane', 'decisionReason',
    'cashImpact', 'positionImpact', 'outcomeStatus', 'realizedPnl', 'unrealizedPnl', 'replayHref',
  ];
  const esc = (value: unknown) => {
    const raw = value === null || value === undefined ? '' : String(value);
    const escaped = raw.replaceAll('"', '""');
    return `"${escaped}"`;
  };
  return [headers.join(','), ...rows.map((row) => headers.map((h) => esc((row as Record<string, unknown>)[h])).join(','))].join('\n');
}

export async function getSimulationJournalRowsForCurrentUser(limit = 120): Promise<SimulationJournalRow[]> {
  const session = await requireCurrentSession('/invest/simulation');
  const workspace = await getSimulationWorkspace(session.user.id);
  const orders = workspace.orders.slice(0, limit);

  const rows = await Promise.all(orders.map(async (order) => {
    const source = parseOrderSource(order.notes);
    const executionRecord = order.executionRecord;
    const outcome = await getObservationOutcome({ userId: session.user.id, relatedOrderId: order.id, signalDirection: null });
    return {
      id: order.id,
      timestamp: order.executedAt,
      side: order.side.toUpperCase() as 'BUY' | 'SELL',
      symbol: order.symbol,
      assetClass: order.assetClass,
      quantity: order.quantity,
      price: order.executedPrice,
      notional: order.grossAmount,
      feeEstimate: executionRecord?.feeAmount ?? null,
      slippageEstimate: executionRecord?.slippageAmount ?? null,
      confidence: null,
      signalScore: null,
      riskScore: null,
      newsImpact: null,
      guardrailResult: 'UNAVAILABLE' as const,
      source: source.source,
      lane: source.lane,
      decisionReason: source.reason,
      cashImpact: order.cashEffect,
      positionImpact: order.side === 'buy' ? `+${order.quantity.toFixed(4)}` : `-${order.quantity.toFixed(4)}`,
      outcomeStatus: outcome.outcomeStatus,
      realizedPnl: order.realizedPnl,
      unrealizedPnl: null,
      replayHref: null,
    } satisfies SimulationJournalRow;
  }));

  const resetRows = workspace.transactions
    .filter((tx) => tx.transactionType === 'reset')
    .slice(0, 20)
    .map((tx) => ({
      id: tx.id,
      timestamp: tx.createdAt,
      side: 'RESET' as const,
      symbol: tx.symbol ?? 'SYSTEM',
      assetClass: tx.assetClass ?? 'system',
      quantity: tx.quantity,
      price: tx.price,
      notional: tx.grossAmount,
      feeEstimate: tx.feeAmount,
      slippageEstimate: null,
      confidence: null,
      signalScore: null,
      riskScore: null,
      newsImpact: null,
      guardrailResult: 'UNAVAILABLE' as const,
      source: 'simulation-controls',
      lane: null,
      decisionReason: tx.description,
      cashImpact: tx.cashDelta,
      positionImpact: 'n/a',
      outcomeStatus: 'UNAVAILABLE' as const,
      realizedPnl: tx.realizedPnl,
      unrealizedPnl: null,
      replayHref: null,
    }));

  return [...rows, ...resetRows].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
