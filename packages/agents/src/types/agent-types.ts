export type TraceId = string & { readonly _brand: 'TraceId' };
export type AgentId = string & { readonly _brand: 'AgentId' };

export function makeTraceId(): TraceId {
  return crypto.randomUUID() as TraceId;
}

export interface AgentContext {
  readonly traceId: TraceId;
  readonly accountId: string;
  readonly userId: string;
  readonly modeId: string;
  readonly initiatedAt: string;
}

export type AgentResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: string; readonly code: string };

export function agentOk<T>(value: T): AgentResult<T> {
  return { ok: true, value };
}

export function agentError<T>(error: string, code: string): AgentResult<T> {
  return { ok: false, error, code };
}
