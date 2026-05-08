export type RelationshipSeverity = 'INFO' | 'WATCH' | 'WARNING' | 'CRITICAL';

export type CrossAssetInput = {
  symbol: string;
  assetClass: 'stock' | 'etf' | 'crypto' | 'other';
  changePercent: number | null;
  confidence: number | null;
  action: 'BUY' | 'SELL' | 'HOLD' | 'REDUCE';
  newsSentiment: number | null;
};

export type CrossAssetRelationshipInsight = {
  id: string;
  title: string;
  symbols: string[];
  severity: RelationshipSeverity;
  confidence: number;
  narrative: string;
  kind: 'contagion' | 'alignment' | 'rotation' | 'divergence';
};

const RELATIONSHIP_CLUSTERS: Array<{
  id: string;
  title: string;
  symbols: string[];
  labels: { positive: string; negative: string };
}> = [
  {
    id: 'semis-us-growth',
    title: 'Semiconductor growth chain',
    symbols: ['NVDA', 'AMD', 'SOXX', 'QQQ'],
    labels: {
      positive: 'Semiconductor strength is propagating through growth exposure.',
      negative: 'Semiconductor weakness is propagating through growth exposure.',
    },
  },
  {
    id: 'crypto-equity-beta',
    title: 'Crypto-equity beta chain',
    symbols: ['BTC', 'ETH', 'COIN', 'MSTR'],
    labels: {
      positive: 'Crypto-led momentum is reinforcing proxy equities.',
      negative: 'Crypto weakness is pressuring proxy equities.',
    },
  },
  {
    id: 'metals-defensive',
    title: 'Defensive metals chain',
    symbols: ['XAU', 'GLD', 'GDX'],
    labels: {
      positive: 'Defensive precious metal demand is broadening.',
      negative: 'Defensive metal bid is fading across proxies.',
    },
  },
  {
    id: 'energy-complex',
    title: 'Energy complex',
    symbols: ['CL', 'USO', 'XLE'],
    labels: {
      positive: 'Energy strength is broad across commodity and ETF proxies.',
      negative: 'Energy weakness is spreading across commodity and ETF proxies.',
    },
  },
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function severityFromMagnitude(magnitude: number): RelationshipSeverity {
  if (magnitude >= 0.72) return 'CRITICAL';
  if (magnitude >= 0.56) return 'WARNING';
  if (magnitude >= 0.35) return 'WATCH';
  return 'INFO';
}

function normalizeSignalDirection(action: CrossAssetInput['action']) {
  if (action === 'BUY') return 1;
  if (action === 'SELL' || action === 'REDUCE') return -1;
  return 0;
}

export function buildCrossAssetRelationshipInsights(rows: CrossAssetInput[]): CrossAssetRelationshipInsight[] {
  const bySymbol = new Map(rows.map((row) => [row.symbol.toUpperCase(), row] as const));
  const insights: CrossAssetRelationshipInsight[] = [];

  for (const cluster of RELATIONSHIP_CLUSTERS) {
    const present = cluster.symbols
      .map((symbol) => bySymbol.get(symbol))
      .filter((row): row is CrossAssetInput => Boolean(row));
    if (present.length < 2) {
      continue;
    }

    const averageMove =
      present.reduce((sum, row) => sum + (row.changePercent ?? 0), 0) / Math.max(1, present.length);
    const averageConfidence =
      present.reduce((sum, row) => sum + (row.confidence ?? 0.5), 0) / Math.max(1, present.length);
    const directionAlignment =
      present.reduce((sum, row) => sum + normalizeSignalDirection(row.action), 0) / Math.max(1, present.length);
    const averageSentiment =
      present.reduce((sum, row) => sum + (row.newsSentiment ?? 0), 0) / Math.max(1, present.length);

    const moveMagnitude = clamp(Math.abs(averageMove) / 5, 0, 1);
    const alignmentMagnitude = clamp(Math.abs(directionAlignment), 0, 1);
    const sentimentMagnitude = clamp(Math.abs(averageSentiment), 0, 1);
    const confidenceMagnitude = clamp(averageConfidence, 0, 1);
    const compositeMagnitude = clamp(
      moveMagnitude * 0.38 + alignmentMagnitude * 0.24 + sentimentMagnitude * 0.18 + confidenceMagnitude * 0.2,
      0,
      1,
    );

    const bullish = averageMove >= 0 && directionAlignment >= 0;
    const bearish = averageMove <= 0 && directionAlignment <= 0;
    const kind: CrossAssetRelationshipInsight['kind'] =
      bullish || bearish ? 'contagion' : Math.abs(directionAlignment) < 0.2 ? 'divergence' : 'rotation';
    const narrativeLead = bullish
      ? cluster.labels.positive
      : bearish
        ? cluster.labels.negative
        : 'Cluster is rotating with mixed signal direction.';

    const symbols = present.map((row) => row.symbol);
    const narrative =
      `${narrativeLead} Average move ${averageMove.toFixed(2)}%, alignment ${(alignmentMagnitude * 100).toFixed(0)}%, ` +
      `confidence ${(averageConfidence * 100).toFixed(0)}%, news tone ${averageSentiment.toFixed(2)}.`;

    insights.push({
      id: `cluster-${cluster.id}`,
      title: cluster.title,
      symbols,
      severity: severityFromMagnitude(compositeMagnitude),
      confidence: clamp(compositeMagnitude, 0.05, 0.99),
      narrative,
      kind,
    });
  }

  return insights.sort((a, b) => b.confidence - a.confidence);
}
