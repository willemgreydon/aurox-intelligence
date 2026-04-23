export function trendStrength(change, volatilityValue) {
    if (volatilityValue === 0)
        return 0;
    return change / volatilityValue;
}
