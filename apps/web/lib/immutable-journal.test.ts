import { describe, expect, it } from 'vitest';
import {
  appendJournalEvent,
  hashContent,
  verifyJournalChain,
  type JournalEvent,
  type JournalEventInput,
} from './immutable-journal';

function input(overrides: Partial<JournalEventInput> = {}): JournalEventInput {
  return {
    eventType: 'ORDER_PREVIEWED',
    aggregateId: 'order-1',
    actorType: 'AGENT',
    actorId: 'sim-agent',
    createdAt: '2026-06-01T10:00:00.000Z',
    payload: { symbol: 'AAPL', side: 'buy', quantity: 3 },
    ...overrides,
  };
}

function buildChain(): JournalEvent[] {
  const chain: JournalEvent[] = [];
  chain.push(appendJournalEvent(chain, input({ eventType: 'SIGNAL_CREATED', aggregateId: 'sig-1' })));
  chain.push(appendJournalEvent(chain, input({ eventType: 'RISK_CHECKED' })));
  chain.push(appendJournalEvent(chain, input({ eventType: 'ORDER_PREVIEWED' })));
  chain.push(appendJournalEvent(chain, input({ eventType: 'SIM_ORDER_EXECUTED' })));
  return chain;
}

describe('hashContent', () => {
  it('is deterministic and order-stable for object keys', () => {
    expect(hashContent('a')).toBe(hashContent('a'));
    expect(hashContent('a')).not.toBe(hashContent('b'));
  });
});

describe('appendJournalEvent', () => {
  it('genesis event has null previousHash and sequence 0', () => {
    const ev = appendJournalEvent([], input());
    expect(ev.previousHash).toBeNull();
    expect(ev.sequence).toBe(0);
    expect(ev.payloadHash).toMatch(/^[0-9a-f]{16}$/);
    expect(ev.eventId.startsWith('evt_')).toBe(true);
  });

  it('does not mutate the input chain and links to the prior hash', () => {
    const chain: JournalEvent[] = [];
    const first = appendJournalEvent(chain, input());
    expect(chain).toHaveLength(0); // pure
    const second = appendJournalEvent([first], input({ eventType: 'ORDER_APPROVED' }));
    expect(second.previousHash).toBe(first.payloadHash);
    expect(second.sequence).toBe(1);
  });

  it('produces a deterministic chain for the same inputs', () => {
    const a = buildChain().map((e) => e.payloadHash);
    const b = buildChain().map((e) => e.payloadHash);
    expect(a).toEqual(b);
  });
});

describe('verifyJournalChain', () => {
  it('verifies an intact chain', () => {
    expect(verifyJournalChain(buildChain())).toEqual({ valid: true });
  });

  it('detects content tampering', () => {
    const chain = buildChain();
    const tampered = chain.map((e, i) =>
      i === 1 ? { ...e, payload: { ...e.payload, quantity: 999 } } : e,
    );
    const result = verifyJournalChain(tampered);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.brokenAtIndex).toBe(1);
      expect(result.reason).toContain('tampering');
    }
  });

  it('detects a broken previousHash link', () => {
    const chain = buildChain();
    const broken = chain.map((e, i) => (i === 2 ? { ...e, previousHash: 'deadbeefdeadbeef' } : e));
    const result = verifyJournalChain(broken);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.brokenAtIndex).toBe(2);
  });

  it('detects out-of-order sequence', () => {
    const chain = buildChain();
    const reordered = [chain[1]!, chain[0]!, chain[2]!, chain[3]!];
    const result = verifyJournalChain(reordered);
    expect(result.valid).toBe(false);
  });

  it('verifies the empty chain as valid', () => {
    expect(verifyJournalChain([])).toEqual({ valid: true });
  });
});
