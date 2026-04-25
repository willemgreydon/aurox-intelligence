import { momentum, movingAverage, volatility } from '@repo/signals';
const MIN_HISTORY_POINTS = 20;
const PARTIAL_HISTORY_POINTS = 8;
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
function computeFreshnessDiscount(freshnessState) {
    return (freshnessState === 'live' ? 0 :
        freshnessState === 'delayed' ? 0.2 :
            freshnessState === 'partial' ? 0.4 :
                freshnessState === 'stale' ? 0.6 :
                    0.8);
}
function toFiniteCloseSeries(values) {
    return (values ?? []).filter((value) => Number.isFinite(value) && value > 0);
}
function computeDailyReturns(closes) {
    const returns = [];
    for (let index = 1; index < closes.length; index += 1) {
        const previous = closes[index - 1];
        const current = closes[index];
        if (!previous || !current) {
            continue;
        }
        returns.push((current - previous) / previous);
    }
    return returns;
}
function computeSignalScore(changePercent) {
    if (changePercent === null)
        return 0;
    return clamp(changePercent / 10, -1, 1);
}
function computeHistoricalSignalMetrics(input) {
    const closes = toFiniteCloseSeries(input.historyCloses);
    if (closes.length < MIN_HISTORY_POINTS) {
        return null;
    }
    const shortMa = movingAverage(closes, Math.min(5, closes.length));
    const longMa = movingAverage(closes, Math.min(20, closes.length));
    const momentumRaw = momentum(closes);
    const firstPrice = closes[0] ?? 0;
    const returns = computeDailyReturns(closes);
    const dailyVolatility = returns.length > 1 ? volatility(returns) : 0;
    const trendScore = shortMa !== null && longMa !== null && longMa > 0
        ? clamp(((shortMa - longMa) / longMa) * 8, -1, 1)
        : 0;
    const momentumScore = momentumRaw !== null && firstPrice > 0
        ? clamp((momentumRaw / firstPrice) * 6, -1, 1)
        : 0;
    const volatilityScore = clamp(1 - dailyVolatility / 0.05, -1, 1);
    const signalScore = clamp(0.45 * trendScore +
        0.35 * momentumScore +
        0.20 * volatilityScore, -1, 1);
    const riskAdjustedMomentum = clamp(momentumScore * clamp(1 - dailyVolatility / 0.08, 0.15, 1) * (1 - computeFreshnessDiscount(input.freshnessState)), -1, 1);
    return {
        trendScore,
        momentumScore,
        volatilityScore,
        signalScore,
        riskAdjustedMomentum,
        dailyVolatility,
        pointCount: closes.length,
    };
}
function computeFactorScore(stance, insightConfidence) {
    const base = stance === 'positive' ? 0.5 : stance === 'negative' ? -0.5 : 0;
    return clamp(base * insightConfidence * 2, -1, 1);
}
function computeRegimeScore(stance, insightConfidence) {
    if (stance === 'positive')
        return clamp(0.8 * insightConfidence, 0, 1);
    if (stance === 'negative')
        return clamp(-0.8 * insightConfidence, -1, 0);
    return 0;
}
function computeRiskAdjustedMomentum(changePercent, freshnessState) {
    const base = computeSignalScore(changePercent);
    return base * (1 - computeFreshnessDiscount(freshnessState));
}
function computeLiquidityScore(assetKind) {
    if (assetKind === 'stock')
        return 0.7;
    if (assetKind === 'etf')
        return 0.6;
    return 0.3;
}
export function computeCompositeScore(components) {
    return clamp(0.35 * components.signalScore +
        0.25 * components.factorScore +
        0.15 * components.regimeScore +
        0.15 * components.riskAdjustedMomentum +
        0.10 * components.liquidityScore, -1, 1);
}
function computeVolatilityRisk(assetKind, changePercent, historicalDailyVolatility) {
    const base = assetKind === 'crypto' ? 0.6 : assetKind === 'stock' ? 0.25 : 0.15;
    const largeMove = changePercent !== null && Math.abs(changePercent) > 5 ? 0.2 : 0;
    const historicalVolatilityRisk = historicalDailyVolatility === null ? 0 :
        historicalDailyVolatility >= 0.06 ? 0.3 :
            historicalDailyVolatility >= 0.04 ? 0.2 :
                historicalDailyVolatility >= 0.02 ? 0.1 :
                    0;
    return clamp(base + largeMove + historicalVolatilityRisk, 0, 1);
}
function computeLiquidityRisk(assetKind) {
    if (assetKind === 'stock')
        return 0.15;
    if (assetKind === 'etf')
        return 0.20;
    return 0.35;
}
function computeDrawdownRisk(changePercent) {
    if (changePercent === null)
        return 0.10;
    if (changePercent < 0)
        return clamp(Math.abs(changePercent) / 20, 0, 1);
    return 0.05;
}
export function computeRiskPenalty(factors) {
    return clamp(0.30 * factors.volatilityRisk +
        0.25 * factors.liquidityRisk +
        0.20 * factors.drawdownRisk +
        0.15 * factors.correlationRisk +
        0.10 * factors.anomalyRisk, 0, 0.75);
}
export function mapRankingRecommendation(score) {
    if (score >= 0.75)
        return 'strong_buy';
    if (score >= 0.55)
        return 'buy';
    if (score <= -0.60)
        return 'strong_sell';
    if (score <= -0.25)
        return 'sell';
    return 'hold';
}
function computeAnomalyRisk(freshnessState, changePercent) {
    if (freshnessState === 'unavailable')
        return 0.8;
    if (freshnessState === 'stale')
        return 0.5;
    if (changePercent !== null && Math.abs(changePercent) > 10)
        return 0.4;
    return 0.1;
}
function isMissingCriticalData(input) {
    return (input.changePercent === null &&
        (input.freshnessState === 'unavailable' || input.freshnessState === 'stale'));
}
export function computeRankingConfidence(input, signalScore, factorScore) {
    if (isMissingCriticalData(input))
        return 0.20;
    let confidence = 0.15;
    if (input.changePercent !== null)
        confidence += 0.25;
    const historyPoints = toFiniteCloseSeries(input.historyCloses).length;
    if (historyPoints >= MIN_HISTORY_POINTS)
        confidence += 0.18;
    else if (historyPoints >= PARTIAL_HISTORY_POINTS)
        confidence += 0.08;
    else if (historyPoints > 0)
        confidence -= 0.08;
    if (input.freshnessState === 'live')
        confidence += 0.20;
    else if (input.freshnessState === 'delayed')
        confidence += 0.12;
    else if (input.freshnessState === 'partial')
        confidence += 0.06;
    const signalAgrees = (signalScore > 0.05 && factorScore > 0.05) ||
        (signalScore < -0.05 && factorScore < -0.05);
    if (signalAgrees)
        confidence += 0.20;
    confidence += input.insightConfidence * 0.10;
    if (input.freshnessState === 'stale' || input.freshnessState === 'unavailable') {
        return Math.min(clamp(confidence, 0.15, 0.90), 0.35);
    }
    return clamp(confidence, 0.15, 0.90);
}
function buildSignalSummary(signalScore, changePercent, historicalMetrics) {
    if (historicalMetrics) {
        return (`History model (${historicalMetrics.pointCount} closes): trend ${historicalMetrics.trendScore.toFixed(2)}, ` +
            `momentum ${historicalMetrics.momentumScore.toFixed(2)}, volatility ${historicalMetrics.volatilityScore.toFixed(2)}. ` +
            `Composite signal ${signalScore.toFixed(2)}.`);
    }
    if (changePercent === null)
        return 'No price movement data available.';
    const dir = signalScore > 0.05 ? 'bullish' : signalScore < -0.05 ? 'bearish' : 'neutral';
    const sign = changePercent > 0 ? '+' : '';
    return `Price signal is ${dir} at ${sign}${changePercent.toFixed(2)}%.`;
}
function buildFactorSummary(stance, insightConfidence) {
    return `Market stance is ${stance} with ${(insightConfidence * 100).toFixed(0)}% intelligence confidence.`;
}
function buildRegimeSummary(regimeScore) {
    if (regimeScore > 0.3)
        return 'Regime favors risk-on conditions.';
    if (regimeScore < -0.3)
        return 'Regime shows risk-off conditions.';
    return 'Regime is mixed or transitional.';
}
function buildRiskSummaryText(riskPenalty, assetKind) {
    const level = riskPenalty > 0.5 ? 'elevated' : riskPenalty > 0.25 ? 'moderate' : 'contained';
    return `Risk penalty is ${level} (${(riskPenalty * 100).toFixed(0)}%) for this ${assetKind}.`;
}
function buildExplanation(input, finalScore, recommendation, confidence, riskPenalty, historicalMetrics) {
    if (isMissingCriticalData(input)) {
        return `${input.symbol} is missing critical market data. Insufficient data to score reliably - defaulting to hold with low confidence.`;
    }
    const recLabel = recommendation.replace('_', ' ');
    const historyPoints = toFiniteCloseSeries(input.historyCloses).length;
    const historyNote = historicalMetrics
        ? `Historical OHLCV scoring used (${historicalMetrics.pointCount} closes). `
        : historyPoints > 0
            ? 'Historical data is present but insufficient, so quote fallback scoring was used. '
            : 'No historical series available, so quote fallback scoring was used. ';
    return (historyNote +
        `${input.symbol} scored ${finalScore.toFixed(3)} (${recLabel}) ` +
        `with ${(confidence * 100).toFixed(0)}% confidence. ` +
        `Risk discount of ${(riskPenalty * 100).toFixed(0)}% applied due to ${input.assetKind} volatility and data freshness.`);
}
export function rankAssets(inputs) {
    const updatedAt = new Date().toISOString();
    const scored = inputs.map((input) => {
        if (isMissingCriticalData(input)) {
            return {
                symbol: input.symbol,
                assetId: input.assetId,
                assetKind: input.assetKind,
                rank: 0,
                score: 0,
                confidence: 0.20,
                recommendation: 'hold',
                horizon: 'short',
                signalSummary: 'Insufficient price data.',
                factorSummary: `Market stance: ${input.insightStance}.`,
                regimeSummary: 'Regime cannot be determined from available data.',
                riskSummary: 'Risk profile unknown due to missing market data.',
                explanation: `${input.symbol} is missing critical market data. Defaulting to hold with low confidence.`,
                updatedAt,
            };
        }
        const historicalMetrics = computeHistoricalSignalMetrics(input);
        const signalScore = historicalMetrics?.signalScore ?? computeSignalScore(input.changePercent);
        const factorScore = computeFactorScore(input.insightStance, input.insightConfidence);
        const regimeScore = computeRegimeScore(input.insightStance, input.insightConfidence);
        const riskAdjustedMomentum = historicalMetrics?.riskAdjustedMomentum ??
            computeRiskAdjustedMomentum(input.changePercent, input.freshnessState);
        const liquidityScore = computeLiquidityScore(input.assetKind);
        const compositeScore = computeCompositeScore({
            signalScore,
            factorScore,
            regimeScore,
            riskAdjustedMomentum,
            liquidityScore,
        });
        const volatilityRisk = computeVolatilityRisk(input.assetKind, input.changePercent, historicalMetrics?.dailyVolatility ?? null);
        const liquidityRisk = computeLiquidityRisk(input.assetKind);
        const drawdownRisk = computeDrawdownRisk(input.changePercent);
        const correlationRisk = 0;
        const anomalyRisk = computeAnomalyRisk(input.freshnessState, input.changePercent);
        const riskPenalty = computeRiskPenalty({
            volatilityRisk,
            liquidityRisk,
            drawdownRisk,
            correlationRisk,
            anomalyRisk,
        });
        const finalScore = clamp(compositeScore * (1 - riskPenalty), -1, 1);
        const recommendation = mapRankingRecommendation(finalScore);
        const confidence = computeRankingConfidence(input, signalScore, factorScore);
        return {
            symbol: input.symbol,
            assetId: input.assetId,
            assetKind: input.assetKind,
            rank: 0,
            score: finalScore,
            confidence,
            recommendation,
            horizon: 'short',
            signalSummary: buildSignalSummary(signalScore, input.changePercent, historicalMetrics),
            factorSummary: buildFactorSummary(input.insightStance, input.insightConfidence),
            regimeSummary: buildRegimeSummary(regimeScore),
            riskSummary: buildRiskSummaryText(riskPenalty, input.assetKind),
            explanation: buildExplanation(input, finalScore, recommendation, confidence, riskPenalty, historicalMetrics),
            updatedAt,
        };
    });
    scored.sort((a, b) => {
        if (Math.abs(b.score - a.score) > 1e-9)
            return b.score - a.score;
        return b.confidence - a.confidence;
    });
    return scored.map((item, index) => ({ ...item, rank: index + 1 }));
}
