import type { ObserveViewModel } from '../services/market-observation-service';
import type { AlertCategory, AlertInput, AlertSeverity, AlertSource } from '@repo/db';

export type AlertCandidate = AlertInput & {
  recommendedAction: 'inspect' | 'open_observation' | 'open_replay' | 'open_simulation';
};

function severityWeight(severity: AlertSeverity) {
  if (severity === 'CRITICAL') return 4;
  if (severity === 'WARNING') return 3;
  if (severity === 'WATCH') return 2;
  return 1;
}

function inferCategory(source: AlertSource): AlertCategory {
  if (source === 'signal') return 'signal';
  if (source === 'anomaly') return 'anomaly';
  if (source === 'provider') return 'provider';
  if (source === 'relationship') return 'cross_asset';
  if (source === 'risk') return 'portfolio';
  if (source === 'simulation' || source === 'broker') return 'simulation';
  if (source === 'news') return 'market';
  if (source === 'portfolio') return 'portfolio';
  return 'market';
}

function buildDedupeKey(input: {
  source: AlertSource;
  symbol?: string | null;
  title: string;
  severity: AlertSeverity;
}) {
  return `${input.source}:${input.symbol ?? 'all'}:${input.severity}:${input.title}`.toLowerCase();
}

function cooldownBucket(nowIso: string, severity: AlertSeverity) {
  const date = new Date(nowIso);
  if (severity === 'CRITICAL' || severity === 'WARNING') {
    date.setUTCMinutes(0, 0, 0);
    return date.toISOString();
  }
  date.setUTCHours(date.getUTCHours(), 0, 0, 0);
  return date.toISOString();
}

export function generateAlertCandidates(model: ObserveViewModel, input: {
  userId: string;
  workspaceId?: string | null;
}): AlertCandidate[] {
  const nowIso = model.generatedAt;
  const candidates: AlertCandidate[] = [];

  for (const item of model.observerItems.slice(0, 60)) {
    const source = (item.source === 'anomaly' || item.source === 'signal' || item.source === 'risk' || item.source === 'provider' || item.source === 'portfolio' || item.source === 'news'
      ? item.source
      : 'signal') as AlertSource;
    const dedupe = buildDedupeKey({ source, symbol: item.assetSymbol, title: item.title, severity: item.severity });
    candidates.push({
      userId: input.userId,
      workspaceId: input.workspaceId ?? null,
      symbol: item.assetSymbol ?? null,
      assetClass: item.assetClass ?? null,
      source,
      category: inferCategory(source),
      severity: item.severity,
      title: item.title,
      description: item.reason,
      confidence: item.confidence,
      score: severityWeight(item.severity) * 25,
      dedupeKey: dedupe,
      cooldownBucket: cooldownBucket(nowIso, item.severity),
      metadata: { source: item.source, recommendedNextAction: item.recommendedNextAction },
      firstSeenAt: nowIso,
      lastSeenAt: nowIso,
      recommendedAction: item.severity === 'CRITICAL' ? 'open_replay' : 'inspect',
    });
  }

  for (const relationship of model.relationshipInsights.slice(0, 16)) {
    const severity = relationship.severity;
    const source: AlertSource = 'relationship';
    const symbol = relationship.symbols[0] ?? null;
    candidates.push({
      userId: input.userId,
      workspaceId: input.workspaceId ?? null,
      symbol,
      assetClass: null,
      source,
      category: 'cross_asset',
      severity,
      title: `Cross-asset relationship: ${relationship.title}`,
      description: relationship.narrative,
      confidence: relationship.confidence,
      score: relationship.confidence * 100,
      dedupeKey: buildDedupeKey({ source, symbol, title: relationship.title, severity }),
      cooldownBucket: cooldownBucket(nowIso, severity),
      metadata: { symbols: relationship.symbols, kind: relationship.kind },
      firstSeenAt: nowIso,
      lastSeenAt: nowIso,
      recommendedAction: 'open_observation',
    });
  }

  if (model.tradeReadiness.result && model.tradeReadiness.result.status !== 'READY_FOR_SIMULATION') {
    const severity: AlertSeverity =
      model.tradeReadiness.result.status === 'BLOCKED_BY_DATA_QUALITY'
        ? 'CRITICAL'
        : model.tradeReadiness.result.status === 'BLOCKED_BY_RISK'
          ? 'WARNING'
          : 'WATCH';
    const source: AlertSource = 'simulation';
    candidates.push({
      userId: input.userId,
      workspaceId: input.workspaceId ?? null,
      symbol: model.tradeReadiness.symbol,
      assetClass: null,
      source,
      category: 'simulation',
      severity,
      title: 'Simulation readiness guardrail triggered',
      description: model.tradeReadiness.result.explanation.join(' '),
      confidence: model.tradeReadiness.result.confidence ?? null,
      score: null,
      dedupeKey: buildDedupeKey({
        source,
        symbol: model.tradeReadiness.symbol ?? null,
        title: 'Simulation readiness guardrail triggered',
        severity,
      }),
      cooldownBucket: cooldownBucket(nowIso, severity),
      metadata: { status: model.tradeReadiness.result.status },
      firstSeenAt: nowIso,
      lastSeenAt: nowIso,
      recommendedAction: 'open_simulation',
    });
  }

  return candidates.sort((a, b) => severityWeight(b.severity) - severityWeight(a.severity));
}
