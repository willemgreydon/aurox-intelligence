import { momentum } from '../indicators/momentum';
import { movingAverage } from '../indicators/moving-average';
import { trendStrength } from '../indicators/trend-strength';
import { volatility } from '../indicators/volatility';
import { compositeScore } from '../scoring/composite-score';
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
export function deriveSignalSnapshot(assetId, values) {
    const latestPrice = values.at(-1) ?? null;
    const shortMovingAverage = movingAverage(values, Math.min(5, values.length));
    const longMovingAverage = movingAverage(values, Math.min(20, values.length));
    const momentumValue = momentum(values);
    const volatilityValue = volatility(values);
    const trendStrengthValue = momentumValue === null ? 0 : trendStrength(momentumValue, volatilityValue);
    const movingAverageSpread = shortMovingAverage !== null && longMovingAverage !== null && longMovingAverage !== 0
        ? (shortMovingAverage - longMovingAverage) / longMovingAverage
        : 0;
    const normalizedMomentum = latestPrice && momentumValue !== null ? momentumValue / latestPrice : 0;
    const normalizedTrend = trendStrengthValue / 10;
    const compositeScoreValue = clamp(compositeScore([movingAverageSpread, normalizedMomentum, normalizedTrend]), -1, 1);
    const interpretation = compositeScoreValue > 0.05 ? 'bullish' : compositeScoreValue < -0.05 ? 'bearish' : 'neutral';
    const confidenceScore = clamp((Math.abs(compositeScoreValue) + trendStrengthValue / 10) / 2, 0.2, 0.95);
    return {
        assetId,
        name: `${assetId} composite signal`,
        value: compositeScoreValue,
        interpretation,
        latestPrice,
        shortMovingAverage,
        longMovingAverage,
        momentumValue,
        volatilityValue,
        trendStrengthValue,
        compositeScoreValue,
        confidenceScore,
        scoreBreakdown: {
            movingAverageContrib: movingAverageSpread,
            momentumContrib: normalizedMomentum,
            trendContrib: normalizedTrend,
        },
    };
}
