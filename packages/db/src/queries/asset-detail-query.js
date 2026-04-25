import { getCatalogAssetBySymbol } from '../repositories/asset-repository';
import { getMarketHistoryBars, getLatestMarketQuoteSnapshot } from '../repositories/market-data-repository';
export async function getAssetDetail(symbol) {
    const asset = await getCatalogAssetBySymbol(symbol);
    if (!asset) {
        return null;
    }
    const [quote, history] = await Promise.all([
        getLatestMarketQuoteSnapshot(asset.symbol),
        getMarketHistoryBars(asset.symbol),
    ]);
    return {
        asset,
        quote,
        history,
    };
}
