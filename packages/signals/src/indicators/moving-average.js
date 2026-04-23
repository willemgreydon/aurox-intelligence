export function movingAverage(values, period) {
    if (values.length < period || period <= 0)
        return null;
    const slice = values.slice(-period);
    return slice.reduce((sum, value) => sum + value, 0) / period;
}
