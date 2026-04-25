import { getProviderEnv, requireTiingoApiKey } from '../../config';
import { fetchJson } from '../../shared/http-client';
import { createMissingConfigError } from '../errors';
import { assetMetadataSchema } from '../schemas';
import { resolveTiingoSymbol } from '../provider-symbols';
export function isTiingoConfigured() {
    return Boolean(getProviderEnv().TIINGO_API_KEY);
}
export async function fetchTiingoMetadata(symbol) {
    const providerSymbol = resolveTiingoSymbol(symbol);
    if (!providerSymbol) {
        throw createMissingConfigError('tiingo', `Tiingo does not support metadata for ${symbol}.`);
    }
    if (!isTiingoConfigured()) {
        throw createMissingConfigError('tiingo', 'Tiingo is not configured.');
    }
    const token = requireTiingoApiKey();
    const result = await fetchJson(`https://api.tiingo.com/tiingo/daily/${providerSymbol}?token=${token}`);
    if (!result?.ticker || !result.name) {
        throw new Error(`Tiingo returned no metadata for ${symbol}.`);
    }
    return assetMetadataSchema.parse({
        symbol,
        assetKind: 'stock',
        name: result.name,
        exchange: result.exchangeCode ?? null,
        currency: 'USD',
        description: result.description ?? null,
        source: 'tiingo',
        updatedAt: result.endDate ? new Date(result.endDate).toISOString() : new Date().toISOString(),
    });
}
