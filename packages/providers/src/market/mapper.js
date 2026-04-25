import { eodhdHistoricalPointSchema, eodhdRealTimeSchema, finnhubCandleSchema, finnhubQuoteSchema, marketHistoryPointSchema, marketObservationSchema, } from './schemas';
import { detectCanonicalAssetKind, normalizeMarketSymbol } from './provider-symbols';
export function mapFinnhubObservation(symbol, input) {
    const normalizedSymbol = normalizeMarketSymbol(symbol);
    const parsed = finnhubQuoteSchema.parse(input);
    const observation = {
        symbol: normalizedSymbol,
        assetKind: detectCanonicalAssetKind(normalizedSymbol),
        price: parsed.c,
        timestamp: new Date(parsed.t * 1000).toISOString(),
        source: 'finnhub',
        currency: 'USD',
    };
    if (parsed.d !== undefined) {
        observation.change = parsed.d;
    }
    if (parsed.dp !== undefined) {
        observation.changePercent = parsed.dp;
    }
    if (parsed.pc !== undefined) {
        observation.previousClose = parsed.pc;
    }
    marketObservationSchema.parse(observation);
    return observation;
}
export function mapEodhdObservation(symbol, input) {
    const normalizedSymbol = normalizeMarketSymbol(symbol);
    const parsed = eodhdRealTimeSchema.parse(input);
    const numericPrice = Number(parsed.close ?? Number.NaN);
    const numericChange = Number(parsed.change ?? Number.NaN);
    const numericChangePercent = Number(parsed.change_p ?? Number.NaN);
    const numericPreviousClose = Number(parsed.previousClose ?? Number.NaN);
    const timestampSeconds = Number(parsed.timestamp ?? Number.NaN);
    const observation = {
        symbol: normalizedSymbol,
        assetKind: detectCanonicalAssetKind(normalizedSymbol),
        price: numericPrice,
        timestamp: Number.isFinite(timestampSeconds)
            ? new Date(timestampSeconds * 1000).toISOString()
            : new Date().toISOString(),
        source: 'eodhd',
        currency: 'USD',
    };
    if (Number.isFinite(numericChange)) {
        observation.change = numericChange;
    }
    if (Number.isFinite(numericChangePercent)) {
        observation.changePercent = numericChangePercent;
    }
    if (Number.isFinite(numericPreviousClose)) {
        observation.previousClose = numericPreviousClose;
    }
    marketObservationSchema.parse(observation);
    return observation;
}
export function mapFinnhubHistory(symbol, input) {
    const normalizedSymbol = normalizeMarketSymbol(symbol);
    const parsed = finnhubCandleSchema.parse(input);
    if (parsed.s !== 'ok') {
        return [];
    }
    return parsed.t.map((timestampSeconds, index) => {
        const point = {
            symbol: normalizedSymbol,
            assetKind: detectCanonicalAssetKind(normalizedSymbol),
            timestamp: new Date(timestampSeconds * 1000).toISOString(),
            open: parsed.o[index] ?? parsed.c[index] ?? 0,
            high: parsed.h[index] ?? parsed.c[index] ?? 0,
            low: parsed.l[index] ?? parsed.c[index] ?? 0,
            close: parsed.c[index] ?? 0,
            source: 'finnhub',
        };
        const volume = parsed.v?.[index];
        if (volume !== undefined) {
            point.volume = volume;
        }
        marketHistoryPointSchema.parse(point);
        return point;
    });
}
export function mapEodhdHistory(symbol, input) {
    const normalizedSymbol = normalizeMarketSymbol(symbol);
    return input.flatMap((item) => {
        const parsed = eodhdHistoricalPointSchema.parse(item);
        const open = Number(parsed.open ?? Number.NaN);
        const high = Number(parsed.high ?? Number.NaN);
        const low = Number(parsed.low ?? Number.NaN);
        const close = Number(parsed.close ?? parsed.adjusted_close ?? Number.NaN);
        if (!parsed.date || !Number.isFinite(open) || !Number.isFinite(high) || !Number.isFinite(low) || !Number.isFinite(close)) {
            return [];
        }
        const point = {
            symbol: normalizedSymbol,
            assetKind: detectCanonicalAssetKind(normalizedSymbol),
            timestamp: new Date(`${parsed.date}T00:00:00Z`).toISOString(),
            open,
            high,
            low,
            close,
            source: 'eodhd',
        };
        const volume = Number(parsed.volume ?? Number.NaN);
        if (Number.isFinite(volume)) {
            point.volume = volume;
        }
        marketHistoryPointSchema.parse(point);
        return [point];
    });
}
