const SOURCE_LABELS: Record<string, string> = {
  simulation: 'Simulation',
  manual_ui: 'Manual UI',
  manual: 'Manual UI',
  simulation_engine: 'Simulation engine',
  'stock-lane': 'Stock lane',
  'etf-lane': 'ETF lane',
  'crypto-lane': 'Crypto lane',
  manual_stock_lane: 'Stock lane',
  manual_multi_asset_lane: 'Multi-asset lane',
  ai_copilot_lane: 'AI simulation agent',
  signal_follow_lane: 'Signal lane',
  agent_sandbox_lane: 'Agent sandbox',
  'portfolio-intelligence': 'Portfolio intelligence',
  'simulation-controls': 'Control action',
  journal: 'Journal',
  signal: 'Signal lane',
  agent: 'AI simulation agent',
  observe: 'Observe',
};

function lookupLabel(token: string): string | null {
  return Object.prototype.hasOwnProperty.call(SOURCE_LABELS, token) ? SOURCE_LABELS[token]! : null;
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '_');
}

export function sanitizeSimulationSourceLabel(source: unknown): string {
  if (typeof source === 'string') {
    const trimmed = source.trim();
    if (!trimmed) return 'Simulation';
    const cleaned = trimmed.split(';')[0]?.split(',')[0] ?? trimmed;
    const sourceMatch = cleaned.match(/source=([a-z0-9_-]+)/i);
    if (sourceMatch?.[1]) {
      return SOURCE_LABELS[normalizeToken(sourceMatch[1])] ?? 'Simulation';
    }
    const explicitTokenMatch = trimmed.match(/([a-z]+(?:[_-][a-z0-9]+)+)/i);
    const explicitToken = explicitTokenMatch?.[1] ? normalizeToken(explicitTokenMatch[1]) : normalizeToken(cleaned);
    const explicitLabel = lookupLabel(explicitToken);
    if (explicitLabel) {
      return explicitLabel;
    }
    return lookupLabel(normalizeToken(cleaned)) ?? 'Simulation';
  }

  if (source && typeof source === 'object') {
    const candidate = source as Record<string, unknown>;
    if (typeof candidate.source === 'string') {
      return sanitizeSimulationSourceLabel(candidate.source);
    }
    if (typeof candidate.decisionSource === 'string') {
      return sanitizeSimulationSourceLabel(candidate.decisionSource);
    }
    return 'Simulation';
  }

  return 'Simulation';
}
