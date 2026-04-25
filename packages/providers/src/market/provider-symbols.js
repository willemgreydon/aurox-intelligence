import { DEFAULT_CRYPTO_SYMBOLS, DEFAULT_ETF_SYMBOLS, DEFAULT_INDEX_SYMBOLS, } from './default-symbol-universe';
const ETF_SYMBOLS = new Set(DEFAULT_ETF_SYMBOLS);
const INDEX_SYMBOLS = new Set(DEFAULT_INDEX_SYMBOLS);
const COMMON_CRYPTO_BASES = new Set(DEFAULT_CRYPTO_SYMBOLS
    .filter((symbol) => symbol.startsWith('BINANCE:'))
    .map((symbol) => symbol.replace('BINANCE:', ''))
    .map((pair) => {
    if (pair.endsWith('USDT'))
        return pair.slice(0, -4);
    if (pair.endsWith('USD'))
        return pair.slice(0, -3);
    if (pair.endsWith('BTC'))
        return pair.slice(0, -3);
    if (pair.endsWith('ETH'))
        return pair.slice(0, -3);
    return pair;
}));
const COINGECKO_ID_BY_SYMBOL = {
    'BINANCE:BTCUSDT': 'bitcoin',
    'BINANCE:ETHUSDT': 'ethereum',
    'BINANCE:SOLUSDT': 'solana',
    'BINANCE:XRPUSDT': 'ripple',
    'BINANCE:BNBUSDT': 'binancecoin',
    'BINANCE:ADAUSDT': 'cardano',
    'BINANCE:AVAXUSDT': 'avalanche-2',
    'BINANCE:DOGEUSDT': 'dogecoin',
    'BINANCE:LINKUSDT': 'chainlink',
    'BINANCE:DOTUSDT': 'polkadot',
    'BINANCE:MATICUSDT': 'matic-network',
    'BINANCE:POLUSDT': 'polygon-ecosystem-token',
    'BINANCE:LTCUSDT': 'litecoin',
    'BINANCE:BCHUSDT': 'bitcoin-cash',
    'BINANCE:UNIUSDT': 'uniswap',
    'BINANCE:ATOMUSDT': 'cosmos',
    'BINANCE:NEARUSDT': 'near',
    'BINANCE:APTUSDT': 'aptos',
    'BINANCE:ARBUSDT': 'arbitrum',
    'BINANCE:OPUSDT': 'optimism',
    'BINANCE:ETCUSDT': 'ethereum-classic',
    'BINANCE:FILUSDT': 'filecoin',
    'BINANCE:ICPUSDT': 'internet-computer',
    'BINANCE:INJUSDT': 'injective-protocol',
    'BINANCE:TONUSDT': 'the-open-network',
    'BINANCE:TRXUSDT': 'tron',
    'BINANCE:HBARUSDT': 'hedera-hashgraph',
    'BINANCE:VETUSDT': 'vechain',
    'BINANCE:ALGOUSDT': 'algorand',
    'BINANCE:AAVEUSDT': 'aave',
    'BINANCE:RNDRUSDT': 'render-token',
    'BINANCE:SUIUSDT': 'sui',
    'BINANCE:SEIUSDT': 'sei-network',
    'BINANCE:PEPEUSDT': 'pepe',
    'BINANCE:SHIBUSDT': 'shiba-inu',
    BTC: 'bitcoin',
    ETH: 'ethereum',
    SOL: 'solana',
};
function normalizeWhitespace(input) {
    return input.trim().replace(/\s+/g, '');
}
function isPlainEquityLike(symbol) {
    return /^[A-Z.\-]{1,20}$/.test(symbol);
}
function normalizeForexPair(raw) {
    const normalized = raw.replace(/^OANDA:/, '').replace(/[\/_-]/g, '').toUpperCase();
    if (!/^[A-Z]{6}$/.test(normalized)) {
        return null;
    }
    return `OANDA:${normalized.slice(0, 3)}_${normalized.slice(3)}`;
}
function normalizeCryptoFromDashedPair(pair) {
    const cleaned = pair.replace('/', '-').toUpperCase();
    const match = cleaned.match(/^([A-Z0-9]{2,12})-([A-Z0-9]{2,8})$/);
    if (!match) {
        return null;
    }
    const [, base, quote] = match;
    if (quote === 'USD' || quote === 'USDT') {
        return `BINANCE:${base}USDT`;
    }
    return `BINANCE:${base}${quote}`;
}
function normalizeCryptoFromConcatenated(pair) {
    const normalized = pair.toUpperCase();
    const knownQuotes = ['USDT', 'USD', 'BTC', 'ETH', 'EUR'];
    for (const quote of knownQuotes) {
        if (normalized.endsWith(quote) && normalized.length > quote.length) {
            const base = normalized.slice(0, -quote.length);
            if (!base || !COMMON_CRYPTO_BASES.has(base)) {
                continue;
            }
            if (quote === 'USD') {
                return `BINANCE:${base}USDT`;
            }
            return `BINANCE:${base}${quote}`;
        }
    }
    return null;
}
export function normalizeMarketSymbol(symbol) {
    const raw = normalizeWhitespace(symbol).toUpperCase();
    if (!raw) {
        return raw;
    }
    if (raw.startsWith('OANDA:')) {
        return normalizeForexPair(raw) ?? raw;
    }
    if (raw.endsWith('.FOREX')) {
        const normalized = raw.replace(/\.FOREX$/, '');
        return normalizeForexPair(normalized) ?? raw;
    }
    if (raw.startsWith('BINANCE:')) {
        const suffix = raw.slice('BINANCE:'.length);
        if (suffix.includes('-') || suffix.includes('/')) {
            return normalizeCryptoFromDashedPair(suffix) ?? raw;
        }
        return `BINANCE:${suffix.replace(/_/g, '').toUpperCase()}`;
    }
    if (raw.startsWith('COINBASE:')) {
        const suffix = raw.slice('COINBASE:'.length);
        return normalizeCryptoFromDashedPair(suffix) ?? raw;
    }
    if (raw.endsWith('.CC')) {
        const suffix = raw.replace(/\.CC$/, '');
        return normalizeCryptoFromDashedPair(suffix) ?? normalizeCryptoFromConcatenated(suffix) ?? raw;
    }
    if (raw.includes('/') || raw.includes('-')) {
        const forexCandidate = normalizeForexPair(raw);
        if (forexCandidate) {
            return forexCandidate;
        }
        const cryptoCandidate = normalizeCryptoFromDashedPair(raw);
        if (cryptoCandidate) {
            return cryptoCandidate;
        }
    }
    const cryptoCandidate = normalizeCryptoFromConcatenated(raw);
    if (cryptoCandidate) {
        return cryptoCandidate;
    }
    if (raw.endsWith('.US')) {
        return raw.replace(/\.US$/, '');
    }
    return raw;
}
export function detectCanonicalAssetKind(symbol) {
    const normalized = normalizeMarketSymbol(symbol);
    if (normalized.startsWith('BINANCE:') || normalized.endsWith('.CC')) {
        return 'crypto';
    }
    if (normalized.startsWith('OANDA:') || normalized.endsWith('.FOREX') || /^[A-Z]{3}\/[A-Z]{3}$/.test(normalized)) {
        return 'fx';
    }
    if (ETF_SYMBOLS.has(normalized)) {
        return 'etf';
    }
    if (INDEX_SYMBOLS.has(normalized)) {
        return 'index';
    }
    return 'stock';
}
export function normalizeCryptoPair(symbol) {
    const normalized = normalizeMarketSymbol(symbol);
    if (normalized.startsWith('BINANCE:')) {
        const pair = normalized.slice('BINANCE:'.length);
        if (pair.endsWith('USDT')) {
            return `${pair.slice(0, -4)}-USD`;
        }
        if (pair.endsWith('USD')) {
            return `${pair.slice(0, -3)}-USD`;
        }
        if (pair.endsWith('BTC')) {
            return `${pair.slice(0, -3)}-BTC`;
        }
        if (pair.endsWith('ETH')) {
            return `${pair.slice(0, -3)}-ETH`;
        }
        return pair.replace('_', '-');
    }
    if (normalized.endsWith('.CC')) {
        return normalized.replace(/\.CC$/, '').replace('_', '-');
    }
    return normalized.replace('_', '-');
}
export function resolvePolygonSymbol(symbol) {
    const normalized = normalizeMarketSymbol(symbol);
    const assetKind = detectCanonicalAssetKind(normalized);
    if ((assetKind === 'stock' || assetKind === 'etf' || assetKind === 'index') && isPlainEquityLike(normalized)) {
        return normalized;
    }
    return null;
}
export function resolveTwelveDataSymbol(symbol) {
    const normalized = normalizeMarketSymbol(symbol);
    if (normalized.startsWith('OANDA:')) {
        return normalized.replace('OANDA:', '').replace('_', '/');
    }
    if (normalized.startsWith('BINANCE:')) {
        return normalizeCryptoPair(normalized).replace('-', '/');
    }
    if (isPlainEquityLike(normalized)) {
        return normalized;
    }
    return null;
}
export function resolveTiingoSymbol(symbol) {
    const normalized = normalizeMarketSymbol(symbol);
    const assetKind = detectCanonicalAssetKind(normalized);
    if ((assetKind === 'stock' || assetKind === 'etf') && isPlainEquityLike(normalized)) {
        return normalized;
    }
    return null;
}
export function resolveEodhdSymbol(symbol) {
    const normalized = normalizeMarketSymbol(symbol);
    const assetKind = detectCanonicalAssetKind(normalized);
    if (normalized.startsWith('OANDA:')) {
        const compact = normalized.replace('OANDA:', '').replace('_', '');
        return `${compact}.FOREX`;
    }
    if (assetKind === 'crypto' && normalized.startsWith('BINANCE:')) {
        return `${normalizeCryptoPair(normalized)}.CC`;
    }
    if (assetKind === 'stock' || assetKind === 'etf' || assetKind === 'index') {
        return `${normalized}.US`;
    }
    return null;
}
export function resolveFinnhubSymbol(symbol) {
    const normalized = normalizeMarketSymbol(symbol);
    const assetKind = detectCanonicalAssetKind(normalized);
    if (assetKind === 'fx' && normalized.startsWith('OANDA:')) {
        return normalized;
    }
    if (assetKind === 'crypto' && normalized.startsWith('BINANCE:')) {
        return normalized;
    }
    return normalized;
}
export function resolveCoinGeckoId(symbol) {
    const normalized = normalizeMarketSymbol(symbol);
    return COINGECKO_ID_BY_SYMBOL[normalized] ?? COINGECKO_ID_BY_SYMBOL[normalized.replace(/^BINANCE:/, '').replace(/USDT$/, '')] ?? null;
}
