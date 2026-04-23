import type { AuditEntry } from '../types/audit-types';

export interface AuditTrail {
  add(event: string, detail: Record<string, unknown>): void;
  entries(): readonly AuditEntry[];
}

export function createAuditTrail(
  traceId: string,
  userId: string,
  accountId: string,
): AuditTrail {
  const trail: AuditEntry[] = [];

  return {
    add(event: string, detail: Record<string, unknown>): void {
      trail.push({
        traceId,
        userId,
        accountId,
        event,
        detail,
        occurredAt: new Date().toISOString(),
      });
    },
    entries(): readonly AuditEntry[] {
      return trail;
    },
  };
}
