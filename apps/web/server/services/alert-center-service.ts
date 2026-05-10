import {
  dismissAlert,
  getAlert,
  listAlerts,
  resolveAlert,
  snoozeAlert,
  updateAlertState,
  upsertAlerts,
  type AlertCategory,
  type AlertRecord,
  type AlertSeverity,
  type AlertSource,
  type AlertStatus,
} from '@repo/db';
import { getObserveViewModel, getObserveViewModelRequestScoped, type ObserveViewModel } from './market-observation-service';
import { generateAlertCandidates, type AlertCandidate } from '../lib/alert-engine';
import { listNewsIntelligenceSnapshots } from './news-intelligence-service';

export type AlertCenterFilter = {
  severity?: AlertSeverity | 'all';
  category?: AlertCategory | 'all';
  assetClass?: 'stock' | 'etf' | 'crypto' | 'other' | 'all';
  source?: AlertSource | 'all';
  status?: AlertStatus | 'all';
  search?: string;
};

export type AlertCenterViewModel = {
  generatedAt: string;
  degraded: boolean;
  summary: {
    open: number;
    critical: number;
    warning: number;
    snoozed: number;
    resolvedToday: number;
  };
  grouped: {
    CRITICAL: AlertRecord[];
    WARNING: AlertRecord[];
    WATCH: AlertRecord[];
    INFO: AlertRecord[];
  };
  filters: Required<AlertCenterFilter>;
  persistenceDegraded: boolean;
};

function normalizeFilters(filter?: AlertCenterFilter): Required<AlertCenterFilter> {
  return {
    severity: filter?.severity ?? 'all',
    category: filter?.category ?? 'all',
    assetClass: filter?.assetClass ?? 'all',
    source: filter?.source ?? 'all',
    status: filter?.status ?? 'all',
    search: filter?.search ?? '',
  };
}

