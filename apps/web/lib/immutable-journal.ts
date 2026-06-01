/**
 * Immutable Journal — append-only, tamper-evident event chain.
 *
 * Pure and dependency-free so it is deterministic, universally importable, and
 * unit-testable. Each event stores a hash computed over its canonical content
 * AND the previous event's hash, so altering any historical event breaks the
 * chain from that point forward (detectable via `verifyJournalChain`).
 *
 * SECURITY NOTE (honest): the built-in hash is a deterministic FNV-1a content
 * hash — it provides tamper-EVIDENCE for ordering/integrity within the app, not
 * cryptographic non-repudiation. At the persistence boundary, production should
 * additionally chain with a cryptographic digest (e.g. SHA-256 via node:crypto)
 * and store events append-only in the DB. This module is the reference shape the
 * governance/journal domain promotes into `packages/governance` later.
 */

export type JournalEventType =
  | 'SIGNAL_CREATED'
  | 'RISK_CHECKED'
  | 'ORDER_PREVIEWED'
  | 'ORDER_APPROVED'
  | 'ORDER_REJECTED'
  | 'SIM_ORDER_EXECUTED'
  | 'BROKER_ORDER_BLOCKED'
  | 'PORTFOLIO_REBALANCED_SIM'
  | 'KILL_SWITCH_ENABLED'
  | 'MANUAL_OVERRIDE';

export type JournalActorType = 'USER' | 'AGENT' | 'SYSTEM';

export type JournalEventInput = {
  eventType: JournalEventType;
  aggregateId: string;
  actorType: JournalActorType;
  actorId: string;
  /** Monotonic timestamp passed in (never read from the wall clock here). */
  createdAt: string;
  payload: Record<string, unknown>;
};

export type JournalEvent = JournalEventInput & {
  eventId: string;
  /** Hash of this event's canonical content + previousHash (the chain link). */
  payloadHash: string;
  /** Hash of the previous event, or null for the genesis event. */
  previousHash: string | null;
  /** Position in the chain (0-based). */
  sequence: number;
};

// ── Deterministic canonical serialization (sorted keys) ──────────────────────

function canonicalize(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`).join(',')}}`;
  }
  return 'null';
}

// ── FNV-1a 64-bit (tamper-evident content hash) ──────────────────────────────

const FNV_OFFSET = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;
const MASK64 = (1n << 64n) - 1n;

export function hashContent(input: string): string {
  let hash = FNV_OFFSET;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= BigInt(input.charCodeAt(i) & 0xff);
    hash = (hash * FNV_PRIME) & MASK64;
    // Mix the high byte of multi-byte code units so they affect the digest too.
    const high = input.charCodeAt(i) >> 8;
    if (high) {
      hash ^= BigInt(high);
      hash = (hash * FNV_PRIME) & MASK64;
    }
  }
  return hash.toString(16).padStart(16, '0');
}

/** Hash an event's immutable content together with the previous link. */
function computeEventHash(input: JournalEventInput, previousHash: string | null, sequence: number): string {
  const canonical = canonicalize({
    eventType: input.eventType,
    aggregateId: input.aggregateId,
    actorType: input.actorType,
    actorId: input.actorId,
    createdAt: input.createdAt,
    payload: input.payload,
    previousHash,
    sequence,
  });
  return hashContent(canonical);
}

/** Deterministic event id derived from the content hash (no random/Date). */
function deriveEventId(hash: string, sequence: number): string {
  return `evt_${sequence.toString(36)}_${hash.slice(0, 12)}`;
}

/**
 * Append an event to a chain. Pure: returns the new event; does not mutate the
 * input array. The caller persists it append-only.
 */
export function appendJournalEvent(chain: readonly JournalEvent[], input: JournalEventInput): JournalEvent {
  const previous = chain.length > 0 ? chain[chain.length - 1]! : null;
  const previousHash = previous ? previous.payloadHash : null;
  const sequence = chain.length;
  const payloadHash = computeEventHash(input, previousHash, sequence);
  return {
    ...input,
    eventId: deriveEventId(payloadHash, sequence),
    payloadHash,
    previousHash,
    sequence,
  };
}

export type ChainVerification =
  | { valid: true }
  | { valid: false; brokenAtIndex: number; reason: string };

/**
 * Verify the integrity of a journal chain. Detects: out-of-order sequence,
 * broken previousHash links, and content tampering (recomputed hash mismatch).
 */
export function verifyJournalChain(events: readonly JournalEvent[]): ChainVerification {
  let priorHash: string | null = null;
  for (let i = 0; i < events.length; i += 1) {
    const event = events[i]!;
    if (event.sequence !== i) {
      return { valid: false, brokenAtIndex: i, reason: `sequence mismatch: expected ${i}, got ${event.sequence}` };
    }
    if (event.previousHash !== priorHash) {
      return { valid: false, brokenAtIndex: i, reason: 'previousHash does not match prior event hash' };
    }
    const recomputed = computeEventHash(event, event.previousHash, event.sequence);
    if (recomputed !== event.payloadHash) {
      return { valid: false, brokenAtIndex: i, reason: 'content tampering: recomputed hash mismatch' };
    }
    priorHash = event.payloadHash;
  }
  return { valid: true };
}
