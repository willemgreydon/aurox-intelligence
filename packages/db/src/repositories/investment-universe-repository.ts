import type { ActionAvailability, CanonicalAssetMetadata } from '@repo/api-contracts';

export type InvestmentUniverseAsset = {
  assetId: string;
  symbol: string;
  name: string;
  assetClass: 'stock' | 'etf' | 'crypto';
  category: string;
  geography: string | null;
  sector: string | null;
  thesis: string;
  riskSummary: string;
  actionAvailability: ActionAvailability;
  isSimulated: boolean;
  metadataTags?: string[];
  searchAliases?: string[];
  providerSymbolMap?: Record<string, string>;
  brokerIdentifierMap?: Record<string, string>;
  plannedLiveTradable?: boolean;
};

const curatedInvestmentUniverse: InvestmentUniverseAsset[] = [
  {
    assetId: 'stock-aapl',
    symbol: 'AAPL',
    name: 'Apple',
    assetClass: 'stock',
    category: 'Mega-cap growth',
    geography: 'United States',
    sector: 'Technology',
    thesis: 'Large-cap quality compounder with ecosystem durability and cash generation.',
    riskSummary: 'Consumer device cycle sensitivity and multiple compression risk.',
    actionAvailability: 'simulated',
    isSimulated: true,
  },
  {
    assetId: 'stock-msft',
    symbol: 'MSFT',
    name: 'Microsoft',
    assetClass: 'stock',
    category: 'Platform compounder',
    geography: 'United States',
    sector: 'Technology',
    thesis: 'Cloud and enterprise exposure with resilient recurring revenue.',
    riskSummary: 'AI capex expectations and regulatory scrutiny can widen valuation swings.',
    actionAvailability: 'simulated',
    isSimulated: true,
  },
  {
    assetId: 'stock-nvda',
    symbol: 'NVDA',
    name: 'NVIDIA',
    assetClass: 'stock',
    category: 'AI infrastructure',
    geography: 'United States',
    sector: 'Semiconductors',
    thesis: 'High-beta AI infrastructure exposure with strong earnings sensitivity.',
    riskSummary: 'Crowded positioning and hardware cycle volatility can drive sharp drawdowns.',
    actionAvailability: 'planned',
    isSimulated: true,
  },
  {
    assetId: 'stock-amzn',
    symbol: 'AMZN',
    name: 'Amazon',
    assetClass: 'stock',
    category: 'Platform retail and cloud',
    geography: 'United States',
    sector: 'Consumer discretionary',
    thesis: 'Scale retail logistics and cloud economics support durable free cash flow expansion.',
    riskSummary: 'Consumer slowdown and cloud margin pressure can challenge execution expectations.',
    actionAvailability: 'planned',
    isSimulated: true,
  },
  {
    assetId: 'stock-googl',
    symbol: 'GOOGL',
    name: 'Alphabet',
    assetClass: 'stock',
    category: 'Digital advertising and AI',
    geography: 'United States',
    sector: 'Communication services',
    thesis: 'Search cash generation and AI distribution advantages support resilient profitability.',
    riskSummary: 'Regulatory remedies and ad-cycle sensitivity remain the main valuation risks.',
    actionAvailability: 'planned',
    isSimulated: true,
  },
  {
    assetId: 'stock-meta',
    symbol: 'META',
    name: 'Meta Platforms',
    assetClass: 'stock',
    category: 'Consumer platform scale',
    geography: 'United States',
    sector: 'Communication services',
    thesis: 'High-margin ad monetization and platform engagement underpin earnings durability.',
    riskSummary: 'Regulation and elevated AI infrastructure spend can pressure the margin profile.',
    actionAvailability: 'planned',
    isSimulated: true,
  },
  {
    assetId: 'stock-tsla',
    symbol: 'TSLA',
    name: 'Tesla',
    assetClass: 'stock',
    category: 'Electric mobility',
    geography: 'United States',
    sector: 'Consumer discretionary',
    thesis: 'Scale manufacturing and software optionality keep the name central in growth rotation.',
    riskSummary: 'Price competition and execution volatility can produce sharp multiple compression.',
    actionAvailability: 'planned',
    isSimulated: true,
  },
  {
    assetId: 'stock-avgo',
    symbol: 'AVGO',
    name: 'Broadcom',
    assetClass: 'stock',
    category: 'Infrastructure semis',
    geography: 'United States',
    sector: 'Technology',
    thesis: 'Mission-critical semiconductor exposure and software cash generation support quality growth.',
    riskSummary: 'Integration risk and semiconductor cycle swings remain relevant downside drivers.',
    actionAvailability: 'planned',
    isSimulated: true,
  },
  {
    assetId: 'stock-amd',
    symbol: 'AMD',
    name: 'AMD',
    assetClass: 'stock',
    category: 'Compute challenger',
    geography: 'United States',
    sector: 'Technology',
    thesis: 'Data-center and client share gains provide leveraged upside to AI and compute demand.',
    riskSummary: 'Competitive pressure and product-timing execution remain key swing factors.',
    actionAvailability: 'planned',
    isSimulated: true,
  },
  {
    assetId: 'stock-jpm',
    symbol: 'JPM',
    name: 'JPMorgan Chase',
    assetClass: 'stock',
    category: 'Quality financials',
    geography: 'United States',
    sector: 'Financials',
    thesis: 'Diversified banking earnings and capital strength offer ballast across macro regimes.',
    riskSummary: 'Credit deterioration and regulatory capital changes can weigh on returns.',
    actionAvailability: 'planned',
    isSimulated: true,
  },
  {
    assetId: 'stock-lly',
    symbol: 'LLY',
    name: 'Eli Lilly',
    assetClass: 'stock',
    category: 'Healthcare growth',
    geography: 'United States',
    sector: 'Healthcare',
    thesis: 'Therapeutics leadership and pipeline depth support long-duration earnings growth.',
    riskSummary: 'Valuation stretch and competitive drug launches remain meaningful risks.',
    actionAvailability: 'planned',
    isSimulated: true,
  },
  {
    assetId: 'etf-spy',
    symbol: 'SPY',
    name: 'SPDR S&P 500 ETF',
    assetClass: 'etf',
    category: 'US broad market',
    geography: 'United States',
    sector: null,
    thesis: 'Core diversified beta for broad equity exposure and allocation planning.',
    riskSummary: 'Broad market drawdowns remain the primary risk driver.',
    actionAvailability: 'planned',
    isSimulated: true,
  },
  {
    assetId: 'etf-qqq',
    symbol: 'QQQ',
    name: 'Invesco QQQ Trust',
    assetClass: 'etf',
    category: 'Growth benchmark',
    geography: 'United States',
    sector: null,
    thesis: 'Concentrated growth and technology benchmark for tactical comparison.',
    riskSummary: 'Concentration in mega-cap tech increases factor crowding risk.',
    actionAvailability: 'planned',
    isSimulated: true,
  },
  {
    assetId: 'etf-vti',
    symbol: 'VTI',
    name: 'Vanguard Total Stock Market ETF',
    assetClass: 'etf',
    category: 'US total market',
    geography: 'United States',
    sector: null,
    thesis: 'Broad US equity allocation anchor with deep diversification across capitalization bands.',
    riskSummary: 'Macro equity drawdowns remain the primary portfolio risk.',
    actionAvailability: 'planned',
    isSimulated: true,
  },
  {
    assetId: 'etf-iwm',
    symbol: 'IWM',
    name: 'iShares Russell 2000 ETF',
    assetClass: 'etf',
    category: 'Small-cap beta',
    geography: 'United States',
    sector: null,
    thesis: 'Cyclical domestic exposure offers sensitivity to easing financial conditions and growth rotation.',
    riskSummary: 'Balance-sheet quality and financing stress can drive relative underperformance.',
    actionAvailability: 'planned',
    isSimulated: true,
  },
  {
    assetId: 'etf-xlk',
    symbol: 'XLK',
    name: 'Technology Select Sector SPDR Fund',
    assetClass: 'etf',
    category: 'Sector leadership',
    geography: 'United States',
    sector: null,
    thesis: 'Concentrated technology leadership vehicle for tactical sector expression.',
    riskSummary: 'Sector crowding amplifies drawdowns when leadership reverses.',
    actionAvailability: 'planned',
    isSimulated: true,
  },
  {
    assetId: 'etf-gld',
    symbol: 'GLD',
    name: 'SPDR Gold Shares',
    assetClass: 'etf',
    category: 'Defensive real asset',
    geography: 'Global',
    sector: null,
    thesis: 'Liquid precious-metals exposure for inflation and geopolitical hedge positioning.',
    riskSummary: 'Real-rate repricing can weaken defensive demand for bullion.',
    actionAvailability: 'planned',
    isSimulated: true,
  },
  {
    assetId: 'etf-tlt',
    symbol: 'TLT',
    name: 'iShares 20+ Year Treasury Bond ETF',
    assetClass: 'etf',
    category: 'Duration hedge',
    geography: 'United States',
    sector: null,
    thesis: 'Long-duration Treasury exposure provides macro hedging and rate-sensitivity expression.',
    riskSummary: 'Inflation persistence and supply pressure can challenge duration recovery.',
    actionAvailability: 'planned',
    isSimulated: true,
  },
  // Additional stocks
  {
    assetId: 'stock-v',
    symbol: 'V',
    name: 'Visa',
    assetClass: 'stock',
    category: 'Payments network',
    geography: 'United States',
    sector: 'Financials',
    thesis: 'Asset-light global payments network with durable transaction volume and pricing power.',
    riskSummary: 'Regulatory pressure on interchange fees and disintermediation risk from crypto rails.',
    actionAvailability: 'planned',
    isSimulated: true,
  },
  {
    assetId: 'stock-ma',
    symbol: 'MA',
    name: 'Mastercard',
    assetClass: 'stock',
    category: 'Payments network',
    geography: 'United States',
    sector: 'Financials',
    thesis: 'Global payments scale and cross-border exposure underpin durable earnings compounding.',
    riskSummary: 'Regulatory and competitive headwinds in payment rails and fee structures.',
    actionAvailability: 'planned',
    isSimulated: true,
  },
  {
    assetId: 'stock-cost',
    symbol: 'COST',
    name: 'Costco',
    assetClass: 'stock',
    category: 'Consumer staples compounder',
    geography: 'United States',
    sector: 'Consumer staples',
    thesis: 'Membership model and logistics scale produce resilient same-store traffic across macro cycles.',
    riskSummary: 'Margin pressure and international execution remain key monitoring variables.',
    actionAvailability: 'planned',
    isSimulated: true,
  },
  {
    assetId: 'stock-wmt',
    symbol: 'WMT',
    name: 'Walmart',
    assetClass: 'stock',
    category: 'Defensive retail',
    geography: 'United States',
    sector: 'Consumer staples',
    thesis: 'Scale retail and advertising revenues provide defensive positioning in consumer slowdowns.',
    riskSummary: 'Thin margin profile limits upside leverage; supply-chain execution remains critical.',
    actionAvailability: 'planned',
    isSimulated: true,
  },
  {
    assetId: 'stock-nflx',
    symbol: 'NFLX',
    name: 'Netflix',
    assetClass: 'stock',
    category: 'Streaming platform',
    geography: 'United States',
    sector: 'Communication services',
    thesis: 'Global streaming leadership and ad-supported tier expansion support durable subscriber growth.',
    riskSummary: 'Content cost inflation and password-sharing normalisation can pressure margin expansion.',
    actionAvailability: 'planned',
    isSimulated: true,
  },
  {
    assetId: 'stock-orcl',
    symbol: 'ORCL',
    name: 'Oracle',
    assetClass: 'stock',
    category: 'Enterprise cloud',
    geography: 'United States',
    sector: 'Technology',
    thesis: 'Database lock-in and AI cloud infrastructure wins offer durable enterprise revenue compounding.',
    riskSummary: 'Competitive cloud intensity and legacy migration timelines remain execution risks.',
    actionAvailability: 'planned',
    isSimulated: true,
  },
  {
    assetId: 'stock-crm',
    symbol: 'CRM',
    name: 'Salesforce',
    assetClass: 'stock',
    category: 'Enterprise SaaS',
    geography: 'United States',
    sector: 'Technology',
    thesis: 'CRM platform dominance and AI feature integration support durable subscription revenue.',
    riskSummary: 'Elevated competition from Microsoft and slowing enterprise software spend are key risks.',
    actionAvailability: 'planned',
    isSimulated: true,
  },
  {
    assetId: 'stock-unh',
    symbol: 'UNH',
    name: 'UnitedHealth Group',
    assetClass: 'stock',
    category: 'Healthcare services',
    geography: 'United States',
    sector: 'Healthcare',
    thesis: 'Integrated managed care and analytics businesses produce durable earnings through healthcare cycles.',
    riskSummary: 'Regulatory scrutiny on claims practices and medical cost inflation are primary risks.',
    actionAvailability: 'planned',
    isSimulated: true,
  },
  {
    assetId: 'stock-xom',
    symbol: 'XOM',
    name: 'ExxonMobil',
    assetClass: 'stock',
    category: 'Integrated energy',
    geography: 'United States',
    sector: 'Energy',
    thesis: 'Scale integrated energy production with capital discipline offers income and macro hedge exposure.',
    riskSummary: 'Commodity price sensitivity and energy transition headwinds create structural uncertainty.',
    actionAvailability: 'planned',
    isSimulated: true,
  },
  // Additional ETFs
  {
    assetId: 'etf-voo',
    symbol: 'VOO',
    name: 'Vanguard S&P 500 ETF',
    assetClass: 'etf',
    category: 'US large-cap core',
    geography: 'United States',
    sector: null,
    thesis: 'Low-cost core S&P 500 exposure for broad US equity allocation.',
    riskSummary: 'Broad market drawdowns and large-cap concentration remain primary risks.',
    actionAvailability: 'planned',
    isSimulated: true,
  },
  {
    assetId: 'etf-xlf',
    symbol: 'XLF',
    name: 'Financial Select Sector SPDR Fund',
    assetClass: 'etf',
    category: 'Sector rotation — financials',
    geography: 'United States',
    sector: null,
    thesis: 'Tactical sector vehicle for rate-sensitive and credit-cycle financial exposure.',
    riskSummary: 'Credit deterioration and rate reversals can sharply impair the sector.',
    actionAvailability: 'planned',
    isSimulated: true,
  },
  {
    assetId: 'etf-schd',
    symbol: 'SCHD',
    name: 'Schwab US Dividend Equity ETF',
    assetClass: 'etf',
    category: 'Dividend income',
    geography: 'United States',
    sector: null,
    thesis: 'Quality dividend screen provides defensive income with capital preservation characteristics.',
    riskSummary: 'Yield compression and dividend cuts in stress environments reduce income stability.',
    actionAvailability: 'planned',
    isSimulated: true,
  },
  {
    assetId: 'etf-bnd',
    symbol: 'BND',
    name: 'Vanguard Total Bond Market ETF',
    assetClass: 'etf',
    category: 'Broad fixed income',
    geography: 'United States',
    sector: null,
    thesis: 'Diversified investment-grade bond exposure for portfolio duration management.',
    riskSummary: 'Rising rate environments produce mark-to-market losses on the underlying portfolio.',
    actionAvailability: 'planned',
    isSimulated: true,
  },
  {
    assetId: 'etf-xle',
    symbol: 'XLE',
    name: 'Energy Select Sector SPDR Fund',
    assetClass: 'etf',
    category: 'Sector rotation — energy',
    geography: 'United States',
    sector: null,
    thesis: 'Commodity-sensitive sector exposure for tactical oil and energy positioning.',
    riskSummary: 'Commodity price volatility and energy transition dynamics introduce structural uncertainty.',
    actionAvailability: 'planned',
    isSimulated: true,
  },
  // Crypto
  {
    assetId: 'crypto-btcusd',
    symbol: 'BINANCE:BTCUSDT',
    name: 'Bitcoin',
    assetClass: 'crypto',
    category: 'Digital reserve asset',
    geography: null,
    sector: null,
    thesis: 'High-liquidity crypto benchmark for macro-sensitive digital asset exposure.',
    riskSummary: 'Volatility, policy headlines, and weekend liquidity shifts remain material.',
    actionAvailability: 'planned',
    isSimulated: true,
  },
  {
    assetId: 'crypto-ethusd',
    symbol: 'BINANCE:ETHUSDT',
    name: 'Ethereum',
    assetClass: 'crypto',
    category: 'Smart contract platform',
    geography: null,
    sector: null,
    thesis: 'Programmable blockchain exposure with ecosystem and staking participation.',
    riskSummary: 'Execution roadmap risk and correlation to broader crypto beta remain elevated.',
    actionAvailability: 'planned',
    isSimulated: true,
  },
  {
    assetId: 'crypto-solusd',
    symbol: 'BINANCE:SOLUSDT',
    name: 'Solana',
    assetClass: 'crypto',
    category: 'High-beta smart contract platform',
    geography: null,
    sector: null,
    thesis: 'High-throughput ecosystem activity offers leveraged participation in crypto risk appetite.',
    riskSummary: 'Protocol instability, sentiment swings, and liquidity shocks remain elevated.',
    actionAvailability: 'planned',
    isSimulated: true,
  },
  {
    assetId: 'crypto-xrpusd',
    symbol: 'BINANCE:XRPUSDT',
    name: 'XRP',
    assetClass: 'crypto',
    category: 'Cross-border payments crypto',
    geography: null,
    sector: null,
    thesis: 'Institutional cross-border payment rail with legal clarity tailwinds and high-liquidity positioning.',
    riskSummary: 'Regulatory outcomes and centralisation concerns weigh on long-term thesis durability.',
    actionAvailability: 'planned',
    isSimulated: true,
  },
  {
    assetId: 'crypto-bnbusd',
    symbol: 'BINANCE:BNBUSDT',
    name: 'BNB',
    assetClass: 'crypto',
    category: 'Exchange ecosystem token',
    geography: null,
    sector: null,
    thesis: 'Exchange utility and BNB Chain ecosystem activity drive structural demand.',
    riskSummary: 'Exchange concentration risk and regulatory scrutiny on Binance represent key risks.',
    actionAvailability: 'planned',
    isSimulated: true,
  },
  {
    assetId: 'crypto-adausd',
    symbol: 'BINANCE:ADAUSDT',
    name: 'Cardano',
    assetClass: 'crypto',
    category: 'Proof-of-stake blockchain',
    geography: null,
    sector: null,
    thesis: 'Academic-approach smart contract platform with developing ecosystem and staking participation.',
    riskSummary: 'Execution pace and ecosystem adoption against competing chains remain the primary risks.',
    actionAvailability: 'planned',
    isSimulated: true,
  },
  {
    assetId: 'crypto-avaxusd',
    symbol: 'BINANCE:AVAXUSDT',
    name: 'Avalanche',
    assetClass: 'crypto',
    category: 'High-speed L1 blockchain',
    geography: null,
    sector: null,
    thesis: 'Subnet architecture and DeFi ecosystem offer institutional-grade smart contract exposure.',
    riskSummary: 'High beta to broader crypto cycles amplifies drawdown risk relative to large-caps.',
    actionAvailability: 'planned',
    isSimulated: true,
  },
];

