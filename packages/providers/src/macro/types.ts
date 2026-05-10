export {};
import type {
  MacroFrequency,
  MacroFreshnessState,
  MacroProviderId,
  MacroSeries,
  MacroSeriesPoint,
} from '@repo/api-contracts';

export type MacroSeriesConfig = {
  provider: MacroProviderId;
  seriesId: string;
  normalizedSeriesId: string;
  title: string;
  unit?: string;
  frequency?: MacroFrequency;
  geography?: string;
  countryCode?: string;
  sourceUrl?: string;
};

export type MacroProviderStatus = {
  provider: MacroProviderId;
  configured: boolean;
  authMode: 'none' | 'api-key';
  apiKeyRequired: boolean;
  restAvailable: boolean;
  seriesCountConfigured: number;
  lastSuccess: string | null;
  lastFailure: string | null;
  freshness: MacroFreshnessState | 'unknown';
  rateLimitState: 'ok' | 'unknown' | 'throttled';
};

export type MacroSnapshot = {
  series: MacroSeries[];
  points: MacroSeriesPoint[];
  providerStatus: MacroProviderStatus[];
  generatedAt: string;
};
