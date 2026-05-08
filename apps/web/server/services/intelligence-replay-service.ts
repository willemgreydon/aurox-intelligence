import { getAlert, getObservationEvent } from '@repo/db';
import { getObservationOutcome } from './observation-outcome-service';
import { getObserveViewModel } from './market-observation-service';

export type IntelligenceReplayModel = {
  replayId: string;
  subject: string;
  symbol: string | null;
  severity: string;
  createdAt: string;
  timeline: Array<{
    timestamp: string;
    label: string;
    detail: string;
  }>;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  decisionContext: Record<string, unknown> | null;
  outcomeContext: {
    status: 'PENDING' | 'WIN' | 'LOSS' | 'NEUTRAL' | 'UNAVAILABLE';
    roiPercent: number | null;
    pnlAmount: number | null;
    explanation: string[];
  } | null;
  explanation: string[];
  missingData: string[];
  confidenceTrail: number[];
  riskTrail: number[];
  signalTrail: number[];
  newsTrail: number[];
  rawMetadata: Record<string, unknown>;
};

export async function getIntelligenceReplayModel(input: {
  replayId: string;
  userId: string;
}): Promise<IntelligenceReplayModel | null> {
  const [alert, observation] = await Promise.all([
    getAlert(input.replayId, input.userId),
    getObservationEvent(input.replayId, input.userId),
  ]);
  const base = alert ?? observation;
  if (!base) {
    return null;
  }
  const severity = alert ? alert.severity : observation!.severity;
  const createdAt = alert ? alert.createdAt : observation!.createdAt;
  const status = alert ? alert.status : 'OPEN';
  const lastSeenAt = alert ? alert.lastSeenAt : observation!.observedAt;
  const metadata = (alert ? alert.metadata : observation!.metadata) ?? {};

  const observeModel = await getObserveViewModel({ userId: input.userId });
  const symbol = base.symbol ?? null;
  const signalRow = symbol
    ? observeModel.watchlistIntelligence.find((row) => row.symbol === symbol)
    : null;
  const timelineRows = observeModel.timeline
    .filter((row) => !symbol || row.assetSymbol === symbol)
    .slice(0, 8);

  const relatedOrderId =
    (typeof metadata.relatedOrderId === 'string' ? metadata.relatedOrderId : null) ??
    (typeof (base as { relatedOrderId?: string | null }).relatedOrderId === 'string'
      ? (base as { relatedOrderId?: string | null }).relatedOrderId ?? null
      : null);
  const outcome = await getObservationOutcome({
    userId: input.userId,
    relatedOrderId,
    signalDirection: signalRow?.signalAction === 'BUY' || signalRow?.signalAction === 'SELL' || signalRow?.signalAction === 'HOLD'
      ? signalRow.signalAction
      : null,
  });

  const missingData: string[] = [];
  if (!symbol) missingData.push('No symbol attached to replay subject.');
  if (!signalRow) missingData.push('No current watchlist intelligence snapshot for subject symbol.');
  if (!relatedOrderId) missingData.push('No linked simulated order ID for outcome join.');

  const beforeState = {
    confidence: signalRow?.confidence ?? null,
    riskScore: signalRow?.riskScore ?? null,
    newsSentiment: signalRow?.newsSentiment ?? null,
  };
  const afterState = {
    status,
    lastSeenAt,
  };

  return {
    replayId: input.replayId,
    subject: base.title,
    symbol,
    severity,
    createdAt,
    timeline: timelineRows.map((row) => ({
      timestamp: row.timestamp,
      label: row.eventType.replaceAll('_', ' '),
      detail: row.description,
    })),
    beforeState,
    afterState,
    decisionContext: {
      signalAction: signalRow?.signalAction ?? 'n/a',
      confidence: signalRow?.confidence ?? null,
      riskScore: signalRow?.riskScore ?? null,
      freshness: signalRow?.freshnessLabel ?? 'n/a',
    },
    outcomeContext: {
      status: outcome.outcomeStatus,
      roiPercent: outcome.roiPercent,
      pnlAmount: outcome.pnlAmount,
      explanation: outcome.explanation,
    },
    explanation: [
      `Replay built from persisted ${alert ? 'alert' : 'observation'} context.`,
      'Signal/risk/news context is reconstructed from latest observer model snapshot.',
    ],
    missingData,
    confidenceTrail: signalRow?.confidence === null || signalRow?.confidence === undefined ? [] : [signalRow.confidence],
    riskTrail: signalRow?.riskScore === null || signalRow?.riskScore === undefined ? [] : [signalRow.riskScore],
    signalTrail: signalRow?.signalAction === 'BUY' ? [1] : signalRow?.signalAction === 'SELL' ? [-1] : [0],
    newsTrail: signalRow?.newsSentiment === null || signalRow?.newsSentiment === undefined ? [] : [signalRow.newsSentiment],
    rawMetadata: metadata,
  };
}