const EXPANDED_STOCK_SYMBOLS = [
  'AAPL','MSFT','NVDA','AMZN','GOOGL','META','TSLA','AVGO','AMD','NFLX','ORCL','CRM','ADBE','INTC','QCOM','ARM','PLTR','SNOW','SHOP','UBER',
  'ABNB','COIN','HOOD','SOFI','JPM','BAC','GS','MS','V','MA','PYPL','AXP','WMT','COST','PG','KO','PEP','MCD','NKE','SBUX',
  'XOM','CVX','SLB','COP','LLY','JNJ','MRK','PFE','UNH','ABBV','CAT','GE','BA','RTX','DE','DIS','SONY','TM','SAP','ASML',
  'AMAT','LRCX','KLAC','MU','TXN','ADI','PANW','CRWD','ZS','NET','DDOG','MDB','NOW','TEAM','INTU','ANET','WDAY','SQ','RBLX','TTD',
  'MELI','SE','BABA','PDD','JD','TCEHY','NIO','RIVN','LCID','F','GM','RACE','MBLY','STLA','VZ','T','TMUS','CMCSA','CHTR','ATVI',
  'EA','U','ROKU','SPOT','LYFT','DASH','CVNA','BKNG','EXPE','MAR','HLT','DAL','UAL','AAL','LUV','CSCO','IBM','HPQ','DELL','HPE',
  'CSX','UNP','NSC','FDX','UPS','ETN','HON','MMM','PH','ITW','EMR','LMT','NOC','GD','HII','C','SCHW','BLK','BX','KKR',
  'CME','ICE','CB','AIG','PGR','TRV','ALL','BK','USB','PNC','TFC','WFC','COF','DFS','MSCI','SPGI','MCO','ADP','PAYX','FIS',
  'GPN','FI','TTWO','AMGN','GILD','BIIB','REGN','VRTX','ISRG','SYK','BSX','MDT','ABT','DHR','TMO','BMY','ZTS','CVS','CI','HUM',
  'LOW','HD','TGT','KR','DG','DLTR','KHC','CL','KMB','MDLZ','GIS','CPB','HSY','MNST','KDP','PM','MO','EL','UL','RIO',
  'BHP','FCX','NEM','GOLD','NUE','STLD','X','MP','LULU','ETSY','PINS','SNAP','PTON','DOCU','ZM','OKTA','TWLO','SMCI','ENPH','SEDG',
  'FSLR','NEE','DUK','SO','AEP','XEL','EIX','EXC','SRE','PCG',
] as const;

