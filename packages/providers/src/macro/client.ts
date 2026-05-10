import type { MacroProviderId, MacroSeries } from '@repo/api-contracts';
import { buildUrl, HttpError } from '../shared/http-client';
import { getProviderEnv } from '../config';
import { mapEcbSdmxToSeries, mapFredResponseToSeries, mapWorldBankResponseToSeries } from './mapper';
import type { MacroProviderStatus, MacroSeriesConfig, MacroSnapshot } from './types';

type FetchLike = typeof fetch;
type CacheEntry = { expiresAt: number; snapshot: MacroSnapshot };

const inMemoryCache = new Map<string, CacheEntry>();

const WORLD_BANK_CONFIG: MacroSeriesConfig[] = [
  { provider: 'world-bank', seriesId: 'NY.GDP.MKTP.KD.ZG', normalizedSeriesId: 'gdp_growth', title: 'GDP growth (annual %)', frequency: 'annual', geography: 'US' },
  { provider: 'world-bank', seriesId: 'FP.CPI.TOTL.ZG', normalizedSeriesId: 'inflation_cpi', title: 'Inflation, consumer prices (annual %)', frequency: 'annual', geography: 'US' },
  { provider: 'world-bank', seriesId: 'SL.UEM.TOTL.ZS', normalizedSeriesId: 'unemployment_rate', title: 'Unemployment (% of labor force)', frequency: 'annual', geography: 'US' },
];
const FRED_CONFIG: MacroSeriesConfig[] = [
  { provider: 'fred', seriesId: 'FEDFUNDS', normalizedSeriesId: 'policy_rate', title: 'Effective Federal Funds Rate', frequency: 'monthly', geography: 'US' },
  { provider: 'fred', seriesId: 'DGS10', normalizedSeriesId: 'ust10y', title: '10-Year Treasury Constant Maturity', frequency: 'daily', geography: 'US' },
  { provider: 'fred', seriesId: 'DGS2', normalizedSeriesId: 'ust2y', title: '2-Year Treasury Constant Maturity', frequency: 'daily', geography: 'US' },
  { provider: 'fred', seriesId: 'UNRATE', normalizedSeriesId: 'unemployment_rate', title: 'Unemployment Rate', frequency: 'monthly', geography: 'US' },
  { provider: 'fred', seriesId: 'CPIAUCSL', normalizedSeriesId: 'cpi_index', title: 'Consumer Price Index (All Urban Consumers)', frequency: 'monthly', geography: 'US' },
  { provider: 'fred', seriesId: 'VIXCLS', normalizedSeriesId: 'vix', title: 'CBOE Volatility Index', frequency: 'daily', geography: 'US' },
  { provider: 'fred', seriesId: 'NFCI', normalizedSeriesId: 'nfci', title: 'National Financial Conditions Index', frequency: 'weekly', geography: 'US' },
  { provider: 'fred', seriesId: 'M2SL', normalizedSeriesId: 'm2sl', title: 'M2 Money Stock', frequency: 'monthly', geography: 'US' },
];
const ECB_CONFIG: MacroSeriesConfig[] = [
  { provider: 'ecb', seriesId: 'FM.B.U2.EUR.4F.KR.MRR_FR.LEV', normalizedSeriesId: 'ecb_mro_rate', title: 'ECB Main Refinancing Operations Rate', frequency: 'monthly', geography: 'EA' },
  { provider: 'ecb', seriesId: 'ICP.M.U2.N.000000.4.ANR', normalizedSeriesId: 'ea_hicp', title: 'Euro Area HICP (annual rate)', frequency: 'monthly', geography: 'EA' },
];

function byProviderStatus(base: Partial<MacroProviderStatus> & Pick<MacroProviderStatus, 'provider'>): MacroProviderStatus {
  return {
    configured: true,
    authMode: 'none',
    apiKeyRequired: false,
    restAvailable: true,
    seriesCountConfigured: 0,
    lastSuccess: null,
    lastFailure: null,
    freshness: 'unknown',
    rateLimitState: 'unknown',
    ...base,
  };
}

async function fetchWorldBankSeries(config: MacroSeriesConfig, fetchImpl: FetchLike): Promise<MacroSeries> {
  const url = buildUrl(`https://api.worldbank.org/v2/country/us/indicator/${config.seriesId}`, { format: 'json', per_page: 40 });
  const response = await fetchImpl(url, { signal: AbortSignal.timeout(8_000) });
  if (!response.ok) throw new HttpError(`Request failed for ${url}`, response.status, await response.text());
  const payload = await response.json();
  return mapWorldBankResponseToSeries(payload, { ...config, sourceUrl: url, countryCode: 'US' });
}

