export function buildSimulationTicketHref(symbol?: string | null): string {
  if (!symbol) return '/invest/simulation';
  return `/invest/simulation?symbol=${encodeURIComponent(symbol)}&intent=prepare`;
}