const EXPANDED_ETF_SYMBOLS = [
  'SPY','VOO','IVV','VTI','QQQ','VUG','SCHD','DIA','IWM','XLK','XLF','XLE','XLV','XLY','XLI','XLP','XLC','XLU','XLB','XLRE',
  'SMH','ARKK','SOXX','GLD','SLV','IAU','TLT','IEF','SHY','BND','AGG','LQD','HYG','VNQ','VEA','VWO','EEM','SCHG','SPLG','VYM',
  'VO','VB','IJH','IJR','SCHB','ITOT','SCHF','VXUS','BIL','SGOV','TIP','SCHP','MBB','BNDX','EMB','MINT','USFR','TFLO','RSP','SPYG',
  'SPYD','SPDW','SPAB','VT','ACWI','URTH','QQQM','IVW','IWF','IWD','IWN','IWO','IWB','IWR','IWP','IWS','MTUM','QUAL','USMV','VLUE',
] as const;

function makeFallbackAsset(
  symbol: string,
  assetClass: 'stock' | 'etf',
): InvestmentUniverseAsset {
  return {
    assetId: `${assetClass}-${symbol.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    symbol,
    name: symbol,
    assetClass,
    category: assetClass === 'stock' ? 'Expanded stock universe' : 'Expanded ETF universe',
    geography: 'United States',
    sector: assetClass === 'stock' ? 'Diversified' : null,
    thesis:
      assetClass === 'stock'
        ? 'Additional high-coverage equity symbol for broader live monitoring and scanning.'
        : 'Additional benchmark/product symbol for broader live ETF monitoring and scanning.',
    riskSummary:
      assetClass === 'stock'
        ? 'Expanded-coverage symbol; evaluate liquidity, volatility, and current catalyst risk.'
        : 'Expanded-coverage ETF; evaluate concentration, factor, and macro sensitivity.',
    actionAvailability: 'planned',
    isSimulated: true,
    metadataTags: ['expanded-universe'],
    searchAliases: [symbol],
    providerSymbolMap: {},
    brokerIdentifierMap: {},
    plannedLiveTradable: false,
  };
}

function buildDefaultMetadataTags(asset: InvestmentUniverseAsset): string[] {
  const tags = new Set<string>([asset.assetClass, 'universe']);

  if (asset.assetClass === 'crypto') {
    tags.add('high-volatility');
  }

  if (asset.assetClass === 'etf') {
    tags.add('basket-product');
  }

  if (asset.sector) {
    tags.add(asset.sector.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
  }

  if (asset.category) {
    tags.add(asset.category.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
  }

  return [...tags];
}

function buildDefaultProviderSymbolMap(asset: InvestmentUniverseAsset): Record<string, string> {
  if (asset.assetClass === 'crypto') {
    return {
      binance: asset.symbol,
      coingecko: asset.symbol,
      twelveData: asset.symbol,
    };
  }

  return {
    polygon: asset.symbol,
    tiingo: asset.symbol,
    twelveData: asset.symbol,
  };
}

function buildDefaultBrokerIdentifierMap(asset: InvestmentUniverseAsset): Record<string, string> {
  if (asset.assetClass === 'crypto') {
    const compact = asset.symbol.replace(/^BINANCE:/, '');
    return {
      binance: compact,
      coinbase: compact.endsWith('USDT') ? `${compact.slice(0, -4)}-USD` : compact,
    };
  }

  return {
    paper: asset.symbol,
  };
}

function normalizeInvestmentAsset(asset: InvestmentUniverseAsset): InvestmentUniverseAsset {
  return {
    ...asset,
    metadataTags: asset.metadataTags ?? buildDefaultMetadataTags(asset),
    searchAliases: asset.searchAliases ?? [asset.symbol, asset.name, asset.category, asset.sector ?? ''].filter(Boolean),
    providerSymbolMap: asset.providerSymbolMap ?? buildDefaultProviderSymbolMap(asset),
    brokerIdentifierMap: asset.brokerIdentifierMap ?? buildDefaultBrokerIdentifierMap(asset),
    plannedLiveTradable: asset.plannedLiveTradable ?? false,
  };
}

function mergeExpandedUniverse(base: InvestmentUniverseAsset[]) {
  const bySymbol = new Map(base.map((asset) => [asset.symbol, asset]));

  for (const symbol of EXPANDED_STOCK_SYMBOLS) {
    if (!bySymbol.has(symbol)) {
      bySymbol.set(symbol, makeFallbackAsset(symbol, 'stock'));
    }
  }

  for (const symbol of EXPANDED_ETF_SYMBOLS) {
    if (!bySymbol.has(symbol)) {
      bySymbol.set(symbol, makeFallbackAsset(symbol, 'etf'));
    }
  }

  return [...bySymbol.values()];
}

export const investmentUniverse: InvestmentUniverseAsset[] = mergeExpandedUniverse(curatedInvestmentUniverse).map(normalizeInvestmentAsset);

export function toCanonicalAssetMetadata(asset: InvestmentUniverseAsset): CanonicalAssetMetadata {
  return {
    id: asset.assetId,
    symbol: asset.symbol,
    displaySymbol: asset.symbol.replace(/^BINANCE:/, ''),
    name: asset.name,
    assetClass: asset.assetClass,
    tags: asset.metadataTags ?? [],
    searchAliases: asset.searchAliases ?? [],
    tradability: {
      simulation: asset.isSimulated && asset.actionAvailability !== 'unavailable',
      plannedLive: asset.plannedLiveTradable ?? false,
    },
    providerSymbolMap: asset.providerSymbolMap ?? {},
    brokerIdentifierMap: asset.brokerIdentifierMap ?? {},
  };
}

export function getCanonicalInvestmentMetadataMap(): Map<string, CanonicalAssetMetadata> {
  return new Map(investmentUniverse.map((asset) => [asset.symbol, toCanonicalAssetMetadata(asset)]));
}

export function searchInvestmentUniverse(
  query: string,
  options?: { assetClass?: InvestmentUniverseAsset['assetClass'] },
): InvestmentUniverseAsset[] {
  const needle = query.trim().toLowerCase();
  const source = options?.assetClass
    ? investmentUniverse.filter((asset) => asset.assetClass === options.assetClass)
    : investmentUniverse;

  if (!needle) {
    return source;
  }

  return source.filter((asset) => {
    const aliases = asset.searchAliases ?? [];
    return (
      asset.symbol.toLowerCase().includes(needle) ||
      asset.name.toLowerCase().includes(needle) ||
      asset.category.toLowerCase().includes(needle) ||
      (asset.sector ?? '').toLowerCase().includes(needle) ||
      aliases.some((alias) => alias.toLowerCase().includes(needle))
    );
  });
}

export async function getInvestmentUniverse(): Promise<InvestmentUniverseAsset[]> {
  return investmentUniverse;
}