export async function getAlertCenterViewModel(input: {
  userId: string;
  workspaceId?: string | null;
  filter?: AlertCenterFilter;
  observeModel?: ObserveViewModel;
}): Promise<AlertCenterViewModel> {
  const filters = normalizeFilters(input.filter);
  const observe = input.observeModel ?? await getObserveViewModelRequestScoped(input.userId);
  const candidates = generateAlertCandidates(observe, { userId: input.userId, workspaceId: input.workspaceId ?? null });
  const newsSnapshotAlerts = await listNewsIntelligenceSnapshots({ minRiskScore: 60, limit: 40 }).catch(() => []);
  const newsDerivedCandidates: AlertCandidate[] = newsSnapshotAlerts.map((snapshot) => {
    const severity: AlertSeverity =
      snapshot.riskScore > 80 && snapshot.relevanceScore > 0.7
        ? 'CRITICAL'
        : snapshot.riskScore > 60 || snapshot.urgencyScore > 0.7
          ? 'WARNING'
          : snapshot.relevanceScore > 0.5
            ? 'WATCH'
            : 'INFO';
    const symbol = snapshot.article.title.match(/\b[A-Z]{2,6}\b/)?.[0] ?? null;
    const eventType = snapshot.eventTypes[0] ?? 'news';
    return {
      userId: input.userId,
      workspaceId: input.workspaceId ?? null,
      symbol,
      assetClass: null,
      source: 'news' as const,
      category: 'market' as const,
      severity,
      title: `News intelligence: ${snapshot.article.title}`,
      description: `Risk ${snapshot.riskScore.toFixed(0)}/100, urgency ${(snapshot.urgencyScore * 100).toFixed(0)}%, events: ${snapshot.eventTypes.join(', ') || 'none'}.`,
      confidence: snapshot.confidence,
      score: snapshot.riskScore,
      status: 'OPEN' as const,
      assetId: null,
      dedupeKey: `news:${snapshot.contentHash}:${symbol ?? 'all'}:${eventType}`.toLowerCase(),
      cooldownBucket: new Date(snapshot.article.publishedAt).toISOString().slice(0, 13),
      metadata: {
        snapshotId: snapshot.id,
        contentHash: snapshot.contentHash,
        eventType,
        sourceUrl: snapshot.article.url,
      },
      firstSeenAt: snapshot.article.publishedAt,
      lastSeenAt: snapshot.article.publishedAt,
      recommendedAction: severity === 'CRITICAL' ? 'open_replay' : 'inspect',
    };
  });
  const mergedCandidates = [...candidates, ...newsDerivedCandidates];

  let persistenceDegraded = false;
  try {
    await upsertAlerts(mergedCandidates.map((candidate) => ({
      observationEventId: null,
      workspaceId: candidate.workspaceId ?? null,
      userId: candidate.userId ?? null,
      assetId: candidate.assetId ?? null,
      symbol: candidate.symbol ?? null,
      source: candidate.source,
      category: candidate.category,
      assetClass: candidate.assetClass ?? null,
      severity: candidate.severity,
      title: candidate.title,
      description: candidate.description,
      confidence: candidate.confidence ?? null,
      score: candidate.score ?? null,
      status: 'OPEN',
      dedupeKey: candidate.dedupeKey,
      cooldownBucket: candidate.cooldownBucket,
      metadata: {
        ...candidate.metadata,
        recommendedAction: candidate.recommendedAction,
      },
      firstSeenAt: candidate.firstSeenAt,
      lastSeenAt: candidate.lastSeenAt,
    })));
  } catch {
    persistenceDegraded = true;
  }

  let rows: AlertRecord[] = [];
  try {
    rows = await listAlerts({
      userId: input.userId,
      severity: filters.severity === 'all' ? null : filters.severity,
      category: filters.category === 'all' ? null : filters.category,
      source: filters.source === 'all' ? null : filters.source,
      status: filters.status === 'all' ? null : filters.status,
      assetClass: filters.assetClass === 'all' ? null : filters.assetClass,
      search: filters.search.trim().length > 0 ? filters.search.trim() : null,
      limit: 80,
    });
  } catch {
    persistenceDegraded = true;
  }
  if (rows.length === 0 && persistenceDegraded) {
    rows = mergedCandidates.map((candidate, index) => ({
      id: `runtime-${index}-${candidate.dedupeKey}`,
      observationEventId: null,
      workspaceId: candidate.workspaceId ?? null,
      userId: candidate.userId ?? null,
      assetId: candidate.assetId ?? null,
      symbol: candidate.symbol ?? null,
      source: candidate.source,
      category: candidate.category,
      assetClass: candidate.assetClass ?? null,
      severity: candidate.severity,
      title: candidate.title,
      description: candidate.description,
      confidence: candidate.confidence ?? null,
      score: candidate.score ?? null,
      status: 'OPEN',
      dedupeKey: candidate.dedupeKey ?? `runtime-${index}`,
      cooldownBucket: candidate.cooldownBucket ?? nowIso(candidate.lastSeenAt),
      metadata: candidate.metadata ?? {},
      firstSeenAt: candidate.firstSeenAt,
      lastSeenAt: candidate.lastSeenAt,
      createdAt: candidate.firstSeenAt,
      updatedAt: candidate.lastSeenAt,
    }));
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const summary = {
    open: rows.filter((row) => row.status === 'OPEN').length,
    critical: rows.filter((row) => row.severity === 'CRITICAL').length,
    warning: rows.filter((row) => row.severity === 'WARNING').length,
    snoozed: rows.filter((row) => row.status === 'SNOOZED').length,
    resolvedToday: rows.filter((row) => row.status === 'RESOLVED' && new Date(row.updatedAt).getTime() >= todayStart.getTime()).length,
  };

  return {
    generatedAt: new Date().toISOString(),
    degraded: observe.degraded,
    summary,
    grouped: {
      CRITICAL: rows.filter((row) => row.severity === 'CRITICAL'),
      WARNING: rows.filter((row) => row.severity === 'WARNING'),
      WATCH: rows.filter((row) => row.severity === 'WATCH'),
      INFO: rows.filter((row) => row.severity === 'INFO'),
    },
    filters,
    persistenceDegraded,
  };
}

function nowIso(input: string) {
  return new Date(input).toISOString();
}

export async function updateAlertInteraction(input: {
  userId: string;
  alertId: string;
  action: 'read' | 'pin' | 'snooze' | 'dismiss' | 'resolve';
}) {
  if (input.action === 'read') {
    await updateAlertState(input.alertId, input.userId, 'READ');
    return;
  }
  if (input.action === 'pin') {
    await updateAlertState(input.alertId, input.userId, 'PINNED');
    return;
  }
  if (input.action === 'snooze') {
    const until = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await snoozeAlert(input.alertId, input.userId, until);
    return;
  }
  if (input.action === 'dismiss') {
    await dismissAlert(input.alertId, input.userId);
    return;
  }
  await resolveAlert(input.alertId, input.userId);
}

export async function getAlertById(input: { id: string; userId: string }) {
  return getAlert(input.id, input.userId);
}
