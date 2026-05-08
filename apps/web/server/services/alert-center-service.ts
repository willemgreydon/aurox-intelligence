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
import { getObserveViewModel, type ObserveViewModel } from './market-observation-service';
import { generateAlertCandidates } from '../lib/alert-engine';

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
  const observe = input.observeModel ?? await getObserveViewModel({ userId: input.userId });
  const candidates = generateAlertCandidates(observe, { userId: input.userId, workspaceId: input.workspaceId ?? null });

  let persistenceDegraded = false;
  try {
    await upsertAlerts(candidates.map((candidate) => ({
      observationEventId: typeof candidate.metadata?.eventId === 'string' ? candidate.metadata.eventId : null,
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
      limit: 600,
    });
  } catch {
    persistenceDegraded = true;
  }
  if (rows.length === 0 && persistenceDegraded) {
    rows = candidates.map((candidate, index) => ({
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
