export function startTrace(name: string) {
  return { name, startedAt: Date.now() };
}
