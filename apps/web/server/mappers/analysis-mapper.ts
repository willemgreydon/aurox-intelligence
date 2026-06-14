import type { Forecast, SignalSummary } from '@repo/api-contracts';
import { buildForecastFromSignal } from '@repo/forecasting';
import { deriveSignalSnapshot } from '@repo/signals';
import { formatOptionalDateTimeLabel, formatRelativeTimeLabel } from '../../lib/formatters';
import type { AnalysisReadModel } from '../queries/analysis-query';

export type SignalsPageViewModel = {
  overview: {
    title: string;
    description: string;
    summary: string;
    statusLabel: string;
    statusTone: 'success' | 'warning' | 'danger' | 'info';
    lastUpdatedLabel: string;
  };
  signals: Array<
    SignalSummary & {
      scoreLabel: string;
      latestPriceLabel: string;
      shortMovingAverageLabel: string;
      longMovingAverageLabel: string;
      momentumLabel: string;
      volatilityLabel: string;
      trendStrengthLabel: string;
      statusLabel: string;
      statusTone: 'success' | 'warning' | 'danger' | 'info';
      interpretationLabel: string;
    }
  >;
};

export type ForecastsPageViewModel = {
  overview: SignalsPageViewModel['overview'];
  forecasts: Array<
    Forecast & {
      assetName: string;
      biasLabel: string;
      biasTone: 'success' | 'warning' | 'danger' | 'info';
      confidenceLabel: string;
      producedAtLabel: string;
    }
  >;
};

function mapStatusTone(status: 'nominal' | 'attention' | 'degraded'): 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'nominal') return 'success';
  if (status === 'attention') return 'warning';
  return 'danger';
}

function mapStatusLabel(status: 'nominal' | 'attention' | 'degraded') {
  if (status === 'nominal') return 'Nominal';
  if (status === 'attention') return 'Attention';
  return 'Degraded';
}

function mapInterpretationTone(interpretation: 'bullish' | 'bearish' | 'neutral') {
  if (interpretation === 'bullish') return 'success' as const;
  if (interpretation === 'bearish') return 'danger' as const;
  return 'info' as const;
}

function mapBiasLabel(bias: Forecast['directionalBias']) {
  return `${bias.slice(0, 1).toUpperCase()}${bias.slice(1)}`;
}

function formatPrice(value: number | null) {
  return value === null ? 'Unavailable' : `$${value.toFixed(2)}`;
}

function formatSigned(value: number | null) {
  if (value === null) return 'Unavailable';
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}`;
}

function confidenceLabel(value: number) {
  return `${Math.round(value * 100)}% confidence`;
}

function latestTimestamp(readModel: AnalysisReadModel) {
  return readModel.assets
    .flatMap((asset) => [asset.observation?.timestamp ?? null, asset.history.at(-1)?.timestamp ?? null])
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null;
}

function deriveSignals(readModel: AnalysisReadModel): SignalSummary[] {
  return readModel.assets.flatMap((asset) => {
    const closes = asset.history.map((point) => point.close);

    if (closes.length < 5) {
      return [];
    }

    const signal = deriveSignalSnapshot(asset.assetId, closes);

    return [
      {
        assetId: asset.assetId,
        assetName: asset.symbol,
        assetClass: asset.assetClass,
        status: asset.history.length >= 10 ? 'nominal' : 'attention',
        interpretation: signal.interpretation,
        score: signal.compositeScoreValue,
        confidenceScore: signal.confidenceScore,
        scoreBreakdown: signal.scoreBreakdown,
        latestPrice: signal.latestPrice,
        shortMovingAverage: signal.shortMovingAverage,
        longMovingAverage: signal.longMovingAverage,
        momentumValue: signal.momentumValue,
        volatilityValue: signal.volatilityValue,
        trendStrengthValue: signal.trendStrengthValue,
        producedAt: asset.history.at(-1)?.timestamp ?? new Date().toISOString(),
        notes: [
          `Derived from ${asset.history.length} provider-backed daily bars.`,
          asset.observation ? `Latest quote is ${formatRelativeTimeLabel(asset.observation.timestamp)}.` : 'Latest quote is unavailable.',
        ],
      },
    ];
  });
}

export function mapSignalsPage(readModel: AnalysisReadModel): SignalsPageViewModel {
  const signals = deriveSignals(readModel);
  const lastUpdated = latestTimestamp(readModel);
  const status = readModel.providerError ? 'degraded' : signals.length > 0 ? 'nominal' : 'attention';

  return {
    overview: {
      title: 'Signal Workstation',
      description: 'Provider-backed technical signal surface for tracked equities, exposing trend, momentum, volatility, and composite directional state.',
      summary: readModel.providerError
        ? `Signals are partially unavailable: ${readModel.providerError}`
        : signals.length > 0
          ? `Rendering ${signals.length} live-derived signals from tracked stock histories.`
          : 'No tracked assets currently have enough history to derive signals.',
      statusLabel: mapStatusLabel(status),
      statusTone: mapStatusTone(status),
      lastUpdatedLabel: formatOptionalDateTimeLabel(lastUpdated),
    },
    signals: signals.map((signal) => ({
      ...signal,
      scoreLabel: formatSigned(signal.score),
      latestPriceLabel: formatPrice(signal.latestPrice),
      shortMovingAverageLabel: formatPrice(signal.shortMovingAverage),
      longMovingAverageLabel: formatPrice(signal.longMovingAverage),
      momentumLabel: formatSigned(signal.momentumValue),
      volatilityLabel: signal.volatilityValue.toFixed(2),
      trendStrengthLabel: signal.trendStrengthValue.toFixed(2),
      statusLabel: mapStatusLabel(signal.status),
      statusTone: mapStatusTone(signal.status),
      interpretationLabel: mapBiasLabel(signal.interpretation),
    })),
  };
}

export function mapForecastsPage(readModel: AnalysisReadModel): ForecastsPageViewModel {
  const signals = deriveSignals(readModel);
  const lastUpdated = latestTimestamp(readModel);
  const status = readModel.providerError ? 'degraded' : signals.length > 0 ? 'nominal' : 'attention';

  return {
    overview: {
      title: 'Forecast Workstation',
      description: 'Short-horizon explainable forecast surface built from live-derived signal snapshots across the tracked stock universe.',
      summary: readModel.providerError
        ? `Forecast generation is partially unavailable: ${readModel.providerError}`
        : signals.length > 0
          ? `Rendering ${signals.length} signal-driven v1 forecasts from provider-backed stock history.`
          : 'No tracked assets currently have enough history to derive forecasts.',
      statusLabel: mapStatusLabel(status),
      statusTone: mapStatusTone(status),
      lastUpdatedLabel: formatOptionalDateTimeLabel(lastUpdated),
    },
    forecasts: signals.map((signal) => {
      const forecast = buildForecastFromSignal(
        deriveSignalSnapshot(signal.assetId, readModel.assets.find((asset) => asset.assetId === signal.assetId)?.history.map((point) => point.close) ?? []),
        new Date().toISOString(),
      );

      return {
        ...forecast,
        assetName: signal.assetName,
        biasLabel: mapBiasLabel(forecast.directionalBias),
        biasTone: mapInterpretationTone(forecast.directionalBias),
        confidenceLabel: confidenceLabel(forecast.confidenceScore),
        producedAtLabel: formatOptionalDateTimeLabel(forecast.producedAt),
      };
    }),
  };
}