async function fetchFredSeries(config: MacroSeriesConfig, apiKey: string, fetchImpl: FetchLike): Promise<MacroSeries> {
  const url = buildUrl('https://api.stlouisfed.org/fred/series/observations', {
    series_id: config.seriesId,
    api_key: apiKey,
    file_type: 'json',
    sort_order: 'asc',
    limit: 60,
  });
  const response = await fetchImpl(url, { signal: AbortSignal.timeout(8_000) });
  if (!response.ok) throw new HttpError(`Request failed for ${url}`, response.status, await response.text());
  const payload = await response.json();
  return mapFredResponseToSeries(payload, { ...config, sourceUrl: url });
}

async function fetchEcbSeries(config: MacroSeriesConfig, fetchImpl: FetchLike): Promise<MacroSeries> {
  const url = `https://data-api.ecb.europa.eu/service/data/${config.seriesId}?format=jsondata`;
  const response = await fetchImpl(url, { signal: AbortSignal.timeout(8_000) });
  if (!response.ok) throw new HttpError(`Request failed for ${url}`, response.status, await response.text());
  const payload = await response.json();
  const rows = (payload as { data?: unknown[] })?.data ?? [];
  return mapEcbSdmxToSeries(rows, { ...config, sourceUrl: url });
}

export async function fetchMacroSnapshot(options?: { fetchImpl?: FetchLike; now?: number; forceRefresh?: boolean }): Promise<MacroSnapshot> {
  const env = getProviderEnv();
  const now = options?.now ?? Date.now();
  const ttlSeconds = Number(process.env.MACRO_CACHE_TTL_SECONDS ?? 21_600);
  const cacheKey = 'macro_snapshot_multi';
  const cached = inMemoryCache.get(cacheKey);
  if (!options?.forceRefresh && cached && cached.expiresAt > now) return cached.snapshot;

  const fetchImpl = options?.fetchImpl ?? fetch;
  const providersEnabled = {
    worldBank: String(process.env.ENABLE_WORLD_BANK_MACRO ?? 'true') === 'true',
    ecb: String(process.env.ENABLE_ECB_MACRO ?? 'true') === 'true',
    fred: String(process.env.ENABLE_FRED_MACRO ?? 'true') === 'true',
  };

  const providerStatus: MacroProviderStatus[] = [
    byProviderStatus({ provider: 'world-bank', seriesCountConfigured: WORLD_BANK_CONFIG.length }),
    byProviderStatus({ provider: 'ecb', seriesCountConfigured: ECB_CONFIG.length }),
    byProviderStatus({ provider: 'fred', authMode: 'api-key', apiKeyRequired: true, configured: Boolean(env.FRED_API_KEY), seriesCountConfigured: FRED_CONFIG.length }),
    byProviderStatus({ provider: 'local-cache', configured: true, restAvailable: false, seriesCountConfigured: 0 }),
  ];

  const series: MacroSeries[] = [];
  const failures = new Map<MacroProviderId, string>();
  const successes = new Set<MacroProviderId>();

  if (providersEnabled.worldBank) {
    await Promise.all(WORLD_BANK_CONFIG.map(async (config) => {
      try {
        series.push(await fetchWorldBankSeries(config, fetchImpl));
        successes.add('world-bank');
      } catch (error) {
        failures.set('world-bank', error instanceof Error ? error.message : 'world-bank request failed');
      }
    }));
  }

  if (providersEnabled.ecb) {
    await Promise.all(ECB_CONFIG.map(async (config) => {
      try {
        series.push(await fetchEcbSeries(config, fetchImpl));
        successes.add('ecb');
      } catch (error) {
        failures.set('ecb', error instanceof Error ? error.message : 'ecb request failed');
      }
    }));
  }

  if (providersEnabled.fred && env.FRED_API_KEY) {
    await Promise.all(FRED_CONFIG.map(async (config) => {
      try {
        series.push(await fetchFredSeries(config, env.FRED_API_KEY as string, fetchImpl));
        successes.add('fred');
      } catch (error) {
        failures.set('fred', error instanceof Error ? error.message : 'fred request failed');
      }
    }));
  } else if (providersEnabled.fred) {
    failures.set('fred', 'Missing FRED_API_KEY.');
  }

  const nowIso = new Date(now).toISOString();
  for (const row of providerStatus) {
    row.lastSuccess = successes.has(row.provider) ? nowIso : null;
    row.lastFailure = failures.get(row.provider) ?? null;
    row.freshness = successes.has(row.provider) ? 'partial' : 'unavailable';
    row.rateLimitState = failures.get(row.provider)?.toLowerCase().includes('429') ? 'throttled' : 'ok';
  }

  const snapshot: MacroSnapshot = {
    series,
    points: series.flatMap((item) => item.points),
    providerStatus,
    generatedAt: nowIso,
  };
  inMemoryCache.set(cacheKey, { snapshot, expiresAt: now + Math.max(ttlSeconds, 600) * 1000 });
  return snapshot;
}
