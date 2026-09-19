import type { MacroRegimeSignal, MacroSeries } from '@repo/api-contracts';

export type MacroRegimeModel = {
  inflationRegime: MacroRegimeSignal;
  ratesRegime: MacroRegimeSignal;
  growthRegime: MacroRegimeSignal;
  laborRegime: MacroRegimeSignal;
  liquidityRegime: MacroRegimeSignal;
  riskRegime: MacroRegimeSignal;
  overallMacroScore: number;
  confidence: number;
  /** Number of macro series (of the ~8 modeled) that actually carry data points. */
  seriesWithPoints: number;
  /** True when coverage meets {@link MACRO_MIN_SERIES}; gates degraded display. */
  hasSufficientData: boolean;
  explanations: string[];
  updatedAt: string;
};

/**
 * Minimum number of populated macro series required before the regime read is
 * presented as a precise score rather than a degraded "insufficient data" state.
 * Below this the inputs are too sparse to claim a meaningful regime.
 */
export const MACRO_MIN_SERIES = 3;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const latestValue = (series: MacroSeries[], id: string) => {
  const match = series.find((item) => item.seriesId === id || item.points.some((point) => point.normalizedSeriesId === id));
  return match?.points[match.points.length - 1]?.value ?? null;
};

function mkSignal(id: string, name: string, category: MacroRegimeSignal['category'], score: number, confidence: number, explanation: string, sourceSeriesIds: string[]): MacroRegimeSignal {
  return { id, name, category, score: clamp(score, -1, 1), confidence: clamp(confidence, 0, 1), explanation, sourceSeriesIds, updatedAt: new Date().toISOString() };
}

export function computeMacroRegimeModel(series: MacroSeries[]): MacroRegimeModel {
  const inflation = latestValue(series, 'inflation_cpi');
  const fedFunds = latestValue(series, 'policy_rate');
  const gdpGrowth = latestValue(series, 'gdp_growth');
  const unemployment = latestValue(series, 'unemployment_rate');
  const vix = latestValue(series, 'vix');
  const nfci = latestValue(series, 'nfci');
  const m2 = latestValue(series, 'm2sl');
  const y10 = latestValue(series, 'ust10y');
  const y2 = latestValue(series, 'ust2y');
  const curve = y10 !== null && y2 !== null ? y10 - y2 : null;
  const inflationScore = inflation === null ? 0 : clamp((2 - inflation) / 4, -1, 1);
  const ratesScore = fedFunds === null ? 0 : clamp((3 - fedFunds) / 4, -1, 1);
  const growthScore = gdpGrowth === null ? 0 : clamp(gdpGrowth / 4, -1, 1);
  const laborScore = unemployment === null ? 0 : clamp((5 - unemployment) / 4, -1, 1);
  const riskFromVix = vix === null ? 0 : clamp((20 - vix) / 15, -1, 1);
  const riskFromNfci = nfci === null ? 0 : clamp((-nfci) / 1.5, -1, 1);
  const riskScore = clamp(riskFromVix * 0.7 + riskFromNfci * 0.3, -1, 1);
  const liquidityFromCurve = curve === null ? 0 : clamp(curve / 2, -1, 1);
  const liquidityFromM2 = m2 === null ? 0 : clamp((m2 - 20000) / 20000, -1, 1);
  const liquidityScore = clamp(liquidityFromCurve * 0.7 + liquidityFromM2 * 0.3, -1, 1);
  const overall = clamp(inflationScore * 0.2 + ratesScore * 0.2 + growthScore * 0.2 + laborScore * 0.15 + riskScore * 0.15 + liquidityScore * 0.1, -1, 1);
  const seriesWithPoints = series.filter((item) => item.points.length > 0).length;
  const hasSufficientData = seriesWithPoints >= MACRO_MIN_SERIES;
  // Confidence is honestly 0 when no series carry data. The 0.2 floor only applies
  // once there is real coverage — it must never manufacture confidence from nothing
  // (otherwise the degraded "insufficient data" branch is unreachable dead code).
  const confidence = seriesWithPoints === 0 ? 0 : clamp(seriesWithPoints / 8, 0.2, 0.95);
  const explanations = [
    inflation !== null && fedFunds !== null && inflation > 3 && fedFunds > 4.5 ? 'Inflation pressure and restrictive rates imply higher risk pressure.' : null,
    curve !== null && curve < 0 ? 'Yield curve inversion contributes recession-risk pressure.' : null,
    unemployment !== null && unemployment > 5 ? 'Unemployment is elevated, signaling labor weakness.' : null,
    gdpGrowth !== null && gdpGrowth > 1.5 ? 'GDP growth remains supportive for broad risk appetite.' : null,
    vix !== null && vix > 25 ? 'Elevated volatility index points to risk-off conditions.' : null,
  ].filter((item): item is string => item !== null);

  return {
    inflationRegime: mkSignal('inflation', 'Inflation pressure', 'inflation', inflationScore, confidence, `CPI context score ${inflationScore.toFixed(2)}`, ['inflation_cpi', 'cpi_index']),
    ratesRegime: mkSignal('rates', 'Rates pressure', 'rates', ratesScore, confidence, `Policy and curve context score ${ratesScore.toFixed(2)}`, ['policy_rate', 'ust10y', 'ust2y']),
    growthRegime: mkSignal('growth', 'Growth backdrop', 'growth', growthScore, confidence, `Growth context score ${growthScore.toFixed(2)}`, ['gdp_growth']),
    laborRegime: mkSignal('labor', 'Labor backdrop', 'labor', laborScore, confidence, `Labor context score ${laborScore.toFixed(2)}`, ['unemployment_rate']),
    liquidityRegime: mkSignal('liquidity', 'Liquidity backdrop', 'liquidity', liquidityScore, confidence, `Liquidity context score ${liquidityScore.toFixed(2)}`, ['ust10y', 'ust2y', 'm2sl']),
    riskRegime: mkSignal('risk', 'Risk-on / risk-off', 'risk', riskScore, confidence, `Risk context score ${riskScore.toFixed(2)}`, ['vix', 'nfci']),
    overallMacroScore: overall,
    confidence,
    seriesWithPoints,
    hasSufficientData,
    explanations: explanations.length > 0 ? explanations : ['Macro regime confidence is limited; use as simulation context only.'],
    updatedAt: new Date().toISOString(),
  };
}
