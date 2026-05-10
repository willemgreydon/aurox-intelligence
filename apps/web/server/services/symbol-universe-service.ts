const DEFAULT_STOCK_SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA', 'JPM', 'XOM', 'LLY'];
const DEFAULT_ETF_SYMBOLS = ['SPY', 'QQQ', 'VTI', 'IWM', 'GLD', 'TLT', 'XLF', 'XLK', 'XLE', 'XLV'];
const DEFAULT_CRYPTO_SYMBOLS = [
  'BINANCE:BTCUSDT',
  'BINANCE:ETHUSDT',
  'BINANCE:SOLUSDT',
  'BINANCE:XRPUSDT',
  'BINANCE:BNBUSDT',
];

export type UniverseAssetClass = 'stock' | 'etf' | 'crypto';

export type UniverseRow = {
  symbol: string;
  assetClass: UniverseAssetClass;
  sector: string | null;
  narrative: string | null;
  liquidityTier: 'high' | 'medium';
  volatilityTier: 'high' | 'medium';
  providerSymbol: string;
  displaySymbol: string;
  tradeable: boolean;
};

export function listSymbolUniverse(options: {
  assetClass?: UniverseAssetClass;
  search?: string;
  page?: number;
  pageSize?: number;
} = {}) {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, options.pageSize ?? 30));
  const search = (options.search ?? '').trim().toUpperCase();

  const rows: UniverseRow[] = [
    ...DEFAULT_STOCK_SYMBOLS.map((symbol) => ({
      symbol,
      assetClass: 'stock' as const,
      sector: null,
      narrative: 'large-cap',
      liquidityTier: 'high' as const,
      volatilityTier: 'medium' as const,
      providerSymbol: symbol,
      displaySymbol: symbol,
      tradeable: true,
    })),
    ...DEFAULT_ETF_SYMBOLS.map((symbol) => ({
      symbol,
      assetClass: 'etf' as const,
      sector: null,
      narrative: symbol.endsWith('QQQ') ? 'growth' : 'broad-market',
      liquidityTier: 'high' as const,
      volatilityTier: 'medium' as const,
      providerSymbol: symbol,
      displaySymbol: symbol,
      tradeable: true,
    })),
    ...DEFAULT_CRYPTO_SYMBOLS.slice(0, 50).map((symbol) => ({
      symbol,
      assetClass: 'crypto' as const,
      sector: null,
      narrative: 'digital-asset',
      liquidityTier: 'high' as const,
      volatilityTier: 'high' as const,
      providerSymbol: symbol.replace('BINANCE:', ''),
      displaySymbol: symbol,
      tradeable: true,
    })),
  ];

  const filtered = rows.filter((row) => {
    if (options.assetClass && row.assetClass !== options.assetClass) return false;
    if (search && !row.symbol.includes(search)) return false;
    return true;
  });

  const offset = (page - 1) * pageSize;
  return {
    page,
    pageSize,
    total: filtered.length,
    rows: filtered.slice(offset, offset + pageSize),
  };
}
